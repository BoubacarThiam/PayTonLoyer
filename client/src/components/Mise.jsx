import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Banknote, Building2, CircleUser, History, House, Users } from 'lucide-react';
import { Squelettes } from './ui.jsx';

const NAV_PROPRIETAIRE = [
  { vers: '/proprietaire', libelle: 'Accueil', Icone: House, exact: true },
  { vers: '/proprietaire/logements', libelle: 'Logements', Icone: Building2 },
  { vers: '/proprietaire/locataires', libelle: 'Locataires', Icone: Users },
  { vers: '/proprietaire/paiements', libelle: 'Paiements', Icone: Banknote },
  { vers: '/proprietaire/compte', libelle: 'Compte', Icone: CircleUser },
];

const NAV_LOCATAIRE = [
  { vers: '/locataire', libelle: 'Accueil', Icone: House, exact: true },
  { vers: '/locataire/historique', libelle: 'Historique', Icone: History },
  { vers: '/locataire/compte', libelle: 'Compte', Icone: CircleUser },
];

function NavBas({ liens }) {
  return (
    <nav aria-label="Navigation principale" className="safe-bas pointer-events-none fixed inset-x-0 bottom-0 z-20">
      <ul className="pointer-events-auto mx-2 mb-2 flex gap-0.5 rounded-[1.75rem] bg-white p-1.5 shadow-flottant sm:mx-auto sm:mb-3 sm:max-w-md">
        {liens.map(({ vers, libelle, Icone, exact }) => (
          <li key={vers} className="min-w-0 flex-1">
            <NavLink
              to={vers}
              end={exact}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[1.25rem] text-xs tracking-[-0.03em] transition-colors ${
                  isActive ? 'bg-marque-700 font-semibold text-white' : 'font-medium text-secondaire active:bg-marque-50'
                }`
              }
            >
              <Icone size={20} aria-hidden="true" />
              {libelle}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Mise({ liens }) {
  return (
    <div className="pb-nav mx-auto min-h-dvh max-w-lg">
      <Suspense fallback={<div className="p-4"><Squelettes /></div>}>
        <Outlet />
      </Suspense>
      <NavBas liens={liens} />
    </div>
  );
}

export const MiseProprietaire = () => <Mise liens={NAV_PROPRIETAIRE} />;
export const MiseLocataire = () => <Mise liens={NAV_LOCATAIRE} />;
