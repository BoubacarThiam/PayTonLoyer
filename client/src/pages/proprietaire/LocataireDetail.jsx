import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarX2, KeyRound, Phone } from 'lucide-react';
import { api } from '../../api/client.js';
import { useRequete } from '../../hooks/useRequete.js';
import { Avatar, Bouton, Carte, Champ, EnTete, EtatVide, Liste, MessageErreur, Modale, Squelettes, TitreSection } from '../../components/ui.jsx';
import ModaleCode from '../../components/ModaleCode.jsx';
import LigneEcheance, { ModalePaiementManuel } from '../../components/LigneEcheance.jsx';
import { aujourdhuiIso, dateFr, fcfa, telephoneLisible } from '../../utils/format.js';

function ModaleModifier({ locataire, surFermer, surFini }) {
  const [v, setV] = useState({
    nom: locataire.nom,
    telephone: telephoneLisible(locataire.telephone),
    jourEcheance: String(locataire.bailActif?.jourEcheance ?? ''),
  });
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const champ = (nom) => ({ value: v[nom], onChange: (e) => setV((p) => ({ ...p, [nom]: e.target.value })), erreur: erreur?.champs?.[nom] });

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const corps = { nom: v.nom, telephone: v.telephone, ...(locataire.bailActif ? { jourEcheance: v.jourEcheance } : {}) };
      await api.put(`/locataires/${locataire.id}`, corps);
      surFini();
    } catch (err) {
      setErreur(err);
      setEnvoi(false);
    }
  }

  return (
    <Modale ouverte titre="Modifier le locataire" surFermer={surFermer}>
      <form onSubmit={soumettre} noValidate>
        {erreur && !erreur.champs && <MessageErreur erreur={erreur} />}
        <Champ libelle="Nom complet" {...champ('nom')} />
        <Champ libelle="Téléphone" type="tel" {...champ('telephone')} />
        {locataire.bailActif && <Champ libelle="Jour d’échéance" inputMode="numeric" aide="S’applique aux mois à venir." {...champ('jourEcheance')} />}
        <Bouton type="submit" chargement={envoi}>Enregistrer</Bouton>
      </form>
    </Modale>
  );
}

function ModaleFinBail({ locataire, surFermer, surFini }) {
  const [date, setDate] = useState(aujourdhuiIso());
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  async function confirmer() {
    setErreur(null);
    setEnvoi(true);
    try {
      await api.post(`/locataires/${locataire.id}/fin-bail`, { dateSortie: date });
      surFini();
    } catch (err) {
      setErreur(err);
      setEnvoi(false);
    }
  }

  return (
    <Modale ouverte titre="Mettre fin au bail" surFermer={surFermer}>
      <p className="mb-4 text-secondaire">
        {locataire.bailActif.logement.nom} redeviendra libre. Les impayés déjà échus resteront dus, les mois suivant la sortie seront annulés.
      </p>
      <MessageErreur erreur={erreur?.champs ? null : erreur} />
      <Champ libelle="Date de sortie" type="date" value={date} erreur={erreur?.champs?.dateSortie} onChange={(e) => setDate(e.target.value)} />
      <Bouton variante="danger" chargement={envoi} onClick={confirmer}>Confirmer la fin du bail</Bouton>
    </Modale>
  );
}

function ModaleAffecter({ locataire, surFermer, surFini }) {
  const { donnees } = useRequete('/logements');
  const libres = donnees?.logements.filter((l) => !l.locataireActuel) ?? [];
  const [v, setV] = useState({ logementId: '', dateEntree: aujourdhuiIso(), jourEcheance: '5' });
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const champ = (nom) => ({ value: v[nom], onChange: (e) => setV((p) => ({ ...p, [nom]: e.target.value })), erreur: erreur?.champs?.[nom] });

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      await api.post(`/locataires/${locataire.id}/affecter`, v);
      surFini();
    } catch (err) {
      setErreur(err);
      setEnvoi(false);
    }
  }

  return (
    <Modale ouverte titre="Affecter à un logement" surFermer={surFermer}>
      <form onSubmit={soumettre} noValidate>
        {erreur && !erreur.champs && <MessageErreur erreur={erreur} />}
        <Liste libelle="Logement" {...champ('logementId')}>
          <option value="">Choisir un logement</option>
          {libres.map((l) => <option key={l.id} value={l.id}>{l.nom} — {fcfa(l.loyerMensuel)}</option>)}
        </Liste>
        <Champ libelle="Date d’entrée" type="date" {...champ('dateEntree')} />
        <Champ libelle="Jour d’échéance" inputMode="numeric" {...champ('jourEcheance')} />
        <Bouton type="submit" chargement={envoi}>Affecter</Bouton>
      </form>
    </Modale>
  );
}

export default function LocataireDetail() {
  const { id } = useParams();
  const { donnees: d, chargement, erreur, recharger } = useRequete(`/locataires/${id}`);
  const [modale, setModale] = useState(null);
  const [encaisser, setEncaisser] = useState(null);
  const [code, setCode] = useState(null);
  const [erreurAction, setErreurAction] = useState(null);

  const fermer = () => setModale(null);
  const fini = () => {
    fermer();
    recharger();
  };

  async function reinitialiser() {
    setErreurAction(null);
    try {
      const { codeProvisoire } = await api.post(`/locataires/${id}/reinitialiser-code`);
      setCode(codeProvisoire);
    } catch (err) {
      setErreurAction(err);
    }
  }

  const l = d?.locataire;
  return (
    <>
      <EnTete titre={l?.nom ?? 'Locataire'} retour="/proprietaire/locataires" />
      <main className="px-4">
        <MessageErreur erreur={erreur} surReessayer={recharger} />
        <MessageErreur erreur={erreurAction} />
        {!d && chargement && <Squelettes />}
        {d && (
          <>
            <Carte className="mb-3">
              <div className="flex items-center gap-3">
                <Avatar nom={l.nom} taille="size-14 text-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[1.0625rem] font-bold">{l.nom}</p>
                  <p className="text-sm text-secondaire">{telephoneLisible(l.telephone)}</p>
                </div>
                <a href={`tel:${l.telephone}`} aria-label={`Appeler ${l.nom}`} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-marque-700 text-white shadow-bouton transition-transform active:scale-95">
                  <Phone size={20} aria-hidden="true" />
                </a>
              </div>
              {l.bailActif ? (
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-bordure pt-4">
                  <div className="col-span-2">
                    <dt className="text-sm text-secondaire">Logement</dt>
                    <dd className="font-bold">{l.bailActif.logement.nom}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-secondaire">Loyer</dt>
                    <dd className="font-bold tabular-nums">{fcfa(l.bailActif.loyerMensuel)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-secondaire">Échéance</dt>
                    <dd className="font-bold">Le {l.bailActif.jourEcheance} du mois</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-sm text-secondaire">Entrée</dt>
                    <dd className="font-bold">{dateFr(l.bailActif.dateEntree)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 border-t border-bordure pt-3 text-secondaire">Pas de logement actuellement.</p>
              )}
            </Carte>

            <div className="mb-2 grid grid-cols-2 gap-2">
              <Bouton variante="neutre" taille="petite" onClick={() => setModale('modifier')}>Modifier</Bouton>
              <Bouton variante="neutre" taille="petite" onClick={reinitialiser}>
                <KeyRound size={20} aria-hidden="true" />
                Nouveau code
              </Bouton>
            </div>
            {l.bailActif ? (
              <div className="mb-5"><Bouton variante="danger" taille="petite" onClick={() => setModale('fin')}>Mettre fin au bail</Bouton></div>
            ) : (
              <div className="mb-5"><Bouton onClick={() => setModale('affecter')}>Affecter à un logement</Bouton></div>
            )}

            <TitreSection>Historique des loyers</TitreSection>
            {d.echeances.length === 0 ? (
              <EtatVide Icone={CalendarX2} titre="Aucune échéance" />
            ) : (
              <div className="space-y-3">
                {d.echeances.map((e) => <LigneEcheance key={e.id} echeance={e} surEncaisser={setEncaisser} />)}
              </div>
            )}
          </>
        )}
      </main>

      {modale === 'modifier' && <ModaleModifier locataire={l} surFermer={fermer} surFini={fini} />}
      {modale === 'fin' && <ModaleFinBail locataire={l} surFermer={fermer} surFini={fini} />}
      {modale === 'affecter' && <ModaleAffecter locataire={l} surFermer={fermer} surFini={fini} />}
      {code && <ModaleCode locataire={l} code={code} surFermer={() => setCode(null)} />}
      {encaisser && (
        <ModalePaiementManuel
          echeance={encaisser}
          surFermer={() => setEncaisser(null)}
          surEnregistre={() => {
            setEncaisser(null);
            recharger();
          }}
        />
      )}
    </>
  );
}
