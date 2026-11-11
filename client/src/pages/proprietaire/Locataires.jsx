import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ChevronRight, Plus, Users } from 'lucide-react';
import { useRequete } from '../../hooks/useRequete.js';
import { Avatar, EnTete, EtatVide, LienBouton, MessageErreur, Squelettes } from '../../components/ui.jsx';
import { fcfa } from '../../utils/format.js';

function Situation({ locataire: l }) {
  if (l.retards.nombre > 0) {
    return (
      <p className="mt-1 flex items-center gap-1 text-sm font-bold text-retard-texte">
        <AlertCircle size={16} aria-hidden="true" />
        <span className="tabular-nums">{fcfa(l.retards.montant)}</span> en retard
      </p>
    );
  }
  if (!l.bailActif) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-succes-texte">
      <CheckCircle2 size={16} aria-hidden="true" />À jour
    </p>
  );
}

export default function Locataires() {
  const { donnees, chargement, erreur, recharger } = useRequete('/locataires');
  const locataires = donnees?.locataires;
  return (
    <>
      <EnTete
        titre="Mes locataires"
        action={
          <Link to="/proprietaire/locataires/nouveau" aria-label="Ajouter un locataire" className="flex size-11 items-center justify-center rounded-full bg-marque-700 text-white shadow-bouton transition-transform active:scale-95">
            <Plus size={24} aria-hidden="true" />
          </Link>
        }
      />
      <main className="px-4">
        <MessageErreur erreur={erreur} surReessayer={recharger} />
        {!locataires && chargement && <Squelettes nombre={4} hauteur="h-24" />}
        {locataires?.length === 0 && (
          <EtatVide Icone={Users} titre="Aucun locataire" texte="Ajoutez un locataire et affectez-le à un logement.">
            <LienBouton to="/proprietaire/locataires/nouveau">Ajouter un locataire</LienBouton>
          </EtatVide>
        )}
        <div className="space-y-3">
          {locataires?.map((l) => (
            <Link key={l.id} to={`/proprietaire/locataires/${l.id}`} className="flex items-center gap-3 rounded-3xl bg-carte p-4 shadow-carte transition-transform active:scale-[0.99]">
              <Avatar nom={l.nom} taille="size-[3.25rem] text-base" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{l.nom}</p>
                <p className="truncate text-sm text-secondaire">{l.bailActif ? l.bailActif.logement.nom : 'Sans logement'}</p>
                <Situation locataire={l} />
              </div>
              <ChevronRight size={20} className="shrink-0 text-secondaire" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
