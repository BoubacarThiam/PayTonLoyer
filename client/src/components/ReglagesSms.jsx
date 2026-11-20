import { useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { api } from '../api/client.js';
import { useRequete } from '../hooks/useRequete.js';
import { Carte, MessageErreur } from './ui.jsx';
import { telephoneLisible } from '../utils/format.js';

const LIBELLES = {
  RAPPEL_RETARD: 'Rappel automatique',
  RELANCE_MANUELLE: 'Relance',
  CODE_PROVISOIRE: 'Code provisoire',
  CONFIRMATION_PAIEMENT: 'Paiement reçu',
};

// Réglage des SMS automatiques du propriétaire, avec le nombre envoyé ce mois-ci (chaque SMS est facturé).
export default function ReglagesSms() {
  const { donnees, erreur, recharger } = useRequete('/sms');
  const [etat, setEtat] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreurMaj, setErreurMaj] = useState(null);
  const d = etat ?? donnees;

  async function basculer() {
    setEnvoi(true);
    setErreurMaj(null);
    try {
      setEtat(await api.put('/sms/preferences', { smsAutomatiques: !d.smsAutomatiques }));
    } catch (err) {
      setErreurMaj(err);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Carte>
      <MessageErreur erreur={erreur || erreurMaj} surReessayer={erreur ? recharger : undefined} />
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-marque-50 text-marque-700">
          <MessageSquareText size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p id="titre-sms" className="font-bold">SMS automatiques</p>
          <p id="aide-sms" className="text-sm text-secondaire">
            Rappel aux locataires en retard (9 h, au plus une fois par semaine) et confirmation des paiements reçus.
          </p>
        </div>
        {d && (
          <button
            type="button"
            role="switch"
            aria-checked={d.smsAutomatiques}
            aria-labelledby="titre-sms"
            aria-describedby="aide-sms"
            disabled={envoi}
            onClick={basculer}
            className={`relative mt-1 h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-60 ${d.smsAutomatiques ? 'bg-marque-700' : 'bg-contour'}`}
          >
            <span className={`absolute top-1 left-0 size-6 rounded-full bg-white shadow transition-transform ${d.smsAutomatiques ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        )}
      </div>

      {d && (
        <div className="mt-4 border-t border-bordure pt-3 text-sm">
          {d.modeTest && (
            <p className="mb-2 rounded-xl bg-attente-fond p-2.5 font-semibold text-attente-texte">Mode test : aucun SMS réel n’est envoyé.</p>
          )}
          <p className="text-secondaire">
            <strong className="text-texte">{d.ceMois}</strong> SMS envoyé{d.ceMois > 1 ? 's' : ''} ce mois-ci
          </p>
          {d.derniers.length > 0 && (
            <ul className="mt-2 space-y-1">
              {d.derniers.map((n) => (
                <li key={n.id} className="flex justify-between gap-2 text-secondaire">
                  <span className="truncate">
                    {LIBELLES[n.type]} · {telephoneLisible(n.telephone)}
                  </span>
                  <span className={`shrink-0 font-semibold ${n.statut === 'ENVOYE' ? 'text-succes-texte' : 'text-retard-texte'}`} title={n.erreur ?? ''}>
                    {n.statut === 'ENVOYE' ? 'Envoyé' : 'Échec'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Carte>
  );
}
