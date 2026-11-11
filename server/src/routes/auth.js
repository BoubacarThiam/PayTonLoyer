import { Router } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { ROLES } from '../constantes.js';
import { ErreurApi } from '../middlewares/erreurs.js';
import { effacerSession, exigerSession, poserSession } from '../middlewares/auth.js';
import { valider } from '../middlewares/valider.js';
import * as s from '../validators/schemas.js';
import { normaliserTelephone } from '../utils/telephone.js';
import { utilisateurPublic } from '../utils/serialiser.js';

const router = Router();

const COUT_BCRYPT = 10;
const MAX_TENTATIVES = 5;
const DUREE_VERROU_MS = 15 * 60 * 1000;
// Compare aussi quand le compte n'existe pas, pour ne pas révéler son existence par le temps de réponse.
const HASH_LEURRE = bcrypt.hashSync('leurre-paytonloyer', COUT_BCRYPT);

const limiteConnexion = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.enTest,
  message: { message: 'Trop de tentatives. Veuillez réessayer dans quelques minutes.', code: 'TROP_DE_TENTATIVES' },
});

const erreurIdentifiants = (message) => new ErreurApi(401, message, 'IDENTIFIANTS_INVALIDES');

async function verifierSecret(user, secret, messageErreur) {
  if (!user) {
    await bcrypt.compare(secret, HASH_LEURRE);
    throw erreurIdentifiants(messageErreur);
  }
  if (user.verrouilleJusqua && user.verrouilleJusqua > new Date()) {
    throw new ErreurApi(429, 'Compte temporairement bloqué après plusieurs erreurs. Réessayez dans 15 minutes.', 'COMPTE_VERROUILLE');
  }
  if (await bcrypt.compare(secret, user.motDePasseHash)) {
    if (user.tentativesEchouees > 0 || user.verrouilleJusqua) {
      await prisma.user.update({ where: { id: user.id }, data: { tentativesEchouees: 0, verrouilleJusqua: null } });
    }
    return;
  }
  const tentatives = user.tentativesEchouees + 1;
  await prisma.user.update({
    where: { id: user.id },
    data:
      tentatives >= MAX_TENTATIVES
        ? { tentativesEchouees: 0, verrouilleJusqua: new Date(Date.now() + DUREE_VERROU_MS) }
        : { tentativesEchouees: tentatives },
  });
  throw erreurIdentifiants(messageErreur);
}

router.post('/inscription', limiteConnexion, valider({ body: s.inscription }), async (req, res) => {
  const { nom, telephone, email, motDePasse } = req.valide.body;
  const existant = await prisma.user.findFirst({ where: { OR: [{ telephone }, { email }] } });
  if (existant) throw new ErreurApi(409, 'Un compte existe déjà avec ce numéro ou cet e-mail.', 'COMPTE_EXISTANT');

  const user = await prisma.user.create({
    data: { role: ROLES.PROPRIETAIRE, nom, telephone, email, motDePasseHash: await bcrypt.hash(motDePasse, COUT_BCRYPT) },
  });
  poserSession(res, user);
  res.status(201).json({ utilisateur: utilisateurPublic(user) });
});

router.post('/connexion', limiteConnexion, valider({ body: s.connexion }), async (req, res) => {
  const { identifiant, motDePasse } = req.valide.body;
  const tel = normaliserTelephone(identifiant);
  const user = await prisma.user.findFirst({
    where: {
      role: ROLES.PROPRIETAIRE,
      OR: [{ email: identifiant.toLowerCase() }, ...(tel ? [{ telephone: tel }] : [])],
    },
  });
  await verifierSecret(user, motDePasse, 'Identifiant ou mot de passe incorrect.');
  poserSession(res, user);
  res.json({ utilisateur: utilisateurPublic(user) });
});

router.post('/connexion-locataire', limiteConnexion, valider({ body: s.connexionLocataire }), async (req, res) => {
  const { telephone, code } = req.valide.body;
  const user = await prisma.user.findFirst({ where: { telephone, role: ROLES.LOCATAIRE } });
  await verifierSecret(user, code, 'Numéro de téléphone ou code incorrect.');
  poserSession(res, user);
  res.json({ utilisateur: utilisateurPublic(user) });
});

router.post('/deconnexion', (req, res) => {
  effacerSession(res);
  res.json({ ok: true });
});

router.get('/moi', exigerSession, (req, res) => {
  res.json({ utilisateur: utilisateurPublic(req.user) });
});

router.post('/changer-code', limiteConnexion, exigerSession, valider({ body: s.changementSecret }), async (req, res) => {
  const { ancien, nouveau } = req.valide.body;
  const estLocataire = req.user.role === ROLES.LOCATAIRE;

  const controle = estLocataire
    ? z.string().regex(/^\d{6}$/, 'Le nouveau code doit contenir 6 chiffres.')
    : z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.');
  const resultat = controle.safeParse(nouveau);
  if (!resultat.success) throw new ErreurApi(400, resultat.error.issues[0].message, 'VALIDATION');
  if (ancien === nouveau) throw new ErreurApi(400, 'Le nouveau code doit être différent de l’ancien.', 'VALIDATION');

  await verifierSecret(req.user, ancien, 'Le code actuel est incorrect.');
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { motDePasseHash: await bcrypt.hash(nouveau, COUT_BCRYPT), doitChangerMotDePasse: false },
  });
  res.json({ utilisateur: utilisateurPublic(user) });
});

export default router;
