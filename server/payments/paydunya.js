import crypto from 'node:crypto';
import { ErreurFournisseur, RESULTATS, SignatureInvalide } from './erreurs.js';

const STATUTS = {
  completed: RESULTATS.REUSSI,
  failed: RESULTATS.ECHOUE,
  cancelled: RESULTATS.ANNULE,
  pending: RESULTATS.EN_ATTENTE,
};

const DELAI_MS = 20000;

function comparerConstant(a, b) {
  const ta = Buffer.from(String(a));
  const tb = Buffer.from(String(b));
  return ta.length === tb.length && crypto.timingSafeEqual(ta, tb);
}

export function creerPaydunya(cfg, fetchImpl = (...a) => fetch(...a)) {
  for (const cle of ['masterKey', 'privateKey', 'token']) {
    if (!cfg[cle]) throw new Error('Clés PayDunya manquantes : renseignez PAYDUNYA_* dans le fichier .env.');
  }

  const base = `https://app.paydunya.com/${cfg.mode === 'live' ? 'api' : 'sandbox-api'}/v1/checkout-invoice`;
  const entetes = {
    'Content-Type': 'application/json',
    'PAYDUNYA-MASTER-KEY': cfg.masterKey,
    'PAYDUNYA-PRIVATE-KEY': cfg.privateKey,
    'PAYDUNYA-TOKEN': cfg.token,
  };

  async function appeler(url, options) {
    let reponse;
    try {
      reponse = await fetchImpl(url, { ...options, headers: entetes, signal: AbortSignal.timeout(DELAI_MS) });
    } catch (erreur) {
      throw new ErreurFournisseur(`PayDunya injoignable : ${erreur.message}`);
    }
    const corps = await reponse.json().catch(() => null);
    if (!corps) throw new ErreurFournisseur(`Réponse illisible de PayDunya (HTTP ${reponse.status}).`);
    return corps;
  }

  return {
    nom: 'paydunya',
    methodes: ['WAVE', 'ORANGE_MONEY', 'FREE_MONEY'],

    async initierPaiement({ reference, montant, description, methode, client, urls }) {
      const canal = cfg.canaux?.[methode];
      const corps = await appeler(`${base}/create`, {
        method: 'POST',
        body: JSON.stringify({
          invoice: {
            total_amount: montant,
            description,
            customer: { name: client.nom, phone: client.telephone },
            ...(canal ? { channels: [canal] } : {}),
          },
          store: { name: cfg.storeName },
          custom_data: { reference },
          actions: { return_url: urls.retour, cancel_url: urls.annulation, callback_url: urls.webhook },
        }),
      });
      if (corps.response_code !== '00' || !corps.token) {
        throw new ErreurFournisseur(`PayDunya a refusé la facture : ${corps.response_text || corps.response_code}`);
      }
      return { referenceExterne: corps.token, urlPaiement: corps.response_text };
    },

    async verifierPaiement(token) {
      const corps = await appeler(`${base}/confirm/${encodeURIComponent(token)}`, { method: 'GET' });
      if (corps.response_code !== '00') {
        throw new ErreurFournisseur(`Vérification PayDunya impossible : ${corps.response_text || corps.response_code}`);
      }
      return {
        statut: STATUTS[corps.status] ?? RESULTATS.EN_ATTENTE,
        montant: Number(corps.invoice?.total_amount),
      };
    },

    // Notification envoyée en x-www-form-urlencoded sous la clé « data ».
    webhook(req) {
      const donnees = req.body?.data;
      const attendu = crypto.createHash('sha512').update(cfg.masterKey).digest('hex');
      if (!donnees?.hash || !comparerConstant(donnees.hash, attendu)) {
        throw new SignatureInvalide('Signature PayDunya invalide.');
      }
      const token = donnees.invoice?.token;
      if (!token) throw new SignatureInvalide('Notification PayDunya sans jeton.');
      return { idEvenement: `${token}:${donnees.status}`, referenceExterne: token };
    },
  };
}
