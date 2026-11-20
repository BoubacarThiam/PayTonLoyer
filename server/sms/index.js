// Point d'entrée des SMS. Tout fournisseur expose :
//   nom
//   envoyer({ telephone, message }) -> { idExterne }   (lève ErreurFournisseur en cas d'échec)
// SMS_FOURNISSEUR=console (défaut, rien n'est envoyé) ou orange (Orange Developer, offre Sénégal).
import { config } from '../src/config.js';
import { consoleSms } from './console.js';
import { creerOrangeSms } from './orange.js';

const FOURNISSEURS = {
  console: () => consoleSms,
  orange: () => creerOrangeSms(config.sms.orange),
};

let instance = null;

export function fournisseurSms() {
  if (!instance) {
    const nom = config.sms.fournisseur;
    if (!FOURNISSEURS[nom]) throw new Error(`Fournisseur SMS inconnu : ${nom}`);
    instance = FOURNISSEURS[nom]();
  }
  return instance;
}
