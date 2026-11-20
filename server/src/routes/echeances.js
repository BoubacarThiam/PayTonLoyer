import { Router } from 'express';
import { prisma } from '../prisma.js';
import { ROLES, STATUTS_ECHEANCE, STATUTS_PAIEMENT } from '../constantes.js';
import { ErreurApi, nonTrouve } from '../middlewares/erreurs.js';
import { exigerAuth, exigerRole } from '../middlewares/auth.js';
import { valider } from '../middlewares/valider.js';
import * as s from '../validators/schemas.js';
import { avecStatutReel } from '../services/echeances.js';
import { enregistrerPaiementManuel } from '../services/paiements.js';
import { relancerParSms } from '../services/sms.js';
import { debutJourUTC } from '../utils/dates.js';
import { lienRappelWhatsapp } from '../utils/format.js';
import { paiementPublic } from '../utils/serialiser.js';

const router = Router();
router.use(exigerAuth, exigerRole(ROLES.PROPRIETAIRE));

const inclusions = {
  bail: {
    select: {
      logement: { select: { id: true, nom: true, adresse: true } },
      locataire: { select: { id: true, nom: true, telephone: true } },
    },
  },
  quittance: { select: { id: true, numero: true } },
  paiements: { where: { statut: STATUTS_PAIEMENT.REUSSI }, take: 1 },
};

function serialiser(echeance, proprietaire) {
  const { paiements, ...reste } = echeance;
  const avecStatut = avecStatutReel(reste);
  return {
    ...avecStatut,
    paiement: paiementPublic(paiements?.[0]),
    lienWhatsapp:
      avecStatut.statutReel === STATUTS_ECHEANCE.EN_RETARD
        ? lienRappelWhatsapp({ locataire: reste.bail.locataire, logement: reste.bail.logement, echeance: reste, proprietaire })
        : null,
  };
}

router.get('/', valider({ query: s.filtreEcheances }), async (req, res) => {
  const { periode, statut, locataireId, logementId } = req.valide.query;
  const aujourdhui = debutJourUTC();

  const filtresStatut = {
    PAYEE: { statut: STATUTS_ECHEANCE.PAYEE },
    IMPAYE: { statut: STATUTS_ECHEANCE.EN_ATTENTE },
    EN_RETARD: { statut: STATUTS_ECHEANCE.EN_ATTENTE, dateEcheance: { lt: aujourdhui } },
    EN_ATTENTE: { statut: STATUTS_ECHEANCE.EN_ATTENTE, dateEcheance: { gte: aujourdhui } },
  };

  const echeances = await prisma.echeance.findMany({
    where: {
      bail: {
        logement: { proprietaireId: req.user.id, ...(logementId ? { id: logementId } : {}) },
        ...(locataireId ? { locataireId } : {}),
      },
      statut: { not: STATUTS_ECHEANCE.ANNULEE },
      ...(periode ? { periode } : {}),
      ...(statut ? filtresStatut[statut] : {}),
    },
    include: inclusions,
    orderBy: [{ dateEcheance: 'asc' }],
    take: 500,
  });
  res.json({ echeances: echeances.map((e) => serialiser(e, req.user)) });
});

router.post('/:id/paiement-manuel', valider({ params: s.paramsId, body: s.paiementManuel }), async (req, res) => {
  const echeance = await prisma.echeance.findFirst({
    where: { id: req.valide.params.id, bail: { logement: { proprietaireId: req.user.id } } },
  });
  if (!echeance) throw nonTrouve('Échéance introuvable.');

  const { date } = req.valide.body;
  if (date > new Date()) throw new ErreurApi(400, 'La date du paiement ne peut pas être dans le futur.', 'VALIDATION');

  await enregistrerPaiementManuel(echeance, req.valide.body);

  const miseAJour = await prisma.echeance.findUnique({ where: { id: echeance.id }, include: inclusions });
  res.status(201).json({ echeance: serialiser(miseAJour, req.user) });
});

router.post('/:id/rappel-sms', valider({ params: s.paramsId }), async (req, res) => {
  await relancerParSms(req.valide.params.id, req.user);
  res.status(201).json({ ok: true, message: 'SMS de rappel envoyé.' });
});

export default router;
