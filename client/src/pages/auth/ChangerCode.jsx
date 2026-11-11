import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { Bouton, Champ, EnTete, MessageErreur, Squelettes } from '../../components/ui.jsx';

export default function ChangerCode() {
  const { utilisateur, setUtilisateur, chargement, deconnecter } = useAuth();
  const naviguer = useNavigate();
  const [v, setV] = useState({ ancien: '', nouveau: '', confirmation: '' });
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  if (chargement) return <div className="p-4"><Squelettes /></div>;
  if (!utilisateur) return <Navigate to="/connexion" replace />;

  const estLocataire = utilisateur.role === 'LOCATAIRE';
  const obligatoire = utilisateur.doitChangerMotDePasse;
  const mot = estLocataire ? 'code' : 'mot de passe';
  const propsSecret = estLocataire ? { inputMode: 'numeric', maxLength: 6 } : {};
  const champ = (nom) => ({ value: v[nom], onChange: (e) => setV((p) => ({ ...p, [nom]: e.target.value })) });

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    if (v.nouveau !== v.confirmation) {
      setErreur(`Les deux ${mot}s ne correspondent pas.`);
      return;
    }
    setEnvoi(true);
    try {
      const { utilisateur: u } = await api.post('/auth/changer-code', { ancien: v.ancien, nouveau: v.nouveau });
      setUtilisateur(u);
      naviguer('/', { replace: true });
    } catch (err) {
      setErreur(err);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg">
      <EnTete titre={`Changer mon ${mot}`} retour={!obligatoire} />
      <form onSubmit={soumettre} noValidate className="p-4">
        {obligatoire && <p className="mb-4 text-secondaire">Pour sécuriser votre compte, choisissez un code personnel que vous seul connaissez.</p>}
        <MessageErreur erreur={erreur} />
        <Champ libelle={obligatoire ? 'Code provisoire' : `${estLocataire ? 'Code' : 'Mot de passe'} actuel`} type="password" autoComplete="current-password" {...propsSecret} {...champ('ancien')} />
        <Champ libelle={`Nouveau ${mot}`} type="password" autoComplete="new-password" aide={estLocataire ? '6 chiffres.' : 'Au moins 8 caractères.'} {...propsSecret} {...champ('nouveau')} />
        <Champ libelle="Confirmation" type="password" autoComplete="new-password" {...propsSecret} {...champ('confirmation')} />
        <Bouton type="submit" chargement={envoi}>Enregistrer</Bouton>
        {obligatoire && (
          <div className="mt-3">
            <Bouton variante="neutre" onClick={deconnecter}>Se déconnecter</Bouton>
          </div>
        )}
      </form>
    </main>
  );
}
