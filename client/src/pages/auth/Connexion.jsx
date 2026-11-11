import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { KeyRound, Lock, Phone, User } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { Bouton, Champ, MessageErreur } from '../../components/ui.jsx';

export function CadreAuth({ titre, sousTitre, children }) {
  return (
    <main className="hero flex min-h-dvh flex-col">
      <div className="mx-auto w-full max-w-md px-6 pt-[calc(env(safe-area-inset-top)+3rem)] pb-9">
        <Link to="/" aria-label="Retour à la page d’accueil de PayTonLoyer" className="inline-flex min-h-11 items-center">
          <img src="/logo/embleme-blanc.png" alt="" width="140" height="60" className="h-14 w-auto" />
        </Link>
        <p className="font-heading mt-5 text-[1.875rem] leading-tight font-extrabold">{titre}</p>
        <p className="mt-1 text-[1.0625rem] text-marque-100">{sousTitre}</p>
      </div>
      <div className="safe-bas flex-1 rounded-t-[2rem] bg-white text-texte">
        <div className="mx-auto max-w-md px-6 pt-7 pb-8">{children}</div>
      </div>
    </main>
  );
}

export default function Connexion() {
  const { utilisateur, setUtilisateur, chargement: chargementSession } = useAuth();
  const naviguer = useNavigate();
  const [profil, setProfil] = useState('LOCATAIRE');
  const [valeurs, setValeurs] = useState({ identifiant: '', secret: '' });
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  if (!chargementSession && utilisateur) return <Navigate to="/" replace />;

  const estLocataire = profil === 'LOCATAIRE';
  const changer = (champ) => (e) => setValeurs((v) => ({ ...v, [champ]: e.target.value }));

  function choisirProfil(p) {
    setProfil(p);
    setValeurs({ identifiant: '', secret: '' });
    setErreur(null);
  }

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const { utilisateur: u } = estLocataire
        ? await api.post('/auth/connexion-locataire', { telephone: valeurs.identifiant, code: valeurs.secret })
        : await api.post('/auth/connexion', { identifiant: valeurs.identifiant, motDePasse: valeurs.secret });
      setUtilisateur(u);
      naviguer(u.doitChangerMotDePasse ? '/changer-code' : '/', { replace: true });
    } catch (err) {
      setErreur(err);
    } finally {
      setEnvoi(false);
    }
  }

  const onglet = (p, libelle) => (
    <button
      type="button"
      role="tab"
      aria-selected={profil === p}
      onClick={() => choisirProfil(p)}
      className={`min-h-12 flex-1 rounded-[0.875rem] font-bold transition-colors ${profil === p ? 'bg-white text-marque-800 shadow-carte' : 'text-secondaire'}`}
    >
      {libelle}
    </button>
  );

  return (
    <CadreAuth titre="PayTonLoyer" sousTitre="Vos loyers, simplement.">
      <div role="tablist" aria-label="Type de compte" className="mb-6 flex gap-1 rounded-2xl bg-sourdine p-1">
        {onglet('LOCATAIRE', 'Locataire')}
        {onglet('PROPRIETAIRE', 'Propriétaire')}
      </div>

      <form onSubmit={soumettre} noValidate>
        <MessageErreur erreur={erreur} />
        {estLocataire ? (
          <>
            <Champ libelle="Numéro de téléphone" icone={Phone} type="tel" inputMode="tel" autoComplete="tel" placeholder="77 123 45 67" value={valeurs.identifiant} onChange={changer('identifiant')} required />
            <Champ libelle="Code à 6 chiffres" icone={KeyRound} type="password" inputMode="numeric" autoComplete="current-password" maxLength={6} aide="Code donné par votre propriétaire." value={valeurs.secret} onChange={changer('secret')} required />
          </>
        ) : (
          <>
            <Champ libelle="E-mail ou téléphone" icone={User} autoComplete="username" autoCapitalize="none" value={valeurs.identifiant} onChange={changer('identifiant')} required />
            <Champ libelle="Mot de passe" icone={Lock} type="password" autoComplete="current-password" value={valeurs.secret} onChange={changer('secret')} required />
          </>
        )}
        <div className="mt-6">
          <Bouton type="submit" chargement={envoi}>Se connecter</Bouton>
        </div>
      </form>

      {!estLocataire && (
        <p className="mt-6 text-center text-secondaire">
          Pas encore de compte ?{' '}
          <Link to="/inscription" className="font-bold text-marque-700 underline">Créer un compte</Link>
        </p>
      )}
    </CadreAuth>
  );
}
