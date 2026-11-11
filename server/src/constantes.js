export const ROLES = { PROPRIETAIRE: 'PROPRIETAIRE', LOCATAIRE: 'LOCATAIRE' };

export const TYPES_LOGEMENT = ['APPARTEMENT', 'MAISON', 'STUDIO', 'CHAMBRE', 'BUREAU', 'COMMERCE'];
export const STATUTS_LOGEMENT = { LIBRE: 'LIBRE', OCCUPE: 'OCCUPE' };

export const STATUTS_ECHEANCE = {
  EN_ATTENTE: 'EN_ATTENTE',
  PAYEE: 'PAYEE',
  ANNULEE: 'ANNULEE',
  // Jamais stocké : calculé à la lecture
  EN_RETARD: 'EN_RETARD',
};

export const STATUTS_PAIEMENT = {
  INITIE: 'INITIE',
  REUSSI: 'REUSSI',
  ECHOUE: 'ECHOUE',
  ANNULE: 'ANNULE',
  ANOMALIE: 'ANOMALIE',
};

export const METHODES_MOBILE = ['WAVE', 'ORANGE_MONEY', 'FREE_MONEY'];
export const METHODES_MANUELLES = ['ESPECES', 'VIREMENT'];

export const LIBELLES_METHODE = {
  WAVE: 'Wave',
  ORANGE_MONEY: 'Orange Money',
  FREE_MONEY: 'Free Money',
  ESPECES: 'Espèces',
  VIREMENT: 'Virement',
};

export const MAX_PHOTOS_PAR_LOGEMENT = 10;
// Au-delà, on ne reprend plus le paiement en cours : on en vérifie l'état et on en crée un nouveau.
export const DUREE_REPRISE_PAIEMENT_MS = 30 * 60 * 1000;
