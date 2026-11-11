import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, Phone, User } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { Bouton, Champ, MessageErreur } from '../../components/ui.jsx';
import { CadreAuth } from './Connexion.jsx';

export default function Inscription() {
  const { setUtilisateur } = useAuth();
  const naviguer = useNavigate();
  const [v, setV] = useState({ nom: '', telephone: '', email: '', motDePasse: '' });
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const champ = (nom) => ({
    value: v[nom],
    onChange: (e) => setV((p) => ({ ...p, [nom]: e.target.value })),
    erreur: erreur?.champs?.[nom],
  });

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const { utilisateur } = await api.post('/auth/inscription', v);
      setUtilisateur(utilisateur);
      naviguer('/proprietaire', { replace: true });
    } catch (err) {
      setErreur(err);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <CadreAuth titre="Créer un compte" sousTitre="Gérez vos logements et vos loyers.">
      <form onSubmit={soumettre} noValidate>
        {erreur && !erreur.champs && <MessageErreur erreur={erreur} />}
        <Champ libelle="Nom complet" icone={User} autoComplete="name" {...champ('nom')} />
        <Champ libelle="Téléphone" icone={Phone} type="tel" autoComplete="tel" placeholder="77 123 45 67" {...champ('telephone')} />
        <Champ libelle="E-mail" icone={Mail} type="email" autoComplete="email" autoCapitalize="none" {...champ('email')} />
        <Champ libelle="Mot de passe" icone={Lock} type="password" autoComplete="new-password" aide="Au moins 8 caractères." {...champ('motDePasse')} />
        <div className="mt-6">
          <Bouton type="submit" chargement={envoi}>Créer mon compte</Bouton>
        </div>
        <p className="mt-6 text-center text-secondaire">
          Déjà un compte ?{' '}
          <Link to="/connexion" className="font-bold text-marque-700 underline">Se connecter</Link>
        </p>
      </form>
    </CadreAuth>
  );
}
