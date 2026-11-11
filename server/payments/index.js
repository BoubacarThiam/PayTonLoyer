// Point d'entrée unique des paiements. Tout fournisseur expose la même interface :
//
//   nom                 identifiant stocké avec chaque paiement
//   methodes            moyens de paiement proposés au locataire
//   initierPaiement({ reference, montant, description, methode, client, urls })
//                       -> { referenceExterne, urlPaiement }
//   verifierPaiement(referenceExterne)
//                       -> { statut: REUSSI | ECHOUE | ANNULE | EN_ATTENTE, montant }
//   webhook(req)        authentifie la notification (lève SignatureInvalide)
//                       -> { idEvenement, referenceExterne }
//
// Pour ajouter un agrégateur : créer un module avec cette interface et l'ajouter ci-dessous.
import { config } from '../src/config.js';
import { creerPaydunya } from './paydunya.js';
import { simulateur } from './simulateur.js';

const FOURNISSEURS = {
  simulateur: () => {
    if (config.enProduction) throw new Error('Le simulateur de paiement est interdit en production.');
    return simulateur;
  },
  paydunya: () => creerPaydunya(config.paiement.paydunya),
};

const instances = new Map();

export function obtenirFournisseur(nom) {
  if (!FOURNISSEURS[nom]) throw new Error(`Fournisseur de paiement inconnu : ${nom}`);
  if (!instances.has(nom)) instances.set(nom, FOURNISSEURS[nom]());
  return instances.get(nom);
}

export const fournisseurActif = () => obtenirFournisseur(config.paiement.fournisseur);

export const fournisseurExiste = (nom) => Object.hasOwn(FOURNISSEURS, nom);
