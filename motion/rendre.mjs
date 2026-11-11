// Rend showreel.html image par image puis l'encode en MP4.
//   npm run apercu   -> quelques images clés dans apercu/
//   npm run rendre   -> showreel-1080p.mp4 ici, et version web 720p + affiche dans client/public/video/
// FFmpeg doit être dans le PATH, ou indiqué par la variable FFMPEG.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ici = path.dirname(fileURLToPath(import.meta.url));
const IPS = 30;
const apercu = process.argv.includes('--apercu');
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const dossierImages = path.join(ici, apercu ? 'apercu' : 'images');
// Le site joue l'animation en direct (AnimationMarque.jsx) : les vidéos restent dans motion/.
const dossierWeb = ici;

await fs.rm(dossierImages, { recursive: true, force: true });
await fs.mkdir(dossierImages, { recursive: true });

const navigateur = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await navigateur.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const erreurs = [];
page.on('pageerror', (e) => erreurs.push(e.message));
page.on('console', (m) => m.type() === 'error' && erreurs.push(m.text()));
await page.goto(pathToFileURL(path.join(ici, 'showreel.html')).href);
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => i.decode()));
});
const duree = await page.evaluate(() => window.DUREE);

const instants = apercu ? [0.5, 1.2, 1.7, 2.35, 3.1, 3.6, 4.6, 6.0, 7.6, 9.3, 10.6, 12.1, 13.1, 13.8, 14.9] : null;
const total = apercu ? instants.length : Math.round(duree * IPS);
const debut = Date.now();
for (let i = 0; i < total; i += 1) {
  const t = apercu ? instants[i] : i / IPS;
  await page.evaluate((v) => window.allerA(v), t);
  const nom = apercu ? `t${t.toFixed(2)}.jpg` : `${String(i).padStart(4, '0')}.jpg`;
  await page.screenshot({ path: path.join(dossierImages, nom), type: 'jpeg', quality: 93 });
  if (!apercu && i % 90 === 0) console.log(`image ${i}/${total}`);
}
await navigateur.close();
console.log(`${total} images en ${Math.round((Date.now() - debut) / 1000)} s${erreurs.length ? ` — erreurs : ${erreurs.join(' | ')}` : ''}`);
if (apercu) process.exit(0);

function encoder(args) {
  const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`FFmpeg a échoué (${args.at(-1)})`);
}
const entree = ['-framerate', String(IPS), '-i', path.join(dossierImages, '%04d.jpg')];
await fs.mkdir(dossierWeb, { recursive: true });
encoder([...entree, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(ici, 'showreel-1080p.mp4')]);
encoder([...entree, '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.join(dossierWeb, 'showreel-720p.mp4')]);
encoder(['-i', path.join(dossierImages, `${String(Math.round(14.6 * IPS)).padStart(4, '0')}.jpg`), '-vf', 'scale=1280:720', '-q:v', '4', path.join(dossierWeb, 'showreel-affiche.jpg')]);
await fs.rm(dossierImages, { recursive: true, force: true });
console.log('Vidéos écrites.');
