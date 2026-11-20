import { useState } from 'react';
import { MessageCircle, MessageSquareText } from 'lucide-react';
import { api } from '../api/client.js';
import { Bouton, LienBouton, Modale } from './ui.jsx';
import { lienWhatsapp, telephoneLisible } from '../utils/format.js';

// Le code n'est visible qu'une fois : le serveur n'en conserve que le hash.
export default function ModaleCode({ locataire, code, surFermer }) {
  const message = `Bonjour ${locataire.nom}, votre compte PayTonLoyer est prêt. Connectez-vous avec votre numéro ${telephoneLisible(locataire.telephone)} et le code provisoire ${code}. Vous choisirez ensuite votre code personnel.`;
  const [sms, setSms] = useState({ envoi: false, message: null, erreur: false });

  async function envoyerParSms() {
    setSms({ envoi: true, message: null, erreur: false });
    try {
      const { message: confirmation } = await api.post(`/locataires/${locataire.id}/envoyer-code`, { code });
      setSms({ envoi: false, message: confirmation, erreur: false });
    } catch (err) {
      setSms({ envoi: false, message: err.message, erreur: true });
    }
  }

  return (
    <Modale ouverte titre="Code provisoire" surFermer={surFermer}>
      <p className="text-secondaire">Transmettez ce code à {locataire.nom}. Il ne sera plus affiché ensuite.</p>
      <p className="my-4 rounded-xl bg-marque-50 py-4 text-center text-3xl font-bold tracking-widest text-marque-800">{code}</p>
      <div className="space-y-2">
        <LienBouton href={lienWhatsapp(locataire.telephone, message)} target="_blank" rel="noreferrer">
          <MessageCircle size={20} aria-hidden="true" />
          Envoyer par WhatsApp
        </LienBouton>
        <Bouton variante="secondaire" onClick={envoyerParSms} chargement={sms.envoi}>
          {!sms.envoi && <MessageSquareText size={20} aria-hidden="true" />}
          Envoyer par SMS
        </Bouton>
        {sms.message && (
          <p role="status" className={`text-center text-sm font-semibold ${sms.erreur ? 'text-retard-texte' : 'text-succes-texte'}`}>
            {sms.message}
          </p>
        )}
        <Bouton variante="neutre" onClick={surFermer}>Terminé</Bouton>
      </div>
    </Modale>
  );
}
