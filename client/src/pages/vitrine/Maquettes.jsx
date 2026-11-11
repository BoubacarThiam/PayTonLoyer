import { CheckCircle2, MessageCircle } from 'lucide-react';
import { Avatar, BadgeStatut } from '../../components/ui.jsx';
import { nombre } from '../../utils/format.js';
import { PASTILLES } from '../../utils/moyens.js';

function Telephone({ description, children }) {
  return (
    <div role="img" aria-label={description} className="mx-auto w-[17.5rem] shrink-0 rounded-[2.75rem] bg-black p-2.5 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.7)] ring-1 ring-white/15">
      <div aria-hidden="true" className="relative h-[29rem] overflow-hidden rounded-[2.25rem] bg-fond text-left text-texte">
        {children}
      </div>
    </div>
  );
}

function Montant({ valeur }) {
  return (
    <p className="font-heading text-[2rem] leading-tight font-extrabold tracking-tight tabular-nums">
      {nombre(valeur)}
      <span className="ml-1.5 text-sm font-bold">FCFA</span>
    </p>
  );
}

export function TelephoneProprietaire() {
  const relances = [
    { nom: 'Moussa Ndiaye', detail: 'Oct. · 120 000 FCFA' },
    { nom: 'Aïda Sarr', detail: 'Nov. · 95 000 FCFA' },
  ];
  return (
    <Telephone description="Exemple de tableau de bord propriétaire : loyers encaissés du mois et locataires à relancer sur WhatsApp.">
      <div className="hero rounded-b-[1.75rem] px-4 pt-5 pb-16">
        <div className="flex items-center gap-2.5">
          <Avatar nom="Mariama Sow" sombre taille="size-9 text-xs" />
          <div>
            <p className="text-xs text-marque-100">Bonjour,</p>
            <p className="text-[15px] leading-tight font-extrabold">Mariama</p>
          </div>
        </div>
        <p className="mt-5 text-[13px] text-marque-100">Encaissé ce mois</p>
        <Montant valeur={850000} />
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/20">
          <div className="h-full w-[68%] rounded-full bg-marque-300" />
        </div>
        <p className="mt-1.5 text-xs text-marque-100">68 % encaissé · 5 loyers sur 8</p>
      </div>

      <div className="relative -mt-11 grid grid-cols-2 gap-2 px-3">
        {[
          ['Attendus', 1250000],
          ['Impayés', 400000],
        ].map(([libelle, valeur]) => (
          <div key={libelle} className="rounded-2xl bg-carte p-3 shadow-carte">
            <p className="text-xs text-secondaire">{libelle}</p>
            <p className="font-heading text-[15px] font-extrabold whitespace-nowrap tabular-nums">{nombre(valeur)}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 px-4 text-sm font-bold">À relancer</p>
      <div className="mx-3 mt-2 divide-y divide-bordure rounded-2xl bg-carte shadow-carte">
        {relances.map(({ nom, detail }) => (
          <div key={nom} className="flex items-center gap-2.5 p-2.5">
            <Avatar nom={nom} taille="size-9 text-xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold">{nom}</p>
              <p className="truncate text-xs text-secondaire">{detail}</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-full bg-marque-700 text-white">
              <MessageCircle size={16} />
            </span>
          </div>
        ))}
      </div>
    </Telephone>
  );
}

export function TelephoneLocataire() {
  const moyens = [
    ['WAVE', 'Wave', true],
    ['ORANGE_MONEY', 'Orange Money', false],
    ['FREE_MONEY', 'Free Money', false],
  ];
  return (
    <Telephone description="Exemple d’écran locataire : loyer du mois et choix du moyen de paiement Mobile Money.">
      <div className="hero rounded-b-[1.75rem] px-4 pt-6 pb-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] whitespace-nowrap text-marque-100">Loyer de novembre</p>
          <BadgeStatut statut="EN_ATTENTE" />
        </div>
        <Montant valeur={150000} />
        <p className="text-xs text-marque-100">À payer avant le 5 novembre</p>
      </div>

      <p className="mt-4 px-4 text-sm font-bold">Moyen de paiement</p>
      <div className="mt-2 space-y-2 px-3">
        {moyens.map(([code, libelle, choisi]) => (
          <div key={code} className={`flex items-center gap-2.5 rounded-2xl p-2.5 shadow-carte ring-2 ${choisi ? 'bg-marque-50 ring-marque-700' : 'bg-white ring-transparent'}`}>
            <span className={`flex size-9 items-center justify-center rounded-xl text-xs font-extrabold ${PASTILLES[code].classes}`}>{PASTILLES[code].sigle}</span>
            <span className="flex-1 text-sm font-bold">{libelle}</span>
            {choisi && <CheckCircle2 size={20} className="text-marque-700" />}
          </div>
        ))}
      </div>

      <div className="mx-3 mt-4 flex min-h-12 items-center justify-center rounded-2xl bg-marque-700 text-sm font-bold text-white shadow-bouton">Payer 150 000 FCFA</div>
    </Telephone>
  );
}
