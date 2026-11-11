import multer from 'multer';

export class ErreurApi extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const nonTrouve = (message = 'Élément introuvable.') => new ErreurApi(404, message, 'NON_TROUVE');

export function routeInconnue(req, res) {
  res.status(404).json({ message: 'Cette ressource n’existe pas.', code: 'NON_TROUVE' });
}

// eslint-disable-next-line no-unused-vars
export function gestionErreurs(erreur, req, res, next) {
  if (erreur instanceof ErreurApi) {
    return res.status(erreur.status).json({ message: erreur.message, code: erreur.code, champs: erreur.champs });
  }
  if (erreur instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: 'Chaque photo doit faire moins de 8 Mo.',
      LIMIT_FILE_COUNT: 'Vous avez envoyé trop de photos en une seule fois.',
      LIMIT_UNEXPECTED_FILE: 'Fichier inattendu dans le formulaire.',
    };
    return res.status(400).json({ message: messages[erreur.code] || 'Le fichier envoyé est invalide.', code: 'UPLOAD' });
  }
  if (erreur.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Requête mal formée.', code: 'REQUETE_INVALIDE' });
  }
  if (erreur.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Requête trop volumineuse.', code: 'REQUETE_INVALIDE' });
  }
  console.error(erreur);
  return res.status(500).json({ message: 'Une erreur est survenue. Veuillez réessayer.', code: 'ERREUR_SERVEUR' });
}
