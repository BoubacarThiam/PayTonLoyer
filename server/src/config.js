import 'dotenv/config';

function requis(nom) {
  const valeur = process.env[nom];
  if (!valeur) throw new Error(`Variable d'environnement manquante : ${nom}`);
  return valeur;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  enProduction: process.env.NODE_ENV === 'production',
  enTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT || 4000),
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),
  apiUrl: (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, ''),
  jwtSecret: requis('JWT_SECRET'),
  jwtDuree: process.env.JWT_DUREE || '7d',
  paiement: {
    fournisseur: process.env.PAIEMENT_FOURNISSEUR || 'simulateur',
    paydunya: {
      mode: process.env.PAYDUNYA_MODE || 'test',
      masterKey: process.env.PAYDUNYA_MASTER_KEY || '',
      privateKey: process.env.PAYDUNYA_PRIVATE_KEY || '',
      publicKey: process.env.PAYDUNYA_PUBLIC_KEY || '',
      token: process.env.PAYDUNYA_TOKEN || '',
      storeName: process.env.PAYDUNYA_STORE_NAME || 'PayTonLoyer',
      // Vide : la page PayDunya propose tous les moyens de paiement actifs du compte.
      canaux: {
        WAVE: process.env.PAYDUNYA_CANAL_WAVE || '',
        ORANGE_MONEY: process.env.PAYDUNYA_CANAL_ORANGE_MONEY || '',
        FREE_MONEY: process.env.PAYDUNYA_CANAL_FREE_MONEY || '',
      },
    },
  },
};

if (config.enProduction && config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET doit contenir au moins 32 caractères en production.');
}
