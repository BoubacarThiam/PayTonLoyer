import { useEffect, useId, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Clock, LoaderCircle, X } from 'lucide-react';
import { libellePeriode, decalerPeriode } from '../utils/format.js';

const STYLES_BOUTON = {
  primaire: 'bg-marque-700 text-white shadow-bouton active:bg-marque-800 disabled:bg-marque-700/45 disabled:shadow-none',
  blanc: 'bg-white text-marque-900 active:bg-marque-50 disabled:opacity-60',
  contour: 'border border-white/50 text-white active:bg-white/10',
  secondaire: 'bg-marque-50 text-marque-800 active:bg-marque-100 disabled:opacity-50',
  neutre: 'bg-white text-texte border border-bordure active:bg-fond disabled:opacity-50',
  danger: 'bg-white text-retard-texte border border-retard-fond active:bg-retard-fond disabled:opacity-50',
};

const TAILLES_BOUTON = {
  normale: 'min-h-[3.25rem] rounded-2xl px-5 text-base',
  petite: 'min-h-11 rounded-xl px-3 text-[15px]',
};

const classesBouton = (variante, pleine, taille) =>
  `inline-flex items-center justify-center gap-2 font-bold transition-[background-color,transform] duration-150 active:scale-[0.98] ${
    pleine ? 'w-full' : ''
  } ${TAILLES_BOUTON[taille]} ${STYLES_BOUTON[variante]}`;

export function Bouton({ variante = 'primaire', pleine = true, taille = 'normale', chargement, children, ...props }) {
  return (
    <button type="button" {...props} disabled={chargement || props.disabled} className={classesBouton(variante, pleine, taille)}>
      {chargement && <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function LienBouton({ variante = 'primaire', pleine = true, taille = 'normale', children, to, href, ...props }) {
  const classes = classesBouton(variante, pleine, taille);
  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={classes} {...props}>
      {children}
    </Link>
  );
}

function Enveloppe({ libelle, erreur, aide, id, children }) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-[15px] font-semibold">
        {libelle}
      </label>
      {children}
      {aide && !erreur && <p className="mt-1.5 text-sm text-secondaire">{aide}</p>}
      {erreur && (
        <p id={`${id}-erreur`} className="mt-1.5 text-sm font-semibold text-retard-texte">
          {erreur}
        </p>
      )}
    </div>
  );
}

const classesChamp = (erreur, avecIcone) =>
  `min-h-[3.25rem] w-full rounded-2xl border bg-white py-2 pr-4 text-base transition-colors focus:border-marque-700 ${
    avecIcone ? 'pl-11' : 'pl-4'
  } ${erreur ? 'border-retard-texte' : 'border-contour'}`;

function propsErreur(id, erreur) {
  return { 'aria-invalid': erreur ? true : undefined, 'aria-describedby': erreur ? `${id}-erreur` : undefined };
}

// Les effets s'exécutent dans l'ordre du formulaire : le premier champ en erreur prend le focus.
function useFocusSiErreur(erreur) {
  const ref = useRef(null);
  useEffect(() => {
    if (erreur && !document.activeElement?.matches('[aria-invalid="true"]')) ref.current?.focus();
  }, [erreur]);
  return ref;
}

export function Champ({ libelle, erreur, aide, icone: Icone, ...props }) {
  const id = useId();
  const ref = useFocusSiErreur(erreur);
  return (
    <Enveloppe {...{ libelle, erreur, aide, id }}>
      <div className="relative">
        {Icone && <Icone size={20} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-secondaire" aria-hidden="true" />}
        <input ref={ref} id={id} {...propsErreur(id, erreur)} {...props} className={classesChamp(erreur, Boolean(Icone))} />
      </div>
    </Enveloppe>
  );
}

export function ZoneTexte({ libelle, erreur, aide, ...props }) {
  const id = useId();
  const ref = useFocusSiErreur(erreur);
  return (
    <Enveloppe {...{ libelle, erreur, aide, id }}>
      <textarea ref={ref} id={id} rows={3} {...propsErreur(id, erreur)} {...props} className={classesChamp(erreur, false)} />
    </Enveloppe>
  );
}

export function Liste({ libelle, erreur, aide, children, ...props }) {
  const id = useId();
  const ref = useFocusSiErreur(erreur);
  return (
    <Enveloppe {...{ libelle, erreur, aide, id }}>
      <select ref={ref} id={id} {...propsErreur(id, erreur)} {...props} className={classesChamp(erreur, false)}>
        {children}
      </select>
    </Enveloppe>
  );
}

export function Carte({ className = '', children }) {
  return <div className={`rounded-3xl bg-carte p-4 shadow-carte ${className}`}>{children}</div>;
}

const TEINTES_AVATAR = [
  'bg-marque-100 text-marque-800',
  'bg-amber-100 text-amber-900',
  'bg-teal-100 text-teal-900',
  'bg-lime-100 text-lime-900',
];

function initiales(nom = '') {
  const mots = nom.trim().split(/\s+/);
  return ((mots[0]?.[0] ?? '') + (mots.length > 1 ? mots[mots.length - 1][0] : '')).toUpperCase();
}

export function Avatar({ nom, taille = 'size-11 text-sm', sombre = false }) {
  const indice = [...nom].reduce((somme, c) => somme + c.charCodeAt(0), 0) % TEINTES_AVATAR.length;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${taille} ${
        sombre ? 'bg-white/15 text-white' : TEINTES_AVATAR[indice]
      }`}
    >
      {initiales(nom)}
    </span>
  );
}

const STATUTS = {
  PAYEE: { texte: 'Payé', classes: 'bg-succes-fond text-succes-texte', Icone: CheckCircle2 },
  EN_ATTENTE: { texte: 'En attente', classes: 'bg-attente-fond text-attente-texte', Icone: Clock },
  EN_RETARD: { texte: 'En retard', classes: 'bg-retard-fond text-retard-texte', Icone: AlertCircle },
};

export function BadgeStatut({ statut }) {
  const { texte, classes, Icone } = STATUTS[statut] || STATUTS.EN_ATTENTE;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full py-1 pr-2.5 pl-2 text-[13px] font-semibold whitespace-nowrap ${classes}`}>
      <Icone size={16} aria-hidden="true" />
      {texte}
    </span>
  );
}

export function EtatVide({ Icone, titre, texte, children }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex size-20 items-center justify-center rounded-[1.75rem] bg-marque-100 text-marque-700">
        <Icone size={32} aria-hidden="true" />
      </div>
      <h2 className="text-lg font-bold">{titre}</h2>
      {texte && <p className="mt-1 max-w-xs text-secondaire">{texte}</p>}
      {children && <div className="mt-6 w-full max-w-xs">{children}</div>}
    </div>
  );
}

export function Squelettes({ nombre = 3, hauteur = 'h-24' }) {
  return (
    <div className="space-y-3" role="status" aria-label="Chargement en cours">
      {Array.from({ length: nombre }, (_, i) => (
        <div key={i} className={`squelette ${hauteur}`} />
      ))}
    </div>
  );
}

export function MessageErreur({ erreur, surReessayer }) {
  if (!erreur) return null;
  return (
    <div role="alert" className="mb-4 rounded-2xl bg-retard-fond p-3.5 text-retard-texte">
      <p className="flex items-start gap-2 font-semibold">
        <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
        {erreur.message || erreur}
      </p>
      {surReessayer && (
        <button type="button" onClick={surReessayer} className="mt-1 min-h-11 font-bold underline">
          Réessayer
        </button>
      )}
    </div>
  );
}

export function Hero({ className = 'pb-16', children }) {
  return <div className={`hero rounded-b-[2rem] px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] ${className}`}>{children}</div>;
}

export function EnTete({ titre, retour, action }) {
  const naviguer = useNavigate();
  return (
    <header className="pt-safe sticky top-0 z-10 bg-fond">
      <div className="flex min-h-[4.25rem] items-center gap-3 px-4">
        {retour && (
          <button
            type="button"
            onClick={() => (typeof retour === 'string' ? naviguer(retour) : naviguer(-1))}
            aria-label="Retour"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white shadow-carte transition-transform active:scale-95"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
        )}
        <h1 className="min-w-0 flex-1 truncate text-[1.375rem] font-extrabold">{titre}</h1>
        {action}
      </div>
    </header>
  );
}

export function TitreSection({ id, children, action }) {
  return (
    <div className="mb-2.5 flex min-h-11 items-center justify-between gap-2 px-1">
      <h2 id={id} className="text-[1.0625rem] font-bold">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function Modale({ ouverte, titre, surFermer, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (ouverte && !d.open) d.showModal();
    if (!ouverte && d.open) d.close();
  }, [ouverte]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        surFermer();
      }}
      aria-label={titre}
      className="m-auto mb-0 w-full max-w-lg rounded-t-[1.75rem] bg-white p-0 text-texte sm:mb-auto sm:rounded-[1.75rem]"
    >
      {ouverte && (
        <div className="safe-bas">
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-bordure" aria-hidden="true" />
          <div className="flex items-center justify-between py-1.5 pr-2.5 pl-5">
            <h2 className="text-lg font-bold">{titre}</h2>
            <button type="button" onClick={surFermer} aria-label="Fermer" className="flex size-11 items-center justify-center rounded-full active:bg-fond">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="max-h-[75vh] overflow-y-auto px-5 pt-1 pb-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}

export function SelecteurMois({ periode, surChanger, sombre = false }) {
  const bouton = `flex size-11 items-center justify-center rounded-full transition-colors ${sombre ? 'active:bg-white/15' : 'active:bg-fond'}`;
  return (
    <div className={`flex items-center justify-between rounded-full ${sombre ? 'bg-white/10' : 'mb-4 bg-white shadow-carte'}`}>
      <button type="button" onClick={() => surChanger(decalerPeriode(periode, -1))} aria-label="Mois précédent" className={bouton}>
        <ChevronLeft size={20} aria-hidden="true" />
      </button>
      <p className="font-bold capitalize" aria-live="polite">
        {libellePeriode(periode)}
      </p>
      <button type="button" onClick={() => surChanger(decalerPeriode(periode, 1))} aria-label="Mois suivant" className={bouton}>
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
