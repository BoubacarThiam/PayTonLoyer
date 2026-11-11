import { Router } from 'express';
import { prisma } from '../prisma.js';
import { LIBELLES_METHODE, ROLES, STATUTS_PAIEMENT } from '../constantes.js';
import { nonTrouve } from '../middlewares/erreurs.js';
import { exigerAuth, exigerRole } from '../middlewares/auth.js';
import { valider } from '../middlewares/valider.js';
import * as s from '../validators/schemas.js';
import { actualiserPaiement, initierPaiementEnLigne, traiterWebhook } from '../services/paiements.js';
import { genererQuittanceSansEchec } from '../services/quittances.js';
import { fournisseurActif, fournisseurExiste } from '../../payments/index.js';
import { ErreurFournisseur, SignatureInvalide } from '../../payments/erreurs.js';
import { paiementPublic } from '../utils/serialiser.js';

const router = Router();

// Public : l'authenticité est contrôlée par le fournisseur appelé.
router.post('/webhook/:fournisseur', async (req, res) => {
  if (!fournisseurExiste(req.params.fournisseur)) return res.status(404).json({ message: 'Fournisseur inconnu.' });
  try {
    const resultat = await traiterWebhook(req.params.fournisseur, req);
    return res.json({ ok: true, ...resultat });
  } catch (erreur) {
    if (erreur instanceof SignatureInvalide) return res.status(401).json({ message: 'Signature invalide.' });
    // Code 503 : le fournisseur renverra la notification plus tard.
    if (erreur instanceof ErreurFournisseur) return res.status(503).json({ message: 'Vérification indisponible.' });
    throw erreur;
  }
});

const locataire = [exigerAuth, exigerRole(ROLES.LOCATAIRE)];

router.get('/methodes', locataire, (req, res) => {
  res.json({ methodes: fournisseurActif().methodes.map((code) => ({ code, libelle: LIBELLES_METHODE[code] })) });
});

router.post('/initier', locataire, valider({ body: s.initierPaiement }), async (req, res) => {
  const echeance = await prisma.echeance.findFirst({
    where: { id: req.valide.body.echeanceId, bail: { locataireId: req.user.id } },
  });
  if (!echeance) throw nonTrouve('Échéance introuvable.');

  const paiement = await initierPaiementEnLigne({ echeance, methode: req.valide.body.methode, locataire: req.user });
  res.status(201).json({ reference: paiement.reference, urlPaiement: paiement.urlPaiement });
});

async function trouverPaiement(reference, locataireId) {
  const paiement = await prisma.paiement.findFirst({
    where: { reference, echeance: { bail: { locataireId } } },
  });
  if (!paiement) throw nonTrouve('Paiement introuvable.');
  return paiement;
}

async function reponseStatut(res, paiementId) {
  let paiement = await prisma.paiement.findUnique({
    where: { id: paiementId },
    include: { echeance: { include: { quittance: true } } },
  });
  // Rattrape une quittance dont la génération aurait échoué.
  if (paiement.statut === STATUTS_PAIEMENT.REUSSI && !paiement.echeance.quittance) {
    await genererQuittanceSansEchec(paiement.echeanceId);
    paiement = await prisma.paiement.findUnique({
      where: { id: paiementId },
      include: { echeance: { include: { quittance: true } } },
    });
  }
  const { echeance } = paiement;
  res.json({
    paiement: paiementPublic(paiement),
    echeance: { id: echeance.id, periode: echeance.periode, statut: echeance.statut },
    quittance: echeance.quittance && { id: echeance.quittance.id, numero: echeance.quittance.numero },
  });
}

router.get('/:reference', locataire, valider({ params: s.paramsReference }), async (req, res) => {
  const paiement = await trouverPaiement(req.valide.params.reference, req.user.id);
  await actualiserPaiement(paiement);
  await reponseStatut(res, paiement.id);
});

router.post('/:reference/annuler', locataire, valider({ params: s.paramsReference }), async (req, res) => {
  const paiement = await trouverPaiement(req.valide.params.reference, req.user.id);
  // On vérifie d'abord : le locataire a pu payer puis revenir par le bouton d'annulation.
  const actualise = await actualiserPaiement(paiement);
  if (actualise.statut === STATUTS_PAIEMENT.INITIE) {
    await prisma.paiement.update({ where: { id: paiement.id }, data: { statut: STATUTS_PAIEMENT.ANNULE, cleEnCours: null } });
  }
  await reponseStatut(res, paiement.id);
});

export default router;
