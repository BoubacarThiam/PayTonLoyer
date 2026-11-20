import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Circle, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client.js';
import { useRequete } from '../../hooks/useRequete.js';
import { Bouton, EnTete, EtatVide, MessageErreur, Squelettes } from '../../components/ui.jsx';
import { dePeriode, fcfa, nombre } from '../../utils/format.js';
import { PASTILLES } from '../../utils/moyens.js';
import Equivalents from '../../components/Equivalents.jsx';

export default function Payer() {
  const { echeanceId } = useParams();
  const { donnees, chargement, erreur: erreurChargement, recharger } = useRequete('/locataire/accueil');
  const { donnees: dispo, erreur: erreurMethodes } = useRequete('/paiements/methodes');
  const [methode, setMethode] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  const echeance = donnees?.echeancesImpayees.find((e) => e.id === echeanceId);

  async function payer() {
    setErreur(null);
    setEnvoi(true);
    try {
      const { urlPaiement } = await api.post('/paiements/initier', { echeanceId, methode });
      // Le bouton reste en chargement pendant la redirection vers la page de paiement.
      window.location.assign(urlPaiement);
    } catch (err) {
      setErreur(err);
      setEnvoi(false);
    }
  }

  return (
    <>
      <EnTete titre="Payer mon loyer" retour="/locataire" />
      <main className="px-4">
        <MessageErreur erreur={erreurChargement || erreurMethodes} surReessayer={recharger} />
        {!donnees && chargement && <Squelettes />}
        {donnees && !echeance && <EtatVide Icone={CheckCircle2} titre="Rien à payer ici" texte="Ce loyer est déjà réglé ou n’existe pas." />}
        {echeance && (
          <>
            <div className="hero mb-6 rounded-3xl p-5 text-center">
              <p className="text-[15px] text-marque-100">Loyer {dePeriode(echeance.periode)}</p>
              <p className="font-heading text-[2.375rem] leading-tight font-extrabold tracking-tight tabular-nums">
                {nombre(echeance.montant)}
                <span className="ml-2 text-base font-bold">FCFA</span>
              </p>
              <Equivalents montant={echeance.montant} className="mt-1 text-sm text-marque-100" />
            </div>

            <fieldset className="mb-6">
              <legend className="mb-3 px-1 text-[1.0625rem] font-bold">Choisissez votre moyen de paiement</legend>
              <div className="space-y-2.5">
                {dispo?.methodes.map((m) => {
                  const choisie = methode === m.code;
                  const pastille = PASTILLES[m.code];
                  return (
                    <label
                      key={m.code}
                      className={`flex min-h-[4.25rem] cursor-pointer items-center gap-3 rounded-2xl px-3.5 shadow-carte ring-2 transition-[box-shadow,background-color] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-marque-700 ${
                        choisie ? 'bg-marque-50 ring-marque-700' : 'bg-white ring-transparent'
                      }`}
                    >
                      <input type="radio" name="methode" value={m.code} checked={choisie} onChange={() => setMethode(m.code)} className="sr-only" />
                      <span aria-hidden="true" className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${pastille.classes}`}>
                        {pastille.sigle}
                      </span>
                      <span className="flex-1 font-bold">{m.libelle}</span>
                      {choisie ? <CheckCircle2 size={24} className="text-marque-700" aria-hidden="true" /> : <Circle size={24} className="text-contour" aria-hidden="true" />}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <MessageErreur erreur={erreur} />
            <Bouton onClick={payer} disabled={!methode} chargement={envoi}>
              {envoi ? 'Redirection…' : `Payer ${fcfa(echeance.montant)}`}
            </Bouton>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-secondaire">
              <ShieldCheck size={16} aria-hidden="true" />
              Vous validerez le paiement sur votre téléphone ou sur la page sécurisée.
            </p>
          </>
        )}
      </main>
    </>
  );
}
