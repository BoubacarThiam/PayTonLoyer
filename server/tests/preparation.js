import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Repart d'une base de test vierge, distincte de la base de développement.
export default function preparation() {
  for (const suffixe of ['', '-journal']) fs.rmSync(path.join(racine, 'prisma', `test.db${suffixe}`), { force: true });
  execSync('npx prisma db push --skip-generate', {
    cwd: racine,
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
  });
}
