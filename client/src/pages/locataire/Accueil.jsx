import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronRight, ImageOff, KeyRound, MapPin, Phone } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useRequete } from '../../hooks/useRequete.js';
import { Avatar, BadgeStatut, EtatVide, Hero, LienBouton, MessageErreur, Squelettes, TitreSection } from '../../components/ui.jsx';
import { PastilleMois } from '../../components/LigneEcheance.jsx';
import { dateFr, dePeriode, fcfa, libellePeriode, nombre, telephoneLisible, TYPES_LOGEMENT } from '../../utils/format.js';

function BlocEcheance({ echeance: e, totalRetard }) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[15px] text-marque-100">Loyer {dePeriode(e.periode)}</p>
        <BadgeStatut statut={e.statutReel} />
      </div>
      <p className="font-heading mt-1 text-[2.625rem] leading-tight font-extrabold tracking-tight tabular-nums">
        {nombre(e.montant)}
        <span className="ml-2 text-lg font-bold">FCFA</span>
      </p>
      <p className="text-[15px] text-marque-100">
        {e.statutReel === 'EN_RETARD' ? 'Était dû le' : 'À payer avant le'} {dateFr(e.dateEcheance)}
      </p>
      {totalRetard > e.montant && (
        <p className="mt-3 flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold">
          <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
          <span>{fcfa(totalRetard)} en retard au total</span>
        </p>
      )}
      <div className="mt-5">
        <LienBouton variante="blanc" to={`/locataire/payer/${e.id}`}>Payer maintenant</LienBouton>
      </div>
    </div>
  );
}

export default function Accueil() {
  const { utilisateur } = useAuth();
  const { donnees: d, chargement, erreur, recharger } = useRequete('/locataire/accueil');
  const autres = d?.echeancesImpayees.slice(1) ?? [];
  const photo = d?.logement?.photos[0];
  const prenom = utilisateur.nom.split(' ')[0];

  return (
    <>
      <Hero className="pb-8">
        <div className="flex items-center gap-3">
          <Avatar nom={utilisateur.nom} sombre />
          <div className="min-w-0">
            <p className="text-sm text-marque-100">Bonjour,</p>
            <h1 className="truncate text-xl font-extrabold">{prenom}</h1>
          </div>
        </div>
        {!d && chargement && (
          <div className="mt-6 space-y-3" role="status" aria-label="Chargement en cours">
            <div className="squelette-clair h-5 w-40" />
            <div className="squelette-clair h-12 w-56" />
            <div className="squelette-clair h-[3.25rem] w-full" />
          </div>
        )}
        {d?.prochaineEcheance && <BlocEcheance echeance={d.prochaineEcheance} totalRetard={d.totalRetard} />}
        {d && !d.prochaineEcheance && d.logement && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/10 p-4">
            <CheckCircle2 size={24} className="shrink-0" aria-hidden="true" />
            <p className="font-bold">Vous êtes à jour de vos loyers.</p>
          </div>
        )}
      </Hero>

      <main className="px-4 pt-5">
        <MessageErreur erreur={erreur} surReessayer={recharger} />
        {!d && chargement && <Squelettes nombre={1} hauteur="h-56" />}

        {d && !d.logement && !d.prochaineEcheance && (
          <EtatVide Icone={KeyRound} titre="Aucun logement pour le moment" texte="Votre propriétaire ne vous a pas encore affecté de logement." />
        )}

        {autres.length > 0 && (
          <section className="mb-5" aria-labelledby="titre-autres">
            <TitreSection id="titre-autres">Autres loyers à régler</TitreSection>
            <ul className="divide-y divide-bordure overflow-hidden rounded-3xl bg-carte shadow-carte">
              {autres.map((e) => (
                <li key={e.id}>
                  <Link to={`/locataire/payer/${e.id}`} className="flex items-center gap-3 p-3.5 transition-colors active:bg-marque-50">
                    <PastilleMois periode={e.periode} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold capitalize">{libellePeriode(e.periode).split(' ')[0]}</span>
                      <span className="block text-sm text-secondaire tabular-nums">{fcfa(e.montant)}</span>
                    </span>
                    <BadgeStatut statut={e.statutReel} />
                    <ChevronRight size={20} className="shrink-0 text-secondaire" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {d?.logement && (
          <section aria-labelledby="titre-logement">
            <TitreSection id="titre-logement">Mon logement</TitreSection>
            <div className="overflow-hidden rounded-3xl bg-carte shadow-carte">
              <div className="flex aspect-[16/9] items-center justify-center bg-marque-100 text-marque-700">
                {photo ? (
                  <img src={photo.url} alt={`Photo de ${d.logement.nom}`} loading="lazy" className="size-full object-cover" />
                ) : (
                  <ImageOff size={32} aria-hidden="true" />
                )}
              </div>
              <div className="p-4">
                <p className="text-[1.0625rem] font-bold">{d.logement.nom}</p>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-secondaire">
                  <MapPin size={16} className="shrink-0" aria-hidden="true" />
                  <span>{TYPES_LOGEMENT[d.logement.type]} · {d.logement.adresse}</span>
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-sm text-secondaire">Loyer mensuel</dt>
                    <dd className="font-bold tabular-nums">{fcfa(d.bail.loyerMensuel)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-secondaire">Échéance</dt>
                    <dd className="font-bold">Le {d.bail.jourEcheance} du mois</dd>
                  </div>
                </dl>
                {d.proprietaire && (
                  <div className="mt-4 flex items-center gap-3 border-t border-bordure pt-4">
                    <Avatar nom={d.proprietaire.nom} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{d.proprietaire.nom}</p>
                      <p className="text-sm text-secondaire">{telephoneLisible(d.proprietaire.telephone)}</p>
                    </div>
                    <a href={`tel:${d.proprietaire.telephone}`} aria-label={`Appeler ${d.proprietaire.nom}`} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-marque-700 text-white shadow-bouton transition-transform active:scale-95">
                      <Phone size={20} aria-hidden="true" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
