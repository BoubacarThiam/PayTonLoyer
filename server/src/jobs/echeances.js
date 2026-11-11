import cron from 'node-cron';
import { genererToutesLesEcheances } from '../services/echeances.js';

async function executer() {
  try {
    const creees = await genererToutesLesEcheances();
    if (creees > 0) console.log(`Échéances générées : ${creees}`);
  } catch (erreur) {
    console.error('Échec de la génération des échéances', erreur);
  }
}

// Au démarrage pour rattraper un arrêt du serveur, puis chaque nuit.
export function demarrerJobEcheances() {
  executer();
  cron.schedule('10 0 * * *', executer, { timezone: 'Africa/Dakar' });
}
