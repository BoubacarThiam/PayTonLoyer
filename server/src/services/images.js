import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ErreurApi } from '../middlewares/erreurs.js';

export const DOSSIER_UPLOADS =
  process.env.DOSSIER_UPLOADS || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');

// Réencoder l'image la valide réellement et retire ses métadonnées (dont le GPS).
export async function enregistrerPhoto(tampon) {
  const fichier = `${crypto.randomUUID()}.webp`;
  await fs.mkdir(DOSSIER_UPLOADS, { recursive: true });
  try {
    await sharp(tampon)
      .rotate()
      .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72 })
      .toFile(path.join(DOSSIER_UPLOADS, fichier));
  } catch {
    throw new ErreurApi(400, 'Une des photos est illisible ou corrompue.', 'UPLOAD');
  }
  return fichier;
}

export async function supprimerPhoto(fichier) {
  await fs.unlink(path.join(DOSSIER_UPLOADS, path.basename(fichier))).catch(() => {});
}
