// Page de paiement factice, montée uniquement hors production.
import { Router } from 'express';
import { nonTrouve } from '../middlewares/erreurs.js';
import { traiterWebhook } from '../services/paiements.js';
import { deciderTransaction, lireTransaction } from '../../payments/simulateur.js';
import { RESULTATS } from '../../payments/erreurs.js';
import { LIBELLES_METHODE } from '../constantes.js';
import { formatFCFA } from '../utils/format.js';

const router = Router();

const ISSUES = {
  reussi: RESULTATS.REUSSI,
  echoue: RESULTATS.ECHOUE,
  annule: RESULTATS.ANNULE,
};

router.get('/:token', (req, res) => {
  const t = lireTransaction(req.params.token);
  if (!t) throw nonTrouve('Transaction inconnue.');
  const bouton = (issue, libelle, couleur) =>
    `<form method="post" action="/api/paiements/simulateur/${req.params.token}/${issue}">
      <button style="width:100%;min-height:52px;margin-top:10px;border:0;border-radius:12px;font:600 16px system-ui;color:#fff;background:${couleur}">${libelle}</button>
    </form>`;
  res.type('html').send(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Simulateur de paiement</title></head>
<body style="margin:0;font:16px system-ui;color:#1a2e22;background:#f6f8f6">
<main style="max-width:420px;margin:0 auto;padding:24px 16px">
  <p style="background:#fef3c7;color:#92400e;padding:10px 12px;border-radius:10px">Mode test : aucun argent n’est débité.</p>
  <h1 style="font-size:20px;margin:16px 0 4px">${LIBELLES_METHODE[t.methode]}</h1>
  <p style="font-size:30px;font-weight:700;margin:0 0 12px">${formatFCFA(t.montant)}</p>
  ${bouton('reussi', 'Valider le paiement', '#047857')}
  ${bouton('echoue', 'Simuler un échec', '#991b1b')}
  ${bouton('annule', 'Annuler', '#526058')}
</main></body></html>`);
});

router.post('/:token/:issue', async (req, res) => {
  const statut = ISSUES[req.params.issue];
  const t = lireTransaction(req.params.token);
  if (!statut || !t) throw nonTrouve('Transaction inconnue.');

  const corps = deciderTransaction(req.params.token, statut);
  await traiterWebhook('simulateur', { body: corps });
  res.redirect(303, statut === RESULTATS.ANNULE ? t.urls.annulation : t.urls.retour);
});

export default router;
