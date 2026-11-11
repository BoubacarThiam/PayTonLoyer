import { Router } from 'express';
import { prisma } from '../prisma.js';
import { ROLES, STATUTS_ECHEANCE, STATUTS_PAIEMENT } from '../constantes.js';
import { exigerAuth, exigerRole } from '../middlewares/auth.js';
import { avecStatutReel } from '../services/echeances.js';
import { logementPublic, paiementPublic } from '../utils/serialiser.js';

const router = Router();
router.use(exigerAuth, exigerRole(ROLES.LOCATAIRE));

router.get('/accueil', async (req, res) => {
  const bail = await prisma.bail.findFirst({
    where: { locataireId: req.user.id, actif: true },
    include: {
      logement: {
        include: {
          photos: { orderBy: { ordre: 'asc' } },
          proprietaire: { select: { nom: true, telephone: true } },
        },
      },
    },
  });

  // Tous les impayés, y compris ceux d'un ancien bail
  const impayees = await prisma.echeance.findMany({
    where: { statut: STATUTS_ECHEANCE.EN_ATTENTE, bail: { locataireId: req.user.id } },
    orderBy: { periode: 'asc' },
    include: { bail: { select: { logement: { select: { nom: true } } } } },
  });
  const echeances = impayees.map((e) => avecStatutReel(e));
  const retards = echeances.filter((e) => e.statutReel === STATUTS_ECHEANCE.EN_RETARD);

  let logement = null;
  let proprietaire = null;
  if (bail) {
    const { proprietaire: p, ...reste } = bail.logement;
    logement = logementPublic(reste);
    proprietaire = p;
  }

  res.json({
    bail: bail && {
      id: bail.id,
      dateEntree: bail.dateEntree,
      jourEcheance: bail.jourEcheance,
      loyerMensuel: bail.loyerMensuel,
    },
    logement,
    proprietaire,
    prochaineEcheance: echeances[0] ?? null,
    echeancesImpayees: echeances,
    totalRetard: retards.reduce((somme, e) => somme + e.montant, 0),
  });
});

router.get('/historique', async (req, res) => {
  const echeances = await prisma.echeance.findMany({
    where: { bail: { locataireId: req.user.id }, statut: { not: STATUTS_ECHEANCE.ANNULEE } },
    orderBy: { periode: 'desc' },
    include: {
      quittance: { select: { id: true, numero: true } },
      paiements: { where: { statut: STATUTS_PAIEMENT.REUSSI }, take: 1 },
      bail: { select: { logement: { select: { nom: true } } } },
    },
  });
  res.json({
    echeances: echeances.map(({ paiements, ...e }) => ({ ...avecStatutReel(e), paiement: paiementPublic(paiements[0]) })),
  });
});

export default router;
