import multer from 'multer';
import { MAX_PHOTOS_PAR_LOGEMENT } from '../constantes.js';
import { ErreurApi } from './erreurs.js';

const TYPES_ACCEPTES = ['image/jpeg', 'image/png', 'image/webp'];

// Les fichiers restent en mémoire : sharp les valide et les compresse avant écriture.
export const uploadPhotos = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: MAX_PHOTOS_PAR_LOGEMENT },
  fileFilter(req, fichier, cb) {
    if (TYPES_ACCEPTES.includes(fichier.mimetype)) return cb(null, true);
    return cb(new ErreurApi(400, 'Seules les photos JPEG, PNG ou WebP sont acceptées.', 'UPLOAD'));
  },
}).array('photos', MAX_PHOTOS_PAR_LOGEMENT);
