// Génère les icônes PWA de client/public/icons. Usage : node scripts/generer-icones.js
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const dossier = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/public/icons');
await fs.mkdir(dossier, { recursive: true });

const maison = 'M256 104 88 244h48v164h96V300h48v108h96V244h48z';
const icone = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#064e3b"/><path d="${maison}" fill="#fff"/></svg>`;
// Masquable : pleine page, pictogramme réduit dans la zone de sécurité.
const masquable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#064e3b"/><g transform="translate(64 64) scale(.75)"><path d="${maison}" fill="#fff"/></g></svg>`;

await sharp(Buffer.from(icone)).resize(192).png().toFile(path.join(dossier, 'icon-192.png'));
await sharp(Buffer.from(icone)).resize(512).png().toFile(path.join(dossier, 'icon-512.png'));
await sharp(Buffer.from(masquable)).resize(512).png().toFile(path.join(dossier, 'icon-512-maskable.png'));
await sharp(Buffer.from(masquable)).resize(180).png().toFile(path.join(dossier, 'apple-touch-icon.png'));
console.log('Icônes générées.');
