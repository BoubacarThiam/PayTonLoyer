import os from 'node:os';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const dossierTemp = path.join(os.tmpdir(), 'paytonloyer-tests');

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    globalSetup: 'tests/preparation.js',
    // Une seule base SQLite partagée : les fichiers de test s'exécutent l'un après l'autre.
    fileParallelism: false,
    testTimeout: 20000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: 'secret-de-test-suffisamment-long-pour-les-tests',
      PAIEMENT_FOURNISSEUR: 'simulateur',
      CLIENT_URL: 'http://client.test',
      API_URL: 'http://api.test',
      DOSSIER_QUITTANCES: path.join(dossierTemp, 'quittances'),
      DOSSIER_UPLOADS: path.join(dossierTemp, 'uploads'),
      // Valeurs factices : aucun appel réel à SasPay pendant les tests (fetch est simulé).
      // Volontairement courte : le garde-fou anti-secrets du push automatique ne la confond pas avec une vraie clé.
      SASPAY_API_KEY: 'sk_test_factice',
      SASPAY_WEBHOOK_SECRET: 'secret-webhook-de-test',
      SASPAY_EMAIL_CLIENT: 'paiements@test.sn',
      SASPAY_AUTORISER_LIVE: '',
      // Pas d'appel à OpenStreetMap pendant les tests.
      GEOCODAGE_ACTIF: 'non',
    },
  },
});
