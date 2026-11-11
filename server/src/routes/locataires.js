import crypto from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../prisma.js';
import { ROLES, STATUTS_ECHEANCE, STATUTS_LOGEMENT, STATUTS_PAIEMENT } from '../constantes.js';
import { ErreurApi, nonTrouve } from '../middlewares/erreurs.js';
import { exigerAuth, exigerRole } from '../middlewares/auth.js';
import { valider } from '../middlewares/valider.js';
import * as s from '../validators/schemas.js';
import { avecStatutReel, genererEcheancesBail } from '../services/echeances.js';
import { dateEcheancePour, periodeDe } from '../utils/dates.js';
import { paiementPublic } from '../utils/serialiser.js';

const router = Router();
router.use(exigerAuth, exigerRole(ROLES.PROPRIETAIRE));

const genererCode = () => String(crypto.randomInt(100000, 1000000));

const champsLocataire = { id: true, nom: true, telephone: true, doitChangerMotDePasse: true, createdAt: true };
const inclureBaux = {
  orderBy: { createdAt: 'desc' },
  include: { logement: { select: { id: true, nom: true, adresse: true } } },
};

async function trouverLocataire(id, proprietaireId) {
  const locataire = await prisma.user.findFirst({
    where: { id, proprietaireId, role: ROLES.LOCATAIRE },
    select: { ...champsLocataire, baux: inclureBaux },
  });
  if (!locataire) throw nonTrouve('Locataire introuvable.');
  return locataire;
}

async function verifierLogementDisponible(logementId, proprietaireId) {
  const logement = await prisma.logement.findFirst({
    where: { id: logementId, proprietaireId },
    include: { baux: { where: { actif: true }, select: { id: true } } },
  });
  if (!logement) throw nonTrouve('Logement introuvable.');
  if (logement.baux.length > 0) throw new ErreurApi(409, 'Ce logement a déjà un locataire.', 'LOGEMENT_OCCUPE');
  return logement;
}

function resume(locataire) {
  const { baux, ...reste } = locataire;
  return { ...reste, bailActif: baux.find((b) => b.actif) ?? null };
}

router.get('/', async (req, res) => {
  const locataires = await prisma.user.findMany({
    where: { proprietaireId: req.user.id, role: ROLES.LOCATAIRE },
    select: { ...champsLocataire, baux: inclureBaux },
    orderBy: { nom: 'asc' },
  });

  const ids = locataires.map((l) => l.id);
  const impayees = await prisma.echeance.findMany({
    where: { statut: STATUTS_ECHEANCE.EN_ATTENTE, bail: { locataireId: { in: ids } } },
    select: { statut: true, dateEcheance: true, montant: true, bail: { select: { locataireId: true } } },
  });
  const retards = new Map();
  for (const e of impayees) {
    if (avecStatutReel(e).statutReel !== STATUTS_ECHEANCE.EN_RETARD) continue;
    const cumul = retards.get(e.bail.locataireId) || { nombre: 0, montant: 0 };
    retards.set(e.bail.locataireId, { nombre: cumul.nombre + 1, montant: cumul.montant + e.montant });
  }

  res.json({
    locataires: locataires.map((l) => ({ ...resume(l), retards: retards.get(l.id) || { nombre: 0, montant: 0 } })),
  });
});

router.post('/', valider({ body: s.nouveauLocataire }), async (req, res) => {
  const { nom, telephone, logementId, dateEntree, jourEcheance } = req.valide.body;
  const logement = await verifierLogementDisponible(logementId, req.user.id);

  if (await prisma.user.findUnique({ where: { telephone } })) {
    throw new ErreurApi(409, 'Un compte existe déjà avec ce numéro de téléphone.', 'COMPTE_EXISTANT');
  }

  const code = genererCode();
  const motDePasseHash = await bcrypt.hash(code, 10);
  const { locataire, bail } = await prisma.$transaction(async (tx) => {
    const creeLocataire = await tx.user.create({
      data: { role: ROLES.LOCATAIRE, nom, telephone, motDePasseHash, doitChangerMotDePasse: true, proprietaireId: req.user.id },
    });
    const creeBail = await tx.bail.create({
      data: { logementId, locataireId: creeLocataire.id, dateEntree, jourEcheance, loyerMensuel: logement.loyerMensuel },
    });
    await tx.logement.update({ where: { id: logementId }, data: { statut: STATUTS_LOGEMENT.OCCUPE } });
    return { locataire: creeLocataire, bail: creeBail };
  });
  await genererEcheancesBail(bail);

  // Le code n'est renvoyé qu'ici : seul son hash est conservé.
  res.status(201).json({ locataire: resume(await trouverLocataire(locataire.id, req.user.id)), codeProvisoire: code });
});

router.get('/:id', valider({ params: s.paramsId }), async (req, res) => {
  const locataire = await trouverLocataire(req.valide.params.id, req.user.id);
  const echeances = await prisma.echeance.findMany({
    where: { bail: { locataireId: locataire.id }, statut: { not: STATUTS_ECHEANCE.ANNULEE } },
    orderBy: { periode: 'desc' },
    include: {
      quittance: { select: { id: true, numero: true } },
      paiements: { where: { statut: STATUTS_PAIEMENT.REUSSI }, take: 1 },
      bail: { select: { logement: { select: { nom: true } } } },
    },
  });
  res.json({
    locataire: resume(locataire),
    baux: locataire.baux,
    echeances: echeances.map(({ paiements, ...e }) => ({ ...avecStatutReel(e), paiement: paiementPublic(paiements[0]) })),
  });
});

router.put('/:id', valider({ params: s.paramsId, body: s.modifLocataire }), async (req, res) => {
  const { nom, telephone, jourEcheance } = req.valide.body;
  const actuel = await trouverLocataire(req.valide.params.id, req.user.id);

  if (telephone !== actuel.telephone && (await prisma.user.findUnique({ where: { telephone } }))) {
    throw new ErreurApi(409, 'Un compte existe déjà avec ce numéro de téléphone.', 'COMPTE_EXISTANT');
  }

  const bailActif = actuel.baux.find((b) => b.actif);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: actuel.id }, data: { nom, telephone } });
    if (bailActif && jourEcheance && jourEcheance !== bailActif.jourEcheance) {
      await tx.bail.update({ where: { id: bailActif.id }, data: { jourEcheance } });
      // Le nouveau jour ne s'applique qu'aux mois à venir.
      const futures = await tx.echeance.findMany({
        where: { bailId: bailActif.id, statut: STATUTS_ECHEANCE.EN_ATTENTE, periode: { gt: periodeDe() } },
      });
      for (const e of futures) {
        await tx.echeance.update({ where: { id: e.id }, data: { dateEcheance: dateEcheancePour(e.periode, jourEcheance) } });
      }
    }
  });
  res.json({ locataire: resume(await trouverLocataire(actuel.id, req.user.id)) });
});

router.post('/:id/reinitialiser-code', valider({ params: s.paramsId }), async (req, res) => {
  const locataire = await trouverLocataire(req.valide.params.id, req.user.id);
  const code = genererCode();
  await prisma.user.update({
    where: { id: locataire.id },
    data: { motDePasseHash: await bcrypt.hash(code, 10), doitChangerMotDePasse: true, tentativesEchouees: 0, verrouilleJusqua: null },
  });
  res.json({ codeProvisoire: code });
});

router.post('/:id/affecter', valider({ params: s.paramsId, body: s.affectation }), async (req, res) => {
  const { logementId, dateEntree, jourEcheance } = req.valide.body;
  const locataire = await trouverLocataire(req.valide.params.id, req.user.id);
  if (locataire.baux.some((b) => b.actif)) {
    throw new ErreurApi(409, 'Ce locataire occupe déjà un logement : mettez d’abord fin à son bail.', 'BAIL_ACTIF');
  }
  const logement = await verifierLogementDisponible(logementId, req.user.id);

  const bail = await prisma.$transaction(async (tx) => {
    const cree = await tx.bail.create({
      data: { logementId, locataireId: locataire.id, dateEntree, jourEcheance, loyerMensuel: logement.loyerMensuel },
    });
    await tx.logement.update({ where: { id: logementId }, data: { statut: STATUTS_LOGEMENT.OCCUPE } });
    return cree;
  });
  await genererEcheancesBail(bail);
  res.status(201).json({ locataire: resume(await trouverLocataire(locataire.id, req.user.id)) });
});

router.post('/:id/fin-bail', valider({ params: s.paramsId, body: s.finBail }), async (req, res) => {
  const locataire = await trouverLocataire(req.valide.params.id, req.user.id);
  const bail = locataire.baux.find((b) => b.actif);
  if (!bail) throw new ErreurApi(409, 'Ce locataire n’a pas de bail en cours.', 'PAS_DE_BAIL');

  const dateSortie = req.valide.body?.dateSortie ?? new Date();
  await prisma.$transaction([
    prisma.bail.update({ where: { id: bail.id }, data: { actif: false, dateSortie } }),
    prisma.logement.update({ where: { id: bail.logementId }, data: { statut: STATUTS_LOGEMENT.LIBRE } }),
    // Les impayés passés restent dus ; seuls les mois après la sortie sont annulés.
    prisma.echeance.updateMany({
      where: { bailId: bail.id, statut: STATUTS_ECHEANCE.EN_ATTENTE, periode: { gt: periodeDe(dateSortie) } },
      data: { statut: STATUTS_ECHEANCE.ANNULEE },
    }),
  ]);
  res.json({ locataire: resume(await trouverLocataire(locataire.id, req.user.id)) });
});

export default router;
