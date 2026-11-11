import { Link } from 'react-router-dom';
import { Building2, ImageOff, MapPin, Plus } from 'lucide-react';
import { useRequete } from '../../hooks/useRequete.js';
import { Avatar, EnTete, EtatVide, LienBouton, MessageErreur, Squelettes } from '../../components/ui.jsx';
import { nombre, TYPES_LOGEMENT } from '../../utils/format.js';

function CarteLogement({ logement: l }) {
  const photo = l.photos[0];
  const libre = l.statut === 'LIBRE';
  return (
    <Link to={`/proprietaire/logements/${l.id}`} className="block overflow-hidden rounded-3xl bg-carte shadow-carte transition-transform active:scale-[0.99]">
      <div className="relative flex aspect-[16/9] items-center justify-center bg-marque-100 text-marque-700">
        {photo ? (
          <img src={photo.url} alt="" loading="lazy" width="640" height="360" className="size-full object-cover" />
        ) : (
          <ImageOff size={32} aria-hidden="true" />
        )}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[13px] font-bold shadow-carte">
          <span aria-hidden="true" className={`size-2 rounded-full ${libre ? 'bg-amber-500' : 'bg-marque-600'}`} />
          {libre ? 'Libre' : 'Occupé'}
        </span>
        <span className="absolute right-3 bottom-3 rounded-full bg-marque-950/85 px-3 py-1 text-[13px] font-semibold text-white">{TYPES_LOGEMENT[l.type]}</span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate text-[1.0625rem] font-bold">{l.nom}</p>
          <p className="font-heading shrink-0 text-right leading-tight font-extrabold text-marque-800 tabular-nums">
            {nombre(l.loyerMensuel)}
            <span className="block text-xs font-semibold text-secondaire">FCFA / mois</span>
          </p>
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-secondaire">
          <MapPin size={16} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{l.adresse}</span>
        </p>
        <div className="mt-3 flex min-h-8 items-center gap-2 border-t border-bordure pt-3 text-sm font-semibold">
          {l.locataireActuel ? (
            <>
              <Avatar nom={l.locataireActuel.nom} taille="size-8 text-xs" />
              <span className="truncate">{l.locataireActuel.nom}</span>
            </>
          ) : (
            <span className="text-secondaire">Aucun locataire</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Logements() {
  const { donnees, chargement, erreur, recharger } = useRequete('/logements');
  const logements = donnees?.logements;
  return (
    <>
      <EnTete
        titre="Mes logements"
        action={
          <Link to="/proprietaire/logements/nouveau" aria-label="Ajouter un logement" className="flex size-11 items-center justify-center rounded-full bg-marque-700 text-white shadow-bouton transition-transform active:scale-95">
            <Plus size={24} aria-hidden="true" />
          </Link>
        }
      />
      <main className="px-4">
        <MessageErreur erreur={erreur} surReessayer={recharger} />
        {!logements && chargement && <Squelettes nombre={3} hauteur="h-72" />}
        {logements?.length === 0 && (
          <EtatVide Icone={Building2} titre="Aucun logement" texte="Ajoutez vos logements pour suivre leurs loyers.">
            <LienBouton to="/proprietaire/logements/nouveau">Ajouter un logement</LienBouton>
          </EtatVide>
        )}
        <div className="space-y-4">
          {logements?.map((l) => <CarteLogement key={l.id} logement={l} />)}
        </div>
      </main>
    </>
  );
}
