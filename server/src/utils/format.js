import { dePeriode, formatDateFr } from './dates.js';

// Espace simple : les polices standard du PDF n'ont pas l'espace fine insécable.
export function formatFCFA(montant) {
  return `${String(Math.round(montant)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;
}

export function lienRappelWhatsapp({ locataire, logement, echeance, proprietaire }) {
  const message = [
    `Bonjour ${locataire.nom},`,
    `Sauf erreur de notre part, le loyer ${dePeriode(echeance.periode)} pour « ${logement.nom} » (${formatFCFA(echeance.montant)}), dû le ${formatDateFr(echeance.dateEcheance)}, n'a pas encore été réglé.`,
    'Vous pouvez le payer par Wave ou Orange Money depuis l’application PayTonLoyer.',
    `Merci d'avance. ${proprietaire.nom}`,
  ].join('\n\n');
  return `https://wa.me/${locataire.telephone.replace('+', '')}?text=${encodeURIComponent(message)}`;
}
