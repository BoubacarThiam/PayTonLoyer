import { Router } from 'express';
import { prisma } from '../prisma.js';
import { nonTrouve } from '../middlewares/erreurs.js';
import { exigerAuth } from '../middlewares/auth.js';
import { valider } from '../middlewares/valider.js';
import * as s from '../validators/schemas.js';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { cheminQuittance, genererQuittance, verifierQuittance } from '../services/quittances.js';

const router = Router();

// Public (lien du QR code imprimé sur la quittance). Limité pour empêcher de deviner des numéros en masse.
const limiteVerification = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.enTest,
  message: { message: 'Trop de vérifications. Réessayez dans une minute.', code: 'TROP_DE_TENTATIVES' },
});

router.get('/verifier/:numero', limiteVerification, async (req, res) => {
  const numero = String(req.params.numero).slice(0, 40);
  const quittance = /^Q-\d{6}-[A-F0-9]{6}$/.test(numero) ? await verifierQuittance(numero) : null;
  if (!quittance) throw nonTrouve('Aucune quittance ne correspond à ce numéro.');
  res.setHeader('Cache-Control', 'no-store');
  res.json({ quittance });
});

router.use(exigerAuth);

router.get('/:id/pdf', valider({ params: s.paramsId }), async (req, res) => {
  // Accessible au seul locataire concerné et au propriétaire du logement.
  const quittance = await prisma.quittance.findFirst({
    where: {
      id: req.valide.params.id,
      echeance: {
        bail: {
          OR: [{ locataireId: req.user.id }, { logement: { proprietaireId: req.user.id } }],
        },
      },
    },
  });
  if (!quittance) throw nonTrouve('Quittance introuvable.');

  await genererQuittance(quittance.echeanceId);
  res.setHeader('Cache-Control', 'private, no-store');
  res.download(cheminQuittance(quittance.fichier), `quittance-${quittance.numero}.pdf`);
});

export default router;
