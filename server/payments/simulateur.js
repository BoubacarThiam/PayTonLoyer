// Fournisseur factice : même interface qu'un vrai agrégateur, sans clé ni réseau.
// Sert à la démonstration et aux tests. Son activation est refusée en production.
import crypto from 'node:crypto';
import { config } from '../src/config.js';
import { ErreurFournisseur, RESULTATS, SignatureInvalide } from './erreurs.js';

const transactions = new Map();

const signer = (token, statut) =>
  crypto.createHmac('sha256', config.jwtSecret).update(`${token}:${statut}`).digest('hex');

export const lireTransaction = (token) => transactions.get(token);

// Simule la décision de l'opérateur et renvoie le corps du webhook correspondant.
export function deciderTransaction(token, statut, montantRecu) {
  const transaction = transactions.get(token);
  if (!transaction) return null;
  transaction.statut = statut;
  if (montantRecu !== undefined) transaction.montant = montantRecu;
  return { token, statut, signature: signer(token, statut) };
}

// Permet aux tests de simuler une panne de l'agrégateur.
export const controleSimulateur = { enPanne: false };

export const simulateur = {
  nom: 'simulateur',
  methodes: ['WAVE', 'ORANGE_MONEY', 'FREE_MONEY'],

  async initierPaiement({ reference, montant, methode, urls }) {
    if (controleSimulateur.enPanne) throw new ErreurFournisseur('Simulateur en panne.');
    const token = `sim_${crypto.randomUUID()}`;
    transactions.set(token, { reference, montant, methode, urls, statut: RESULTATS.EN_ATTENTE });
    return { referenceExterne: token, urlPaiement: `${config.clientUrl}/api/paiements/simulateur/${token}` };
  },

  async verifierPaiement(token) {
    const transaction = transactions.get(token);
    if (!transaction) throw new ErreurFournisseur('Transaction inconnue du simulateur.');
    return { statut: transaction.statut, montant: transaction.montant };
  },

  webhook(req) {
    const { token, statut, signature } = req.body ?? {};
    if (!token || !statut || !signature) throw new SignatureInvalide('Notification incomplète.');
    const attendu = Buffer.from(signer(token, statut));
    const recu = Buffer.from(String(signature));
    if (attendu.length !== recu.length || !crypto.timingSafeEqual(attendu, recu)) {
      throw new SignatureInvalide('Signature invalide.');
    }
    return { idEvenement: `${token}:${statut}`, referenceExterne: token };
  },
};
