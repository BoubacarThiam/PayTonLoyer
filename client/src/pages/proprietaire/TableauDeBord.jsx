import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Building2, CalendarClock, ChevronRight, CircleAlert, MessageCircle, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useRequete } from '../../hooks/useRequete.js';
import { Avatar, Carte, EtatVide, Hero, LienBouton, MessageErreur, SelecteurMois, TitreSection } from '../../components/ui.jsx';
import { fcfa, libellePeriode, nombre, periodeCourante } from '../../utils/format.js';

function Tuile({ libelle, montant, Icone, teinte }) {
  return (
    <Carte>
      <span className={`flex size-10 items-center justify-center rounded-xl ${teinte}`}>
        <Icone size={20} aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-medium text-secondaire">{libelle}</p>
      <p className="font-heading text-[1.3125rem] leading-tight font-extrabold whitespace-nowrap tabular-nums">
        {nombre(montant)}
        <span className="ml-1 text-xs font-bold text-secondaire">FCFA</span>
      </p>
    </Carte>
  );
}

function LienParc({ vers, Icone, valeur, libelle }) {
  return (
    <Link to={vers} className="flex items-center gap-3 rounded-3xl bg-carte p-4 shadow-carte transition-transform active:scale-[0.98]">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-marque-50 text-marque-700">
        <Icone size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="font-heading block text-xl leading-tight font-extrabold">{valeur}</span>
        <span className="block truncate text-sm text-secondaire">{libelle}</span>
      </span>
    </Link>
  );
}

export default function TableauDeBord() {
  const { utilisateur } = useAuth();
  const [periode, setPeriode] = useState(periodeCourante());
  const { donnees: d, erreur, recharger } = useRequete(`/tableau-de-bord?periode=${periode}`);
  const { donnees: retards } = useRequete('/echeances?statut=EN_RETARD');

  const taux = d && d.attendu > 0 ? Math.round((d.encaisse / d.attendu) * 100) : 0;
  const nbLogements = d ? d.nombres.logementsOccupes + d.nombres.logementsLibres : 0;
  const aucunBien = d && nbLogements === 0;
  const aRelancer = retards?.echeances ?? [];
  const prenom = utilisateur.nom.split(' ')[0];

  return (
    <>
      <Hero className={aucunBien ? 'pb-7' : 'pb-20'}>
        <div className="flex items-center gap-3">
          <Avatar nom={utilisateur.nom} sombre />
          <div className="min-w-0">
            <p className="text-sm text-marque-100">Bonjour,</p>
            <h1 className="truncate text-xl font-extrabold">{prenom}</h1>
          </div>
        </div>

        {!aucunBien && (
          <>
            <div className="mt-5">
              <SelecteurMois periode={periode} surChanger={setPeriode} sombre />
            </div>
            <p className="mt-5 text-[15px] text-marque-100">Encaissé ce mois</p>
            {d ? (
              <>
                <p className="font-heading text-[2.625rem] leading-tight font-extrabold tracking-tight tabular-nums">
                  {nombre(d.encaisse)}
                  <span className="ml-2 text-lg font-bold">FCFA</span>
                </p>
                <div
                  className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/20"
                  role="progressbar"
                  aria-valuenow={taux}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Part des loyers encaissés"
                >
                  <div className="h-full rounded-full bg-marque-300 transition-[width] duration-500" style={{ width: `${taux}%` }} />
                </div>
                <p className="mt-2 text-sm text-marque-100">
                  {taux} % encaissé · {d.nombres.payees} loyer{d.nombres.payees > 1 ? 's' : ''} sur {d.nombres.echeances}
                </p>
              </>
            ) : (
              <div className="mt-1 space-y-3" role="status" aria-label="Chargement en cours">
                <div className="squelette-clair h-12 w-56" />
                <div className="squelette-clair h-2.5 w-full" />
              </div>
            )}
          </>
        )}
      </Hero>

      <main className={`relative px-4 ${aucunBien ? '' : '-mt-14'}`}>
        <MessageErreur erreur={erreur} surReessayer={recharger} />

        {aucunBien && (
          <EtatVide Icone={Building2} titre="Bienvenue sur PayTonLoyer" texte="Commencez par ajouter votre premier logement.">
            <LienBouton to="/proprietaire/logements/nouveau">Ajouter un logement</LienBouton>
          </EtatVide>
        )}

        {!aucunBien && (
          <div className="grid grid-cols-2 gap-3">
            {d ? (
              <>
                <Tuile libelle="Loyers attendus" montant={d.attendu} Icone={CalendarClock} teinte="bg-marque-50 text-marque-700" />
                <Tuile libelle="Impayés" montant={d.impaye} Icone={CircleAlert} teinte="bg-retard-fond text-retard-texte" />
              </>
            ) : (
              <>
                <div className="squelette h-32" />
                <div className="squelette h-32" />
              </>
            )}
          </div>
        )}

        {d?.anomalies.length > 0 && (
          <section className="mt-5" aria-labelledby="titre-anomalies">
            <Carte className="ring-1 ring-retard-texte/40">
              <h2 id="titre-anomalies" className="flex items-center gap-2 font-bold text-retard-texte">
                <AlertTriangle size={20} aria-hidden="true" />
                Paiements à vérifier
              </h2>
              <ul className="mt-2 divide-y divide-bordure">
                {d.anomalies.map((a) => (
                  <li key={a.id} className="py-2.5">
                    <p className="font-semibold">
                      {a.echeance.bail.locataire.nom} · <span className="tabular-nums">{fcfa(a.montant)}</span>
                    </p>
                    <p className="text-sm text-secondaire">{a.note}</p>
                    <p className="text-sm break-all text-secondaire">Réf. {a.reference}</p>
                  </li>
                ))}
              </ul>
            </Carte>
          </section>
        )}

        {aRelancer.length > 0 && (
          <section className="mt-5" aria-labelledby="titre-relances">
            <TitreSection
              id="titre-relances"
              action={
                <Link to="/proprietaire/paiements?filtre=retards" className="flex min-h-11 items-center gap-0.5 text-[15px] font-bold text-marque-700">
                  Tout voir
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              }
            >
              À relancer
            </TitreSection>
            <ul className="divide-y divide-bordure overflow-hidden rounded-3xl bg-carte shadow-carte">
              {aRelancer.slice(0, 3).map((e) => (
                <li key={e.id} className="flex items-center gap-3 p-3.5">
                  <Avatar nom={e.bail.locataire.nom} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{e.bail.locataire.nom}</p>
                    <p className="truncate text-sm text-secondaire">
                      <span className="capitalize">{libellePeriode(e.periode).split(' ')[0]}</span> · <span className="font-semibold text-retard-texte tabular-nums">{fcfa(e.montant)}</span>
                    </p>
                  </div>
                  <a
                    href={e.lienWhatsapp}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Relancer ${e.bail.locataire.nom} sur WhatsApp`}
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-marque-700 text-white shadow-bouton transition-transform active:scale-95"
                  >
                    <MessageCircle size={20} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {d && !aucunBien && (
          <section className="mt-5" aria-labelledby="titre-parc">
            <TitreSection id="titre-parc">Mon parc</TitreSection>
            <div className="grid grid-cols-2 gap-3">
              <LienParc vers="/proprietaire/logements" Icone={Building2} valeur={nbLogements} libelle={`${d.nombres.logementsLibres} libre${d.nombres.logementsLibres > 1 ? 's' : ''}`} />
              <LienParc vers="/proprietaire/locataires" Icone={Users} valeur={d.nombres.locatairesActifs} libelle={`Locataire${d.nombres.locatairesActifs > 1 ? 's' : ''}`} />
            </div>
          </section>
        )}
      </main>
    </>
  );
}
