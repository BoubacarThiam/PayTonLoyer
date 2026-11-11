import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Banknote } from 'lucide-react';
import { useRequete } from '../../hooks/useRequete.js';
import { EnTete, EtatVide, MessageErreur, SelecteurMois, Squelettes } from '../../components/ui.jsx';
import LigneEcheance, { ModalePaiementManuel } from '../../components/LigneEcheance.jsx';
import { periodeCourante } from '../../utils/format.js';

const FILTRES = [
  { cle: 'tous', libelle: 'Tous' },
  { cle: 'retards', libelle: 'En retard' },
  { cle: 'attente', libelle: 'En attente' },
  { cle: 'payes', libelle: 'Payés' },
];

const STATUT_API = { attente: 'EN_ATTENTE', payes: 'PAYEE' };

export default function Paiements() {
  const [params, setParams] = useSearchParams();
  const filtre = params.get('filtre') || 'tous';
  const [periode, setPeriode] = useState(periodeCourante());
  const [encaisser, setEncaisser] = useState(null);

  // Les retards s'affichent tous mois confondus ; les autres filtres par mois.
  const voirRetards = filtre === 'retards';
  const requete = new URLSearchParams();
  if (voirRetards) requete.set('statut', 'EN_RETARD');
  else {
    requete.set('periode', periode);
    if (STATUT_API[filtre]) requete.set('statut', STATUT_API[filtre]);
  }

  const { donnees, chargement, erreur, recharger } = useRequete(`/echeances?${requete}`);
  const echeances = donnees?.echeances;

  return (
    <>
      <EnTete titre="Paiements" />
      <main className="px-4">
        <div className="mb-3 flex gap-1 rounded-2xl bg-sourdine p-1">
          {FILTRES.map(({ cle, libelle }) => (
            <button
              key={cle}
              type="button"
              aria-pressed={filtre === cle}
              onClick={() => setParams(cle === 'tous' ? {} : { filtre: cle }, { replace: true })}
              className={`min-h-11 flex-auto rounded-[0.875rem] px-1 text-sm font-bold whitespace-nowrap transition-colors ${
                filtre === cle ? 'bg-white text-marque-800 shadow-carte' : 'text-secondaire'
              }`}
            >
              {libelle}
            </button>
          ))}
        </div>

        {!voirRetards && <SelecteurMois periode={periode} surChanger={setPeriode} />}
        <MessageErreur erreur={erreur} surReessayer={recharger} />
        {!echeances && chargement && <Squelettes nombre={3} hauteur="h-36" />}
        {echeances?.length === 0 && (
          <EtatVide
            Icone={Banknote}
            titre={voirRetards ? 'Aucun retard' : 'Aucun loyer'}
            texte={voirRetards ? 'Tous vos locataires sont à jour.' : 'Rien à afficher pour ce mois avec ce filtre.'}
          />
        )}
        <div className="space-y-3">
          {echeances?.map((e) => <LigneEcheance key={e.id} echeance={e} afficherLocataire surEncaisser={setEncaisser} />)}
        </div>
      </main>
      {encaisser && (
        <ModalePaiementManuel
          echeance={encaisser}
          surFermer={() => setEncaisser(null)}
          surEnregistre={() => {
            setEncaisser(null);
            recharger();
          }}
        />
      )}
    </>
  );
}
