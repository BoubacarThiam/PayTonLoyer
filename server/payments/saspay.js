// Agrégateur SasPay (https://docs.saspay.me) : paiement « softpay » en Wave, Orange Money ou Free Money.
// Selon le réseau, SasPay renvoie un lien de paiement (redirection) ou pousse la demande sur le téléphone.
import crypto from 'node:crypto';
import { ErreurFournisseur, RESULTATS, SignatureInvalide } from './erreurs.js';

const RESEAUX = { WAVE: 'wave_sn', ORANGE_MONEY: 'orange_sn', FREE_MONEY: 'freemoney_sn' };

const STATUTS = {
  SUCCESS: RESULTATS.REUSSI,
  FAILED: RESULTATS.ECHOUE,
  CANCELLED: RESULTATS.ANNULE,
  PENDING: RESULTATS.EN_ATTENTE,
};

const DELAI_MS = 20000;
// La documentation SasPay demande de rejeter une notification datée de plus de 5 minutes.
const TOLERANCE_SECONDES = 300;

// SasPay exige un prénom et un nom séparés : le dernier mot devient le nom de famille.
function separerNom(nom) {
  const mots = String(nom).trim().split(/\s+/);
  if (mots.length === 1) return { first_name: mots[0], last_name: mots[0] };
  return { first_name: mots.slice(0, -1).join(' '), last_name: mots.at(-1) };
}

function egaliteConstante(a, b) {
  const ta = Buffer.from(String(a));
  const tb = Buffer.from(String(b));
  return ta.length === tb.length && crypto.timingSafeEqual(ta, tb);
}

function enTete(req, nom) {
  return typeof req.get === 'function' ? req.get(nom) : req.headers?.[nom.toLowerCase()];
}

export function creerSaspay(cfg, { fetchImpl = (...a) => fetch(...a), maintenant = () => Date.now(), enProduction = false } = {}) {
  if (!cfg.apiKey) throw new Error('Clé SasPay manquante : renseignez SASPAY_API_KEY dans le fichier .env.');
  if (!cfg.emailClient) {
    throw new Error('SASPAY_EMAIL_CLIENT manquant : SasPay exige un e-mail client, et les locataires n’en ont pas.');
  }
  // Une clé sk_live_ déclenche de vrais débits : jamais en développement sans accord explicite.
  if (cfg.apiKey.startsWith('sk_live_') && !enProduction && !cfg.autoriserLive) {
    throw new Error('Clé SasPay de production (sk_live_) refusée hors production. Utilisez une clé sk_test_, ou SASPAY_AUTORISER_LIVE=oui pour accepter de vrais paiements.');
  }

  const base = (cfg.baseUrl || 'https://api.saspay.me/api/v1').replace(/\/$/, '');

  async function appeler(chemin, options = {}) {
    let reponse;
    try {
      reponse = await fetchImpl(`${base}${chemin}`, {
        ...options,
        headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json', ...options.headers },
        signal: AbortSignal.timeout(DELAI_MS),
      });
    } catch (erreur) {
      throw new ErreurFournisseur(`SasPay injoignable : ${erreur.message}`);
    }
    const corps = await reponse.json().catch(() => null);
    if (!reponse.ok || !corps || corps.success === false) {
      const erreur = corps?.error;
      const detail =
        (typeof erreur === 'string' && erreur) || erreur?.message || corps?.message || (erreur && JSON.stringify(erreur)) || `HTTP ${reponse.status}`;
      const code = erreur?.code || (typeof corps?.code === 'string' ? corps.code : '');
      throw new ErreurFournisseur(`SasPay a refusé la requête (HTTP ${reponse.status}${code ? `, ${code}` : ''}) : ${detail}`);
    }
    return corps.data ?? corps;
  }

  return {
    nom: 'saspay',
    methodes: Object.keys(RESEAUX),

    async initierPaiement({ reference, montant, description, methode, client, urls }) {
      const reseau = RESEAUX[methode];
      if (!reseau) throw new ErreurFournisseur(`Moyen de paiement non pris en charge par SasPay : ${methode}`);
      const data = await appeler('/payments/softpay/', {
        method: 'POST',
        // Notre référence est unique par tentative : un nouvel essai réseau ne crée pas un second débit.
        headers: { 'Idempotency-Key': reference },
        body: JSON.stringify({
          amount: Number(montant).toFixed(2),
          currency: 'XOF',
          country: 'SN',
          network: reseau,
          description,
          metadata: { reference },
          customer: { email: cfg.emailClient, ...separerNom(client.nom), phone: client.telephone },
        }),
      });
      if (!data.id) throw new ErreurFournisseur('Réponse SasPay sans identifiant de paiement.');
      return {
        referenceExterne: data.id,
        // Sans lien (paiement « push »), le locataire attend la confirmation sur notre page de retour.
        urlPaiement: data.checkout_url || urls.retour,
        instructions: data.instructions || null,
      };
    },

    async verifierPaiement(id) {
      const data = await appeler(`/payments/${encodeURIComponent(id)}/verify/`, { method: 'GET' });
      return {
        statut: STATUTS[data.status] ?? RESULTATS.EN_ATTENTE,
        // Montant demandé, hors frais : c'est lui qui doit égaler le loyer.
        montant: Number(data.requested_amount ?? data.amount),
      };
    },

    // Signature : HMAC-SHA256(secret, « horodatage.corps brut ») en hexadécimal.
    webhook(req) {
      if (!cfg.webhookSecret) throw new SignatureInvalide('Secret de webhook SasPay non configuré (SASPAY_WEBHOOK_SECRET).');
      const signature = enTete(req, 'X-Webhook-Signature');
      const horodatage = enTete(req, 'X-Webhook-Timestamp');
      if (!signature || !horodatage || !req.rawBody) throw new SignatureInvalide('Notification SasPay incomplète.');

      const secondes = Number(horodatage);
      if (!Number.isFinite(secondes) || Math.abs(maintenant() / 1000 - secondes) > TOLERANCE_SECONDES) {
        throw new SignatureInvalide('Notification SasPay trop ancienne.');
      }
      const attendue = crypto.createHmac('sha256', cfg.webhookSecret).update(`${horodatage}.`).update(req.rawBody).digest('hex');
      if (!egaliteConstante(String(signature).toLowerCase(), attendue)) throw new SignatureInvalide('Signature SasPay invalide.');

      const evenement = req.body?.event ?? '';
      const data = req.body?.data ?? {};
      return {
        idEvenement: `${evenement}:${data.id ?? 'sans-id'}:${data.status ?? ''}`,
        // Seuls les événements de transaction concernent un loyer ; webhook.test et les autres sont ignorés.
        referenceExterne: evenement.startsWith('transaction.') ? (data.id ?? null) : null,
      };
    },
  };
}
