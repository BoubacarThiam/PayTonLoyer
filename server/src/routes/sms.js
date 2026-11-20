import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { ROLES } from '../constantes.js';
import { exigerAuth, exigerRole } from '../middlewares/auth.js';
import { valider } from '../middlewares/valider.js';
import { resumeSms } from '../services/sms.js';

const router = Router();
router.use(exigerAuth, exigerRole(ROLES.PROPRIETAIRE));

router.get('/', async (req, res) => {
  res.json(await resumeSms(req.user));
});

const preferences = z.object({ smsAutomatiques: z.boolean({ error: 'Valeur invalide.' }) });

router.put('/preferences', valider({ body: preferences }), async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { smsAutomatiques: req.valide.body.smsAutomatiques } });
  res.json(await resumeSms(user));
});

export default router;
