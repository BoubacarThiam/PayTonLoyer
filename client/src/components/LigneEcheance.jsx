import { useState } from 'react';
import { FileDown, HandCoins, MessageCircle, MessageSquareText } from 'lucide-react';
import { api } from '../api/client.js';
import { aujourdhuiIso, dateFr, fcfa, libellePeriode, METHODES, moisCourt, nombre } from '../utils/format.js';
import { Avatar, BadgeStatut, Bouton, Carte, Champ, LienBouton, Liste, MessageErreur, Modale } from './ui.jsx';

export function ModalePaiementManuel({ echeance, surFermer, surEnregistre }) {
  const [v, setV] = useState({ methode: 'ESPECES', date: aujourdhuiIso(), note: '' });
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      await api.post(`/echeances/${echeance.id}/paiement-manuel`, v);
      surEnregistre();
    } catch (err) {
      setErreur(err);
      setEnvoi(false);
    }
  }

  return (
    <Modale ouverte titre="Enregistrer un paiement" surFermer={surFermer}>
      <form onSubmit={soumettre} noValidate>
        <div className="mb-4 rounded-2xl bg-marque-50 p-4">
          <p className="text-sm text-secondaire">
            <span className="capitalize">{libellePeriode(echeance.periode)}</span>
            {echeance.bail?.locataire && <> · {echeance.bail.locataire.nom}</>}
          </p>
          <p className="font-heading text-2xl font-extrabold tabular-nums">{fcfa(echeance.montant)}</p>
        </div>
        <MessageErreur erreur={erreur?.champs ? null : erreur} />
        <Liste libelle="Mode de paiement" value={v.methode} onChange={(e) => setV({ ...v, methode: e.target.value })}>
          <option value="ESPECES">Espèces</option>
          <option value="VIREMENT">Virement</option>
        </Liste>
        <Champ libelle="Date du paiement" type="date" max={aujourdhuiIso()} value={v.date} erreur={erreur?.champs?.date} onChange={(e) => setV({ ...v, date: e.target.value })} />
        <Champ libelle="Note (facultatif)" value={v.note} erreur={erreur?.champs?.note} onChange={(e) => setV({ ...v, note: e.target.value })} />
        <p className="mb-4 text-sm text-secondaire">Une quittance sera générée et ce paiement ne pourra plus être modifié.</p>
        <Bouton type="submit" chargement={envoi}>Confirmer le paiement</Bouton>
      </form>
    </Modale>
  );
}

export function LienQuittance({ quittance, taille = 'normale', pleine = true }) {
  if (!quittance) return null;
  return (
    <LienBouton variante="secondaire" taille={taille} pleine={pleine} href={`/api/quittances/${quittance.id}/pdf`} download={`quittance-${quittance.numero}.pdf`}>
      <FileDown size={20} aria-hidden="true" />
      Quittance
    </LienBouton>
  );
}

export function PastilleMois({ periode }) {
  const { mois, annee } = moisCourt(periode);
  return (
    <span aria-hidden="true" className="flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-marque-50 text-marque-800">
      <span className="text-[13px] leading-tight font-extrabold">{mois}</span>
      <span className="text-xs leading-tight font-semibold">{annee}</span>
    </span>
  );
}

export default function LigneEcheance({ echeance, afficherLocataire, surEncaisser }) {
  const { bail, statutReel, paiement, quittance, lienWhatsapp } = echeance;
  const impayee = statutReel === 'EN_ATTENTE' || statutReel === 'EN_RETARD';
  const titre = afficherLocataire ? bail.locataire.nom : libellePeriode(echeance.periode);
  const nomLogement = bail.logement?.nom;
  const detail = paiement ? `Payé le ${dateFr(paiement.datePaiement)} · ${METHODES[paiement.methode]}` : `Échéance : ${dateFr(echeance.dateEcheance)}`;
  const [sms, setSms] = useState({ envoi: false, message: null, erreur: false });

  async function relancerParSms() {
    setSms({ envoi: true, message: null, erreur: false });
    try {
      const { message } = await api.post(`/echeances/${echeance.id}/rappel-sms`);
      setSms({ envoi: false, message, erreur: false });
    } catch (err) {
      setSms({ envoi: false, message: err.message, erreur: true });
    }
  }

  return (
    <Carte>
      <div className="flex items-center gap-3">
        {afficherLocataire ? <Avatar nom={bail.locataire.nom} taille="size-12 text-[15px]" /> : <PastilleMois periode={echeance.periode} />}
        <div className="min-w-0 flex-1">
          <p className={`truncate font-bold ${afficherLocataire ? '' : 'capitalize'}`}>{titre}</p>
          {nomLogement && <p className="truncate text-sm text-secondaire">{nomLogement}</p>}
        </div>
        <p className="font-heading shrink-0 text-right text-[1.0625rem] leading-tight font-extrabold whitespace-nowrap tabular-nums">
          {nombre(echeance.montant)}
          <span className="block text-xs font-semibold text-secondaire">FCFA</span>
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="min-w-0 text-sm text-secondaire">{detail}</p>
        <BadgeStatut statut={statutReel} />
      </div>

      {(impayee || quittance) && (
        // Relances (WhatsApp, SMS) côte à côte, puis l'encaissement sur toute la largeur.
        <div className="mt-3 grid grid-cols-2 gap-2">
          {lienWhatsapp && (
            <>
              <LienBouton variante="secondaire" taille="petite" href={lienWhatsapp} target="_blank" rel="noreferrer">
                <MessageCircle size={20} aria-hidden="true" />
                WhatsApp
              </LienBouton>
              <Bouton
                variante="secondaire"
                taille="petite"
                onClick={relancerParSms}
                chargement={sms.envoi}
                aria-label={`Relancer ${bail.locataire?.nom ?? 'le locataire'} par SMS`}
              >
                {!sms.envoi && <MessageSquareText size={20} aria-hidden="true" />}
                SMS
              </Bouton>
            </>
          )}
          {impayee && (
            <div className="col-span-2">
              <Bouton variante="neutre" taille="petite" onClick={() => surEncaisser(echeance)}>
                <HandCoins size={20} aria-hidden="true" />
                Encaisser
              </Bouton>
            </div>
          )}
          {quittance && (
            <div className="col-span-2">
              <LienQuittance quittance={quittance} taille="petite" />
            </div>
          )}
        </div>
      )}
      {sms.message && (
        <p role="status" className={`mt-2 text-sm font-semibold ${sms.erreur ? 'text-retard-texte' : 'text-succes-texte'}`}>
          {sms.message}
        </p>
      )}
    </Carte>
  );
}
