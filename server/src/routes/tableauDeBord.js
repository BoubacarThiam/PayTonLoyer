import { Router } from 'express';
import { prisma } from '../prisma.js';
import { ROLES, STATUTS_ECHEANCE, STATUTS_LOGEMENT, STATUTS_PAIEMENT } from '../constantes.js';
import { exigerAuth, exigerRole } from '../middlewares/auth.js';
import { valider } from '../middlewares/valider.js';
import * as s from '../validators/schemas.js';
import { avecStatutReel } from '../services/echeances.js';
import { periodeDe } from '../utils/dates.js';

const router = Router();
router.use(exigerAuth, exigerRole(ROLES.PROPRIETAIRE));

router.get('/', valider({ query: s.filtrePeriode }), async (req, res) => {
  const periode = req.valide.query.periode || periodeDe();
  const dansMesLogements = { bail: { logement: { proprietaireId: req.user.id } } };

  const [duMois, arrieres, logements, locatairesActifs, anomalies] = await Promise.all([
    prisma.echeance.findMany({
      where: { ...dansMesLogements, periode, statut: { not: STATUTS_ECHEANCE.ANNULEE } },
      select: { montant: true, statut: true, dateEcheance: true },
    }),
    prisma.echeance.aggregate({
      where: { ...dansMesLogements, periode: { lt: periode }, statut: STATUTS_ECHEANCE.EN_ATTENTE },
      _sum: { montant: true },
      _count: true,
    }),
    prisma.logement.groupBy({ by: ['statut'], where: { proprietaireId: req.user.id }, _count: true }),
    prisma.bail.count({ where: { actif: true, logement: { proprietaireId: req.user.id } } }),
    prisma.paiement.findMany({
      where: { statut: STATUTS_PAIEMENT.ANOMALIE, echeance: dansMesLogements },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        reference: true,
        montant: true,
        methode: true,
        note: true,
        echeance: { select: { periode: true, bail: { select: { locataire: { select: { nom: true } } } } } },
      },
    }),
  ]);

  const total = (liste) => liste.reduce((somme, e) => somme + e.montant, 0);
  const payees = duMois.filter((e) => e.statut === STATUTS_ECHEANCE.PAYEE);
  const enRetard = duMois.filter((e) => avecStatutReel(e).statutReel === STATUTS_ECHEANCE.EN_RETARD);
  const nbLogements = (statut) => logements.find((l) => l.statut === statut)?._count ?? 0;

  res.json({
    periode,
    attendu: total(duMois),
    encaisse: total(payees),
    impaye: total(duMois) - total(payees),
    nombres: {
      echeances: duMois.length,
      payees: payees.length,
      enRetard: enRetard.length,
      logementsOccupes: nbLogements(STATUTS_LOGEMENT.OCCUPE),
      logementsLibres: nbLogements(STATUTS_LOGEMENT.LIBRE),
      locatairesActifs,
    },
    arrieres: { montant: arrieres._sum.montant ?? 0, nombre: arrieres._count },
    anomalies,
  });
});

export default router;
