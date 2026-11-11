import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { api } from '../../api/client.js';
import { Bouton, EnTete, EtatVide, LienBouton, MessageErreur, Squelettes } from '../../components/ui.jsx';
import { LienQuittance } from '../../components/LigneEcheance.jsx';
import { dateFr, fcfa, libellePeriode, METHODES } from '../../utils/format.js';

const NB_ESSAIS = 6;
const DELAI_MS = 3000;

// La référence est dans le chemin : certains agrégateurs ajoutent leur propre « ?token= » à l'URL de retour.
export default function RetourPaiement({ annule = false }) {
  const { reference } = useParams();
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [recherche, setRecherche] = useState(true);
  const minuteur = useRef(null);

  const interroger = useCallback(
    async (essai = 1) => {
      setErreur(null);
      setRecherche(true);
      try {
        const r = annule
          ? await api.post(`/paiements/${encodeURIComponent(reference)}/annuler`)
          : await api.get(`/paiements/${encodeURIComponent(reference)}`);
        setResultat(r);
        // La confirmation de l'opérateur peut prendre quelques secondes.
        if (r.paiement.statut === 'INITIE' && essai < NB_ESSAIS) {
          minuteur.current = setTimeout(() => interroger(essai + 1), DELAI_MS);
          return;
        }
      } catch (err) {
        setErreur(err);
      }
      setRecherche(false);
    },
    [reference, annule],
  );

  useEffect(() => {
    interroger();
    return () => clearTimeout(minuteur.current);
  }, [interroger]);

  const statut = resultat?.paiement.statut;
  const accueil = <LienBouton variante="neutre" to="/locataire">Retour à l’accueil</LienBouton>;
  const reessayer = <LienBouton to={`/locataire/payer/${resultat?.echeance.id}`}>Réessayer le paiement</LienBouton>;

  return (
    <>
      <EnTete titre="Paiement" />
      <main className="px-4">
        <MessageErreur erreur={erreur} surReessayer={() => interroger()} />
        {!resultat && recherche && <Squelettes nombre={1} hauteur="h-48" />}

        {statut === 'REUSSI' && (
          <div className="pt-4">
            <div className="rounded-3xl bg-carte p-6 text-center shadow-carte">
              <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-marque-700 text-white shadow-bouton">
                <CheckCircle2 size={32} aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-xl font-extrabold">Paiement réussi</h2>
              <p className="font-heading mt-1 text-[2rem] leading-tight font-extrabold tracking-tight tabular-nums">{fcfa(resultat.paiement.montant)}</p>
              <dl className="mt-5 space-y-2.5 border-t border-dashed border-contour pt-5 text-left">
                <div className="flex justify-between gap-3">
                  <dt className="text-secondaire">Loyer</dt>
                  <dd className="font-bold capitalize">{libellePeriode(resultat.echeance.periode)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-secondaire">Moyen</dt>
                  <dd className="font-bold">{METHODES[resultat.paiement.methode]}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-secondaire">Date</dt>
                  <dd className="font-bold">{dateFr(resultat.paiement.datePaiement)}</dd>
                </div>
              </dl>
            </div>
            <div className="mt-4 space-y-2.5">
              <LienQuittance quittance={resultat.quittance} />
              {accueil}
            </div>
          </div>
        )}
        {statut === 'INITIE' && (
          <EtatVide Icone={Clock} titre="Confirmation en cours" texte={recherche ? 'Nous attendons la réponse de votre opérateur…' : 'La réponse tarde à arriver. Si vous avez validé le paiement, il sera pris en compte automatiquement.'}>
            <div className="space-y-2">
              {!recherche && <Bouton onClick={() => interroger()}>Vérifier à nouveau</Bouton>}
              {accueil}
            </div>
          </EtatVide>
        )}
        {(statut === 'ECHOUE' || statut === 'ANNULE') && (
          <EtatVide Icone={XCircle} titre={statut === 'ECHOUE' ? 'Paiement échoué' : 'Paiement annulé'} texte={statut === 'ECHOUE' ? 'Aucun montant n’a été débité pour ce loyer. Vous pouvez réessayer.' : 'Vous avez annulé le paiement. Votre loyer reste à régler.'}>
            <div className="space-y-2">
              {reessayer}
              {accueil}
            </div>
          </EtatVide>
        )}
        {statut === 'ANOMALIE' && (
          <EtatVide Icone={Clock} titre="Paiement à vérifier" texte={`Ce paiement n’a pas pu être affecté automatiquement. Contactez votre propriétaire avec la référence ${resultat.paiement.reference}.`}>
            {accueil}
          </EtatVide>
        )}
      </main>
    </>
  );
}
