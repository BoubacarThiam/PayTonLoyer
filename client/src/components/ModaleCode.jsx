import { MessageCircle } from 'lucide-react';
import { Bouton, LienBouton, Modale } from './ui.jsx';
import { lienWhatsapp, telephoneLisible } from '../utils/format.js';

// Le code n'est visible qu'une fois : le serveur n'en conserve que le hash.
export default function ModaleCode({ locataire, code, surFermer }) {
  const message = `Bonjour ${locataire.nom}, votre compte PayTonLoyer est prêt. Connectez-vous avec votre numéro ${telephoneLisible(locataire.telephone)} et le code provisoire ${code}. Vous choisirez ensuite votre code personnel.`;
  return (
    <Modale ouverte titre="Code provisoire" surFermer={surFermer}>
      <p className="text-secondaire">Transmettez ce code à {locataire.nom}. Il ne sera plus affiché ensuite.</p>
      <p className="my-4 rounded-xl bg-marque-50 py-4 text-center text-3xl font-bold tracking-widest text-marque-800">{code}</p>
      <div className="space-y-2">
        <LienBouton href={lienWhatsapp(locataire.telephone, message)} target="_blank" rel="noreferrer">
          <MessageCircle size={20} aria-hidden="true" />
          Envoyer par WhatsApp
        </LienBouton>
        <Bouton variante="neutre" onClick={surFermer}>Terminé</Bouton>
      </div>
    </Modale>
  );
}
