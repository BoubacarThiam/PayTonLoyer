import cron from 'node-cron';
import { envoyerRappelsRetard } from '../services/sms.js';

// Chaque matin à 9 h (heure de Dakar) : jamais de SMS la nuit.
export function demarrerJobRappelsSms() {
  cron.schedule(
    '0 9 * * *',
    async () => {
      try {
        const envoyes = await envoyerRappelsRetard();
        if (envoyes > 0) console.log(`Rappels de retard envoyés par SMS : ${envoyes}`);
      } catch (erreur) {
        console.error('Échec des rappels SMS', erreur);
      }
    },
    { timezone: 'Africa/Dakar' },
  );
}
