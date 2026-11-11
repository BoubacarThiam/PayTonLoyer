import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.jsx';
import { MiseLocataire, MiseProprietaire } from './components/Mise.jsx';
import { Bouton, EtatVide, Squelettes } from './components/ui.jsx';
import { SearchX, WifiOff } from 'lucide-react';
import Connexion from './pages/auth/Connexion.jsx';

// Chaque profil ne télécharge que ses propres écrans.
const Vitrine = lazy(() => import('./pages/vitrine/Vitrine.jsx'));
const Inscription = lazy(() => import('./pages/auth/Inscription.jsx'));
const ChangerCode = lazy(() => import('./pages/auth/ChangerCode.jsx'));
const Compte = lazy(() => import('./pages/Compte.jsx'));
const TableauDeBord = lazy(() => import('./pages/proprietaire/TableauDeBord.jsx'));
const Logements = lazy(() => import('./pages/proprietaire/Logements.jsx'));
const LogementFormulaire = lazy(() => import('./pages/proprietaire/LogementFormulaire.jsx'));
const Locataires = lazy(() => import('./pages/proprietaire/Locataires.jsx'));
const LocataireFormulaire = lazy(() => import('./pages/proprietaire/LocataireFormulaire.jsx'));
const LocataireDetail = lazy(() => import('./pages/proprietaire/LocataireDetail.jsx'));
const Paiements = lazy(() => import('./pages/proprietaire/Paiements.jsx'));
const AccueilLocataire = lazy(() => import('./pages/locataire/Accueil.jsx'));
const HistoriqueLocataire = lazy(() => import('./pages/locataire/Historique.jsx'));
const Payer = lazy(() => import('./pages/locataire/Payer.jsx'));
const RetourPaiement = lazy(() => import('./pages/locataire/RetourPaiement.jsx'));

const accueilDe = (u) => (u.role === 'PROPRIETAIRE' ? '/proprietaire' : '/locataire');
const Attente = () => <div className="mx-auto max-w-lg p-4"><Squelettes nombre={4} /></div>;

function Protege({ role }) {
  const { utilisateur, chargement, erreurReseau, recharger } = useAuth();
  if (chargement) return <Attente />;
  if (erreurReseau) {
    return (
      <EtatVide Icone={WifiOff} titre="Connexion impossible" texte="Vérifiez votre réseau et réessayez.">
        <Bouton onClick={recharger}>Réessayer</Bouton>
      </EtatVide>
    );
  }
  if (!utilisateur) return <Navigate to="/connexion" replace />;
  if (utilisateur.doitChangerMotDePasse) return <Navigate to="/changer-code" replace />;
  if (utilisateur.role !== role) return <Navigate to={accueilDe(utilisateur)} replace />;
  return <Outlet />;
}

// La page publique s'affiche sans attendre la vérification de session, pour rester rapide sur réseau lent.
function Racine() {
  const { utilisateur } = useAuth();
  if (utilisateur) return <Navigate to={accueilDe(utilisateur)} replace />;
  return <Vitrine />;
}

function Introuvable() {
  return (
    <EtatVide Icone={SearchX} titre="Page introuvable" texte="Cette page n’existe pas ou a été déplacée.">
      <a href="/" className="font-semibold text-marque-700 underline">Retour à l’accueil</a>
    </EtatVide>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Attente />}>
      <Routes>
        <Route path="/" element={<Racine />} />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="/inscription" element={<Inscription />} />
        <Route path="/changer-code" element={<ChangerCode />} />

        <Route element={<Protege role="PROPRIETAIRE" />}>
          <Route path="/proprietaire" element={<MiseProprietaire />}>
            <Route index element={<TableauDeBord />} />
            <Route path="logements" element={<Logements />} />
            <Route path="logements/nouveau" element={<LogementFormulaire />} />
            <Route path="logements/:id" element={<LogementFormulaire />} />
            <Route path="locataires" element={<Locataires />} />
            <Route path="locataires/nouveau" element={<LocataireFormulaire />} />
            <Route path="locataires/:id" element={<LocataireDetail />} />
            <Route path="paiements" element={<Paiements />} />
            <Route path="compte" element={<Compte />} />
          </Route>
        </Route>

        <Route element={<Protege role="LOCATAIRE" />}>
          <Route path="/locataire" element={<MiseLocataire />}>
            <Route index element={<AccueilLocataire />} />
            <Route path="historique" element={<HistoriqueLocataire />} />
            <Route path="payer/:echeanceId" element={<Payer />} />
            <Route path="paiement/retour/:reference" element={<RetourPaiement />} />
            <Route path="paiement/annule/:reference" element={<RetourPaiement annule />} />
            <Route path="compte" element={<Compte />} />
          </Route>
        </Route>

        <Route path="*" element={<Introuvable />} />
      </Routes>
    </Suspense>
  );
}
