import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, SearchX } from 'lucide-react';
import { useRequete } from '../hooks/useRequete.js';
import { Carte, EtatVide, Squelettes } from '../components/ui.jsx';
import { dateFr, fcfa, libellePeriode, METHODES } from '../utils/format.js';

// Page publique ouverte depuis le QR code d'une quittance. Elle n'affiche que des initiales.
export default function Verifier() {
  const { numero } = useParams();
  const { donnees, chargement, erreur } = useRequete(`/quittances/verifier/${encodeURIComponent(numero)}`);
  const q = donnees?.quittance;

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 py-8">
      <Link to="/" className="mb-6 flex min-h-11 items-center gap-2.5 font-heading text-lg font-extrabold">
        <img src="/logo/monogramme-bleu.png" alt="" width="44" height="26" className="h-7 w-auto" />
        PayTonLoyer
      </Link>

      {chargement && !q && <Squelettes nombre={1} hauteur="h-72" />}

      {erreur && (
        <EtatVide Icone={SearchX} titre="Quittance introuvable" texte={`Aucune quittance PayTonLoyer ne porte le numéro ${numero}. Elle n’a pas été émise par PayTonLoyer, ou le numéro est incorrect.`} />
      )}

      {q && (
        <Carte className="p-6">
          <div className="flex items-center gap-3 rounded-2xl bg-succes-fond p-4 text-succes-texte">
            <BadgeCheck size={32} className="shrink-0" aria-hidden="true" />
            <div>
              <h1 className="text-lg font-extrabold">Quittance authentique</h1>
              <p className="text-sm">Émise par PayTonLoyer le {dateFr(q.emiseLe)}</p>
            </div>
          </div>
          <dl className="mt-5 space-y-3">
            {[
              ['Numéro', q.numero],
              ['Loyer', <span key="p" className="capitalize">{libellePeriode(q.periode)}</span>],
              ['Montant', fcfa(q.montant)],
              ['Payé le', `${dateFr(q.datePaiement)} · ${METHODES[q.methode]}`],
              ['Bailleur', q.bailleur],
              ['Locataire', q.locataire],
            ].map(([terme, valeur]) => (
              <div key={terme} className="flex justify-between gap-4 border-b border-bordure pb-3 last:border-0">
                <dt className="text-secondaire">{terme}</dt>
                <dd className="text-right font-bold">{valeur}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-secondaire">Par confidentialité, seules les initiales du bailleur et du locataire sont affichées.</p>
        </Carte>
      )}
    </main>
  );
}
