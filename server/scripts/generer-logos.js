// Produit les déclinaisons du logo à partir de marque/logo-source.png (logo bleu sur fond blanc).
// Usage : node scripts/generer-logos.js
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = path.join(racine, 'marque', 'logo-source.png');
const sortie = path.join(racine, 'client', 'public', 'logo');
const icones = path.join(racine, 'client', 'public', 'icons');
const BLEU = '#00225f';

await fs.mkdir(sortie, { recursive: true });

// Le blanc devient transparent : l'opacité suit l'intensité de l'encre.
async function detourer(entree, couleur, fichier, largeur) {
  const base = sharp(await entree.toBuffer()).trim({ background: '#ffffff', threshold: 30 });
  const { data, info } = await base.clone().toColourspace('b-w').negate().linear(1.35, -30).raw().toBuffer({ resolveWithObject: true });
  let image = sharp({ create: { width: info.width, height: info.height, channels: 3, background: couleur } })
    .joinChannel(data, { raw: { width: info.width, height: info.height, channels: 1 } });
  if (largeur) image = sharp(await image.png().toBuffer()).resize({ width: largeur });
  await image.png({ compressionLevel: 9 }).toFile(path.join(sortie, fichier));
  return info;
}

const complet = () => sharp(source);
// L'emblème seul (maison, P et téléphone), sans le nom ni la courbe.
// Le découpage s'arrête au-dessus du haut des lettres (y = 575).
const embleme = () => sharp(source).extract({ left: 360, top: 200, width: 920, height: 372 });

for (const [nom, couleur] of [['bleu', BLEU], ['blanc', '#ffffff']]) {
  const info = await detourer(complet(), couleur, `logo-${nom}.png`, 1200);
  await detourer(embleme(), couleur, `embleme-${nom}.png`, 600);
  console.log(`logo-${nom}.png (${info.width}×${info.height} avant redimensionnement)`);
}

// Icônes : seulement la maison et le P, lisibles même à 16 px, sur fond blanc.
// Un rectangle blanc efface les traits de vitesse du téléphone qui dépassent à droite du P.
const monogramme = sharp(
  await sharp(source)
    .extract({ left: 370, top: 205, width: 650, height: 367 })
    .composite([
      // Deux zones en escalier pour épouser la courbe basse du P sans la toucher.
      { input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="45" height="132"><rect width="45" height="132" fill="#fff"/></svg>'), left: 605, top: 235 },
      { input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="45" height="115"><rect width="45" height="115" fill="#fff"/></svg>'), left: 565, top: 252 },
    ])
    .png()
    .toBuffer(),
);
await detourer(monogramme, BLEU, 'monogramme-bleu.png', 512);
const emblemeBleu = await sharp(path.join(sortie, 'monogramme-bleu.png')).toBuffer();
async function icone(taille, marge, fichier, arrondi) {
  const interieur = Math.round(taille * (1 - 2 * marge));
  const pictogramme = await sharp(emblemeBleu).resize({ width: interieur, height: interieur, fit: 'inside' }).toBuffer();
  const fond = arrondi
    ? Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}"><rect width="${taille}" height="${taille}" rx="${taille * 0.22}" fill="#fff"/></svg>`)
    : Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}"><rect width="${taille}" height="${taille}" fill="#fff"/></svg>`);
  await sharp(fond).composite([{ input: pictogramme, gravity: 'centre' }]).png().toFile(path.join(icones, fichier));
}
await fs.mkdir(icones, { recursive: true });
await icone(192, 0.1, 'icon-192.png', true);
await icone(512, 0.1, 'icon-512.png', true);
await icone(512, 0.2, 'icon-512-maskable.png', false);
await icone(180, 0.12, 'apple-touch-icon.png', false);
await icone(64, 0.06, '../favicon.png', true);
console.log('Logos et icônes générés.');
