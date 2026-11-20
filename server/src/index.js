import { config } from './config.js';
import { creerApp } from './app.js';
import { demarrerJobEcheances } from './jobs/echeances.js';
import { demarrerJobRappelsSms } from './jobs/sms.js';
import { fournisseurSms } from '../sms/index.js';
import { fournisseurActif } from '../payments/index.js';

// Échoue dès le démarrage si le fournisseur est mal configuré.
console.log(`Fournisseur de paiement : ${fournisseurActif().nom}`);
console.log(`Fournisseur SMS : ${fournisseurSms().nom}`);

creerApp().listen(config.port, () => {
  console.log(`PayTonLoyer API : http://localhost:${config.port}`);
  demarrerJobEcheances();
  demarrerJobRappelsSms();
});
