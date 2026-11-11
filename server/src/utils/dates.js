// Dakar est à UTC+0 toute l'année : les dates sont manipulées en UTC.

export function debutJourUTC(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function periodeDe(date = new Date()) {
  const mois = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${date.getUTCFullYear()}-${mois}`;
}

export function decalerPeriode(periode, nbMois) {
  const [annee, mois] = periode.split('-').map(Number);
  return periodeDe(new Date(Date.UTC(annee, mois - 1 + nbMois, 1)));
}

// Un jour d'échéance 31 retombe sur le dernier jour des mois plus courts.
export function dateEcheancePour(periode, jour) {
  const [annee, mois] = periode.split('-').map(Number);
  const dernierJour = new Date(Date.UTC(annee, mois, 0)).getUTCDate();
  return new Date(Date.UTC(annee, mois - 1, Math.min(jour, dernierJour)));
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function libellePeriode(periode) {
  const [annee, mois] = periode.split('-').map(Number);
  return `${MOIS[mois - 1]} ${annee}`;
}

// « de novembre 2026 », « d’octobre 2026 »
export function dePeriode(periode) {
  const libelle = libellePeriode(periode);
  return /^[aeiouéàâ]/i.test(libelle) ? `d’${libelle}` : `de ${libelle}`;
}

export function formatDateFr(date) {
  const d = new Date(date);
  return `${d.getUTCDate() === 1 ? '1er' : d.getUTCDate()} ${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
