import { History } from 'lucide-react';
import { useRequete } from '../../hooks/useRequete.js';
import { BadgeStatut, Carte, EnTete, EtatVide, LienBouton, MessageErreur, Squelettes } from '../../components/ui.jsx';
import { LienQuittance, PastilleMois } from '../../components/LigneEcheance.jsx';
import { dateFr, fcfa, libellePeriode, METHODES } from '../../utils/format.js';

export default function Historique() {
  const { donnees, chargement, erreur, recharger } = useRequete('/locataire/historique');
  const echeances = donnees?.echeances;
  return (
    <>
      <EnTete titre="Historique" />
      <main className="px-4">
        <MessageErreur erreur={erreur} surReessayer={recharger} />
        {!echeances && chargement && <Squelettes nombre={4} hauteur="h-32" />}
        {echeances?.length === 0 && <EtatVide Icone={History} titre="Aucun paiement" texte="Vos loyers et quittances apparaîtront ici." />}
        <div className="space-y-3">
          {echeances?.map((e) => {
            const impayee = e.statutReel !== 'PAYEE';
            return (
              <Carte key={e.id}>
                <div className="flex items-center gap-3">
                  <PastilleMois periode={e.periode} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold capitalize">{libellePeriode(e.periode)}</p>
                    <p className="truncate text-sm text-secondaire">
                      {e.paiement ? `${dateFr(e.paiement.datePaiement)} · ${METHODES[e.paiement.methode]}` : `Échéance : ${dateFr(e.dateEcheance)}`}
                    </p>
                  </div>
                  <p className="font-heading text-[1.0625rem] font-extrabold whitespace-nowrap tabular-nums">{fcfa(e.montant)}</p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <BadgeStatut statut={e.statutReel} />
                  {impayee ? (
                    <LienBouton taille="petite" pleine={false} to={`/locataire/payer/${e.id}`}>Payer</LienBouton>
                  ) : (
                    <LienQuittance quittance={e.quittance} taille="petite" pleine={false} />
                  )}
                </div>
              </Carte>
            );
          })}
        </div>
      </main>
    </>
  );
}
