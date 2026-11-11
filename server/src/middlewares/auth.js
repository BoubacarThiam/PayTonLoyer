import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { ErreurApi } from './erreurs.js';

export const NOM_COOKIE = 'ptl_session';

export function poserSession(res, user) {
  const jeton = jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: config.jwtDuree, algorithm: 'HS256' });
  res.cookie(NOM_COOKIE, jeton, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.enProduction,
    maxAge: 7 * 24 * 3600 * 1000,
    path: '/',
  });
}

export function effacerSession(res) {
  res.clearCookie(NOM_COOKIE, { path: '/' });
}

async function chargerUtilisateur(req) {
  const jeton = req.cookies?.[NOM_COOKIE];
  if (!jeton) throw new ErreurApi(401, 'Veuillez vous connecter.', 'NON_CONNECTE');
  let contenu;
  try {
    contenu = jwt.verify(jeton, config.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw new ErreurApi(401, 'Votre session a expiré. Veuillez vous reconnecter.', 'NON_CONNECTE');
  }
  const user = await prisma.user.findUnique({ where: { id: contenu.sub } });
  if (!user) throw new ErreurApi(401, 'Veuillez vous connecter.', 'NON_CONNECTE');
  req.user = user;
}

// Pour /moi, /deconnexion et le changement de code, accessibles même avec un code provisoire.
export async function exigerSession(req, res, next) {
  await chargerUtilisateur(req);
  next();
}

export async function exigerAuth(req, res, next) {
  await chargerUtilisateur(req);
  if (req.user.doitChangerMotDePasse) {
    throw new ErreurApi(403, 'Vous devez d’abord changer votre code provisoire.', 'CHANGEMENT_CODE_REQUIS');
  }
  next();
}

export function exigerRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) throw new ErreurApi(403, 'Vous n’avez pas accès à cette page.', 'INTERDIT');
    next();
  };
}
