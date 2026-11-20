// Fournisseur factice : n'envoie rien, affiche le SMS dans le terminal du serveur.
// Utilisé par défaut, en développement et dans les tests (les envois sont gardés en mémoire).
import crypto from 'node:crypto';

export const smsEnvoyes = [];

export const consoleSms = {
  nom: 'console',
  async envoyer({ telephone, message }) {
    const idExterne = `console-${crypto.randomUUID()}`;
    smsEnvoyes.push({ telephone, message, idExterne });
    if (process.env.NODE_ENV !== 'test') console.log(`[SMS simulé] → ${telephone} : ${message}`);
    return { idExterne };
  },
};
