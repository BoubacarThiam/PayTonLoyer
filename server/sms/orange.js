// API SMS d'Orange Developer, offre « SMS Senegal » (https://developer.orange.com/apis/sms-sn).
// Jeton OAuth2 « client credentials » valable 1 h, puis envoi vers le numéro expéditeur du pays (tel:+2210000).
import { ErreurFournisseur } from '../payments/erreurs.js';

const URL_JETON = 'https://api.orange.com/oauth/v3/token';
const DELAI_MS = 15000;

export function creerOrangeSms(cfg, { fetchImpl = (...a) => fetch(...a), maintenant = () => Date.now() } = {}) {
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new Error('Identifiants Orange SMS manquants : renseignez ORANGE_SMS_CLIENT_ID et ORANGE_SMS_CLIENT_SECRET dans le fichier .env.');
  }
  const expediteur = cfg.senderAddress || 'tel:+2210000';
  const urlEnvoi = `https://api.orange.com/smsmessaging/v1/outbound/${encodeURIComponent(expediteur)}/requests`;
  let jeton = null;

  async function obtenirJeton(forcer = false) {
    if (!forcer && jeton && jeton.expireLe > maintenant()) return jeton.valeur;
    let reponse;
    try {
      reponse = await fetchImpl(URL_JETON, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(DELAI_MS),
      });
    } catch (erreur) {
      throw new ErreurFournisseur(`Orange SMS injoignable : ${erreur.message}`);
    }
    const corps = await reponse.json().catch(() => null);
    if (!reponse.ok || !corps?.access_token) {
      throw new ErreurFournisseur(`Authentification Orange refusée (HTTP ${reponse.status}) : ${corps?.description || corps?.message || 'réponse invalide'}`);
    }
    // expires_in arrive selon les pages en nombre ou en texte ; marge d'une minute avant l'expiration.
    jeton = { valeur: corps.access_token, expireLe: maintenant() + (Number(corps.expires_in) || 3600) * 1000 - 60000 };
    return jeton.valeur;
  }

  async function poster(message, telephone, valeurJeton) {
    const requete = { address: `tel:${telephone}`, senderAddress: expediteur, outboundSMSTextMessage: { message } };
    if (cfg.senderName) requete.senderName = cfg.senderName;
    try {
      return await fetchImpl(urlEnvoi, {
        method: 'POST',
        headers: { Authorization: `Bearer ${valeurJeton}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ outboundSMSMessageRequest: requete }),
        signal: AbortSignal.timeout(DELAI_MS),
      });
    } catch (erreur) {
      throw new ErreurFournisseur(`Orange SMS injoignable : ${erreur.message}`);
    }
  }

  return {
    nom: 'orange',
    async envoyer({ telephone, message }) {
      let reponse = await poster(message, telephone, await obtenirJeton());
      // Jeton expiré entre-temps : on en demande un nouveau, une seule fois.
      if (reponse.status === 401) reponse = await poster(message, telephone, await obtenirJeton(true));

      const corps = await reponse.json().catch(() => null);
      if (reponse.status !== 201) {
        const detail = corps?.requestError?.serviceException?.text || corps?.requestError?.policyException?.text || corps?.description || corps?.message;
        throw new ErreurFournisseur(`Orange a refusé le SMS (HTTP ${reponse.status})${detail ? ` : ${detail}` : ''}`);
      }
      const lien = reponse.headers?.get?.('location') || corps?.outboundSMSMessageRequest?.resourceURL || '';
      return { idExterne: lien.split('/').pop() || null };
    },
  };
}
