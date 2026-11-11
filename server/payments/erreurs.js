// Le fournisseur est injoignable ou a refusé la demande.
export class ErreurFournisseur extends Error {}

// La notification reçue n'est pas authentique.
export class SignatureInvalide extends Error {}

// Résultats possibles de verifierPaiement
export const RESULTATS = { REUSSI: 'REUSSI', ECHOUE: 'ECHOUE', ANNULE: 'ANNULE', EN_ATTENTE: 'EN_ATTENTE' };
