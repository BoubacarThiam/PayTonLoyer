import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, KeyRound, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { Avatar, Carte, EnTete } from '../components/ui.jsx';
import { telephoneLisible } from '../utils/format.js';

export default function Compte() {
  const { utilisateur, deconnecter } = useAuth();
  const naviguer = useNavigate();
  const estLocataire = utilisateur.role === 'LOCATAIRE';

  async function quitter() {
    await deconnecter();
    naviguer('/connexion', { replace: true });
  }

  const classesLigne = 'flex min-h-[3.75rem] w-full items-center gap-3 px-4 text-left font-semibold transition-colors active:bg-fond';

  return (
    <>
      <EnTete titre="Mon compte" />
      <main className="space-y-4 px-4">
        <Carte className="flex flex-col items-center py-7 text-center">
          <Avatar nom={utilisateur.nom} taille="size-20 text-2xl" />
          <p className="mt-3 text-lg font-bold">{utilisateur.nom}</p>
          <p className="text-secondaire">{telephoneLisible(utilisateur.telephone)}</p>
          {utilisateur.email && <p className="text-secondaire">{utilisateur.email}</p>}
          <span className="mt-3 rounded-full bg-marque-100 px-3 py-1 text-[13px] font-bold text-marque-800">
            {estLocataire ? 'Locataire' : 'Propriétaire'}
          </span>
        </Carte>

        <div className="divide-y divide-bordure overflow-hidden rounded-3xl bg-carte shadow-carte">
          <Link to="/changer-code" className={classesLigne}>
            <span className="flex size-10 items-center justify-center rounded-xl bg-marque-50 text-marque-700">
              <KeyRound size={20} aria-hidden="true" />
            </span>
            <span className="flex-1">Changer mon {estLocataire ? 'code' : 'mot de passe'}</span>
            <ChevronRight size={20} className="text-secondaire" aria-hidden="true" />
          </Link>
          <button type="button" onClick={quitter} className={`${classesLigne} text-retard-texte`}>
            <span className="flex size-10 items-center justify-center rounded-xl bg-retard-fond">
              <LogOut size={20} aria-hidden="true" />
            </span>
            Se déconnecter
          </button>
        </div>
      </main>
    </>
  );
}
