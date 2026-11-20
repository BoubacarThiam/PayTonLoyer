import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import logementsRoutes from './routes/logements.js';
import locatairesRoutes from './routes/locataires.js';
import echeancesRoutes from './routes/echeances.js';
import tableauDeBordRoutes from './routes/tableauDeBord.js';
import espaceLocataireRoutes from './routes/espaceLocataire.js';
import paiementsRoutes from './routes/paiements.js';
import quittancesRoutes from './routes/quittances.js';
import simulateurRoutes from './routes/simulateur.js';
import { gestionErreurs, routeInconnue } from './middlewares/erreurs.js';
import { DOSSIER_UPLOADS } from './services/images.js';
import { tauxDeChange } from './services/devises.js';

const ici = path.dirname(fileURLToPath(import.meta.url));

export function creerApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.enProduction) app.set('trust proxy', 1);

  // La seule source extérieure autorisée en cadre est la carte OpenStreetMap des logements.
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { 'frame-src': ["'self'", 'https://www.openstreetmap.org'] } },
    }),
  );
  // Le corps brut est conservé : la signature des webhooks SasPay se calcule dessus, octet pour octet.
  app.use(express.json({ limit: '100kb', verify: (req, res, tampon) => { req.rawBody = tampon; } }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.use(cookieParser());

  app.use('/uploads', express.static(DOSSIER_UPLOADS, { maxAge: '30d', immutable: true }));

  app.get('/api/sante', (req, res) => res.json({ ok: true }));
  app.get('/api/devises', async (req, res) => res.json(await tauxDeChange()));
  app.use('/api/auth', authRoutes);
  app.use('/api/logements', logementsRoutes);
  app.use('/api/locataires', locatairesRoutes);
  app.use('/api/echeances', echeancesRoutes);
  app.use('/api/tableau-de-bord', tableauDeBordRoutes);
  app.use('/api/locataire', espaceLocataireRoutes);
  if (!config.enProduction) app.use('/api/paiements/simulateur', simulateurRoutes);
  app.use('/api/paiements', paiementsRoutes);
  app.use('/api/quittances', quittancesRoutes);
  app.use('/api', routeInconnue);

  // En production, le serveur distribue aussi le client compilé.
  const dist = path.resolve(ici, '../../client/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^\/(?!api|uploads).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(gestionErreurs);
  return app;
}
