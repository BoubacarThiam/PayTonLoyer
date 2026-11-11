import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { api } from '../../api/client.js';
import { useRequete } from '../../hooks/useRequete.js';
import { Bouton, Champ, EnTete, EtatVide, LienBouton, Liste, MessageErreur, Squelettes } from '../../components/ui.jsx';
import ModaleCode from '../../components/ModaleCode.jsx';
import { aujourdhuiIso, fcfa } from '../../utils/format.js';

export default function LocataireFormulaire() {
  const naviguer = useNavigate();
  const { donnees, chargement, erreur: erreurChargement, recharger } = useRequete('/logements');
  const [v, setV] = useState({ nom: '', telephone: '', logementId: '', dateEntree: aujourdhuiIso(), jourEcheance: '5' });
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [cree, setCree] = useState(null);

  const libres = donnees?.logements.filter((l) => !l.locataireActuel) ?? [];
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
      setCree(await api.post('/locataires', v));
    } catch (err) {
      setErreur(err);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <>
      <EnTete titre="Nouveau locataire" retour="/proprietaire/locataires" />
      <main className="px-4">
        <MessageErreur erreur={erreurChargement} surReessayer={recharger} />
        {!donnees && chargement && <Squelettes />}
        {donnees && libres.length === 0 && (
          <EtatVide Icone={Building2} titre="Aucun logement disponible" texte="Un locataire doit être affecté à un logement sans occupant.">
            <LienBouton to="/proprietaire/logements/nouveau">Ajouter un logement</LienBouton>
          </EtatVide>
        )}
        {libres.length > 0 && (
          <form onSubmit={soumettre} noValidate>
            {erreur && !erreur.champs && <MessageErreur erreur={erreur} />}
            <Champ libelle="Nom complet" autoComplete="off" {...champ('nom')} />
            <Champ libelle="Téléphone" type="tel" placeholder="77 123 45 67" autoComplete="off" {...champ('telephone')} />
            <Liste libelle="Logement" {...champ('logementId')}>
              <option value="">Choisir un logement</option>
              {libres.map((l) => <option key={l.id} value={l.id}>{l.nom} — {fcfa(l.loyerMensuel)}</option>)}
            </Liste>
            <Champ libelle="Date d’entrée" type="date" {...champ('dateEntree')} />
            <Champ libelle="Jour d’échéance" inputMode="numeric" aide="Jour du mois où le loyer est dû (1 à 31)." {...champ('jourEcheance')} />
            <Bouton type="submit" chargement={envoi}>Ajouter le locataire</Bouton>
          </form>
        )}
      </main>
      {cree && (
        <ModaleCode
          locataire={cree.locataire}
          code={cree.codeProvisoire}
          surFermer={() => naviguer(`/proprietaire/locataires/${cree.locataire.id}`, { replace: true })}
        />
      )}
    </>
  );
}
