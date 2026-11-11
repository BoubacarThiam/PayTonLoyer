import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ArrowRight, BellRing, CalendarCheck, Check, ChevronDown, FileText, HandCoins, Heart, LayoutDashboard, Pause, Play, Smartphone, X } from 'lucide-react';
import { Bandeau, CinematicFooter, MagneticButton } from '@/components/ui/motion-footer';
import { PASTILLES } from '@/utils/moyens.js';
import { TelephoneLocataire, TelephoneProprietaire } from './Maquettes.jsx';
import AnimationMarque from './AnimationMarque.jsx';

const LARGEUR = 'mx-auto w-full max-w-6xl px-5 lg:px-8';
const BOUTON_PLEIN = 'flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-5 text-center text-[15px] font-bold text-marque-950 sm:px-8 sm:text-base shadow-[0_10px_40px_-10px_rgb(52_211_153/0.6)]';
const BOUTON_VERRE = 'cine-pilule flex min-h-14 items-center justify-center gap-2 rounded-full px-8 font-bold text-white';
const TITRE_SECTION = 'cine-metal max-w-2xl text-[2.125rem] leading-tight font-extrabold tracking-tight text-balance lg:text-5xl';

const BANDEAU = ['Échéances automatiques', 'Wave', 'Rappels WhatsApp', 'Orange Money', 'Quittances PDF', 'Free Money', 'Paiements en espèces'];

const FONCTIONS = [
  { Icone: LayoutDashboard, titre: 'Un tableau de bord clair', texte: 'Loyers attendus, encaissés et impayés du mois, visibles en un coup d’œil.', classes: 'lg:col-span-2 bg-gradient-to-br from-marque-700/50 to-marque-900/40' },
  { Icone: CalendarCheck, titre: 'Échéances automatiques', texte: 'Chaque mois, les loyers à venir sont créés sans aucune saisie.' },
  { Icone: Smartphone, titre: 'Paiement Mobile Money', texte: 'Vos locataires paient par Wave, Orange Money ou Free Money.' },
  { Icone: BellRing, titre: 'Rappels WhatsApp', texte: 'Un message poli et déjà rédigé, prêt à envoyer au locataire en retard.' },
  { Icone: FileText, titre: 'Quittances PDF', texte: 'Générées dès que le loyer est réglé, disponibles pour les deux parties.' },
  { Icone: HandCoins, titre: 'Espèces aussi', texte: 'Un paiement reçu en main propre s’enregistre en quelques secondes, avec sa quittance.', classes: 'lg:col-span-3 bg-gradient-to-r from-marque-700/40 to-transparent' },
];

const COMPARAISON = [
  ['Un carnet qui finit par se perdre', 'Chaque paiement enregistré et retrouvable'],
  ['Des appels pour réclamer le loyer', 'Un rappel WhatsApp prêt à envoyer'],
  ['Des reçus écrits à la main', 'Une quittance PDF générée automatiquement'],
];

const ETAPES = [
  ['Ajoutez vos logements', 'Adresse, loyer et photos : votre parc est en place en quelques minutes.'],
  ['Affectez vos locataires', 'Chacun reçoit un code provisoire, que vous pouvez lui envoyer par WhatsApp.'],
  ['Suivez vos encaissements', 'Les échéances se créent seules. Vous voyez qui a payé et qui relancer.'],
];

const QUESTIONS = [
  ['Faut-il installer une application ?', 'Non. PayTonLoyer s’ouvre dans le navigateur du téléphone et peut être ajouté à l’écran d’accueil comme une application.'],
  ['Comment mes locataires se connectent-ils ?', 'Avec leur numéro de téléphone et un code provisoire à 6 chiffres que vous leur transmettez. Ils choisissent ensuite leur code personnel.'],
  ['Comment un paiement Mobile Money est-il confirmé ?', 'Le locataire valide sur la page de paiement sécurisée. PayTonLoyer vérifie ensuite le paiement et son montant auprès du service de paiement, puis génère la quittance.'],
  ['Et si un locataire paie en espèces ?', 'Vous enregistrez le paiement vous-même depuis l’application. L’échéance est soldée et la quittance est créée de la même façon.'],
  ['Mes données sont-elles visibles par d’autres ?', 'Non. Chaque propriétaire n’accède qu’à ses logements, et chaque locataire qu’à ses propres loyers et quittances.'],
];

function Fond() {
  return (
    <>
      <div aria-hidden="true" className="cine-aurore cine-respire pointer-events-none absolute top-1/2 left-1/2 h-[70vh] w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-[50%] blur-[80px]" />
      <div aria-hidden="true" className="cine-grille pointer-events-none absolute inset-0" />
    </>
  );
}

function Navigation() {
  const lien = 'flex min-h-11 items-center font-semibold text-white/75 transition-colors hover:text-white';
  return (
    <header className="pt-safe sticky top-0 z-40 border-b border-white/10 bg-marque-950/80 backdrop-blur-xl">
      <nav aria-label="Navigation du site" className={`${LARGEUR} flex min-h-16 items-center justify-between gap-4`}>
        <Link to="/" className="flex min-h-11 items-center gap-2.5 text-lg font-extrabold">
          <img src="/logo/embleme-blanc.png" alt="" width="84" height="36" className="h-9 w-auto" />
          PayTonLoyer
        </Link>
        <div className="hidden items-center gap-8 lg:flex">
          <a href="#fonctionnalites" className={lien}>Fonctionnalités</a>
          <a href="#locataires" className={lien}>Locataires</a>
          <a href="#questions" className={lien}>Questions</a>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/connexion" className="flex min-h-11 items-center px-3 font-bold text-white">Se connecter</Link>
          <Link to="/inscription" className="cine-pilule hidden min-h-11 items-center rounded-full px-5 font-bold sm:flex">Créer un compte</Link>
        </div>
      </nav>
    </header>
  );
}

function Heros() {
  return (
    <section className="relative overflow-hidden">
      <Fond />
      <div className={`${LARGEUR} relative grid items-center gap-14 pt-14 pb-20 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[1.2fr_1fr] lg:py-16`}>
        <div>
          <p data-intro className="cine-pilule inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white/85">
            <span aria-hidden="true" className="size-2 rounded-full bg-marque-300" />
            Gestion locative · Sénégal
          </p>
          <h1 data-intro className="cine-metal mt-6 text-[2.75rem] leading-[1.02] font-black tracking-tighter text-balance lg:text-[4.75rem]">
            Vos loyers encaissés, sans courir après personne.
          </h1>
          <p data-intro className="mt-6 max-w-xl text-lg text-white/75 lg:text-xl">
            Suivez vos logements, relancez vos locataires sur WhatsApp et recevez vos loyers par Mobile Money. Tout au même endroit.
          </p>
          <div data-intro className="mt-9 flex flex-col gap-3 sm:flex-row">
            <MagneticButton as={Link} to="/inscription" className={BOUTON_PLEIN}>
              Créer mon compte propriétaire
              <ArrowRight size={20} aria-hidden="true" />
            </MagneticButton>
            <MagneticButton as={Link} to="/connexion" className={BOUTON_VERRE}>Je suis locataire</MagneticButton>
          </div>
          <ul data-intro className="mt-9 flex flex-wrap gap-2" aria-label="Paiements acceptés">
            {[['WAVE', 'Wave'], ['ORANGE_MONEY', 'Orange Money'], ['FREE_MONEY', 'Free Money']].map(([code, libelle]) => (
              <li key={code} className="cine-pilule flex items-center gap-2 rounded-full py-1 pr-4 pl-1 text-sm font-semibold">
                <span aria-hidden="true" className={`flex size-7 items-center justify-center rounded-full text-[11px] font-extrabold ${PASTILLES[code].classes}`}>{PASTILLES[code].sigle}</span>
                {libelle}
              </li>
            ))}
          </ul>
        </div>
        <div data-intro className="relative">
          <div aria-hidden="true" className="absolute inset-x-10 top-10 bottom-0 rounded-full bg-marque-300/20 blur-3xl" />
          <div className="relative lg:rotate-[4deg]">
            <TelephoneProprietaire />
          </div>
        </div>
      </div>
    </section>
  );
}

function BandeauDefilant({ enPause, basculer }) {
  return (
    <div className="relative z-10 -my-2 flex items-center overflow-hidden py-6">
      <Bandeau elements={BANDEAU} className="w-full -rotate-2 scale-105 shadow-2xl" />
      <button
        type="button"
        onClick={basculer}
        aria-pressed={enPause}
        aria-label={enPause ? 'Relancer les animations' : 'Mettre les animations en pause'}
        className="cine-pilule absolute right-3 flex size-11 items-center justify-center rounded-full text-white"
      >
        {enPause ? <Play size={20} aria-hidden="true" /> : <Pause size={20} aria-hidden="true" />}
      </button>
    </div>
  );
}

function Video() {
  return (
    <section id="video" className={`${LARGEUR} scroll-mt-20 pt-20 lg:pt-28`} aria-labelledby="titre-video">
      <h2 id="titre-video" data-reveler className={TITRE_SECTION}>PayTonLoyer en 15 secondes.</h2>
      <div data-reveler className="cine-carte mt-10 rounded-[2rem] p-2 shadow-[0_40px_100px_-30px_rgb(0_0_0/0.8)]">
        <AnimationMarque />
      </div>
    </section>
  );
}

function Comparaison() {
  return (
    <section className={`${LARGEUR} py-20 lg:py-28`} aria-labelledby="titre-comparaison">
      <h2 id="titre-comparaison" data-reveler className={TITRE_SECTION}>La gestion locative mérite mieux qu’un carnet et des appels.</h2>
      <ul className="mt-10 space-y-3">
        {COMPARAISON.map(([avant, apres]) => (
          <li key={apres} data-reveler className="cine-carte grid gap-3 rounded-3xl p-5 md:grid-cols-2 md:gap-8">
            <p className="flex items-start gap-3 text-white/70">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-red-400/15 text-red-300"><X size={16} aria-hidden="true" /></span>
              <span><span className="sr-only">Avant : </span>{avant}</span>
            </p>
            <p className="flex items-start gap-3 font-bold">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-marque-300 text-marque-950"><Check size={16} aria-hidden="true" /></span>
              <span><span className="sr-only">Avec PayTonLoyer : </span>{apres}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Fonctionnalites() {
  return (
    <section id="fonctionnalites" className={`${LARGEUR} scroll-mt-20 py-20 lg:py-28`} aria-labelledby="titre-fonctions">
      <h2 id="titre-fonctions" data-reveler className={TITRE_SECTION}>Tout ce qu’il faut pour gérer vos loyers.</h2>
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FONCTIONS.map(({ Icone, titre, texte, classes = '' }) => (
          <article key={titre} data-reveler className={`cine-carte rounded-3xl p-6 ${classes}`}>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-marque-300">
              <Icone size={24} aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-xl font-bold">{titre}</h3>
            <p className="mt-1.5 text-white/70">{texte}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Locataires() {
  const points = ['Connexion avec le numéro de téléphone', 'Loyer et prochaine échéance toujours visibles', 'Paiement en quelques gestes depuis le téléphone', 'Historique et quittances téléchargeables'];
  return (
    <section id="locataires" className="relative scroll-mt-20 overflow-hidden py-20 lg:py-28" aria-labelledby="titre-locataires">
      <Fond />
      <div className={`${LARGEUR} relative grid items-center gap-14 lg:grid-cols-2`}>
        <div className="lg:order-2">
          <h2 id="titre-locataires" data-reveler className={TITRE_SECTION}>Pour le locataire, payer devient simple.</h2>
          <ul className="mt-7 space-y-3.5">
            {points.map((p) => (
              <li key={p} data-reveler className="flex items-start gap-3 text-lg text-white/85">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-marque-300 text-marque-950"><Check size={16} aria-hidden="true" /></span>
                {p}
              </li>
            ))}
          </ul>
          <div data-reveler className="mt-9 sm:w-fit">
            <MagneticButton as={Link} to="/connexion" className={BOUTON_VERRE}>Accéder à mon espace locataire</MagneticButton>
          </div>
        </div>
        <div data-reveler className="lg:-rotate-[4deg]">
          <TelephoneLocataire />
        </div>
      </div>
    </section>
  );
}

function Etapes() {
  return (
    <section className={`${LARGEUR} py-20 lg:py-28`} aria-labelledby="titre-etapes">
      <h2 id="titre-etapes" data-reveler className={TITRE_SECTION}>Trois étapes pour démarrer.</h2>
      <ol className="mt-10 grid gap-3 lg:grid-cols-3">
        {ETAPES.map(([titre, texte], i) => (
          <li key={titre} data-reveler className="cine-carte relative overflow-hidden rounded-3xl p-6 pt-24">
            <span aria-hidden="true" className="cine-texte-geant absolute top-3 -left-1 text-[7.5rem]">{i + 1}</span>
            <h3 className="text-xl font-bold"><span className="sr-only">Étape {i + 1} : </span>{titre}</h3>
            <p className="mt-1.5 text-white/70">{texte}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Questions() {
  return (
    <section id="questions" className={`${LARGEUR} max-w-3xl scroll-mt-20 pt-4 pb-24 lg:pb-32`} aria-labelledby="titre-questions">
      <h2 id="titre-questions" data-reveler className={TITRE_SECTION}>Questions fréquentes</h2>
      <div data-reveler className="cine-carte mt-10 divide-y divide-white/10 rounded-3xl px-5">
        {QUESTIONS.map(([q, r]) => (
          <details key={q} className="group">
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 font-bold [&::-webkit-details-marker]:hidden">
              {q}
              <ChevronDown size={20} className="shrink-0 text-white/70 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="pb-5 text-white/75">{r}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function useAnimations(ref) {
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('[data-intro]', { y: 32, opacity: 0, duration: 0.9, stagger: 0.09, ease: 'power3.out' });
      gsap.utils.toArray('[data-reveler]').forEach((el) => {
        gsap.from(el, { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      });
    }, ref);
    return () => mm.revert();
  }, [ref]);
}

export default function Vitrine() {
  const racine = useRef(null);
  const [enPause, setEnPause] = useState(false);
  useAnimations(racine);
  const pilule = 'cine-pilule flex min-h-11 items-center rounded-full px-5 text-sm font-semibold text-white/80';

  return (
    <div ref={racine} data-animations-pause={enPause} className="min-h-dvh bg-marque-950 text-white">
      {/* Le contenu passe au-dessus du pied de page fixe, qui se dévoile en fin de page. */}
      <div className="relative z-10 rounded-b-[2.5rem] bg-marque-950 shadow-[0_40px_80px_-20px_rgb(0_0_0/0.8)]">
        <Navigation />
        <main>
          <Heros />
          <BandeauDefilant enPause={enPause} basculer={() => setEnPause((v) => !v)} />
          <Video />
          <Comparaison />
          <Fonctionnalites />
          <Locataires />
          <Etapes />
          <Questions />
        </main>
      </div>

      <CinematicFooter
        titre={'Prêt à commencer ?'}
        texteGeant="PAYTONLOYER"
        bandeau={BANDEAU}
        actions={
          <>
            <MagneticButton as={Link} to="/inscription" className={BOUTON_PLEIN}>
              Créer mon compte
              <ArrowRight size={20} aria-hidden="true" />
            </MagneticButton>
            <MagneticButton as={Link} to="/connexion" className={BOUTON_VERRE}>Espace locataire</MagneticButton>
          </>
        }
        liens={
          <>
            <MagneticButton as="a" href="#fonctionnalites" className={pilule}>Fonctionnalités</MagneticButton>
            <MagneticButton as="a" href="#questions" className={pilule}>Questions</MagneticButton>
            <MagneticButton as={Link} to="/connexion" className={pilule}>Se connecter</MagneticButton>
          </>
        }
        mention={`© ${new Date().getFullYear()} PayTonLoyer`}
        badge={
          <>
            <span className="text-xs font-bold tracking-widest text-white/70 uppercase">Pensé avec</span>
            <Heart size={16} className="cine-battement fill-red-400 text-red-400" role="img" aria-label="amour" />
            <span className="text-xs font-bold tracking-widest text-white/70 uppercase">pour le Sénégal</span>
          </>
        }
      />
    </div>
  );
}
