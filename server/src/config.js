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
    saspay: {
      apiKey: process.env.SASPAY_API_KEY || '',
      webhookSecret: process.env.SASPAY_WEBHOOK_SECRET || '',
      emailClient: process.env.SASPAY_EMAIL_CLIENT || '',
      baseUrl: process.env.SASPAY_BASE_URL || 'https://api.saspay.me/api/v1',
      autoriserLive: process.env.SASPAY_AUTORISER_LIVE === 'oui',
    },
  },
  sms: {
    // console : aucun envoi réel, le SMS s'affiche dans le terminal du serveur.
    fournisseur: process.env.SMS_FOURNISSEUR || 'console',
    orange: {
      clientId: process.env.ORANGE_SMS_CLIENT_ID || '',
      clientSecret: process.env.ORANGE_SMS_CLIENT_SECRET || '',
      senderAddress: process.env.ORANGE_SMS_SENDER_ADDRESS || 'tel:+2210000',
      // Nom d'expéditeur personnalisé (11 caractères max), à faire valider par Orange avant usage.
      senderName: process.env.ORANGE_SMS_SENDER_NAME || '',
    },
  },
};

if (config.enProduction && config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET doit contenir au moins 32 caractères en production.');
}
