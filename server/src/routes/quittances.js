import { Router } from 'express';
import { prisma } from '../prisma.js';
import { nonTrouve } from '../middlewares/erreurs.js';
import { exigerAuth } from '../middlewares/auth.js';
import { valider } from '../middlewares/valider.js';
import * as s from '../validators/schemas.js';
import { cheminQuittance, genererQuittance } from '../services/quittances.js';

const router = Router();
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
