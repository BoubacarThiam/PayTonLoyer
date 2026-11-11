// Espace insécable : le montant ne se coupe jamais en fin de ligne.
export function fcfa(montant) {
  return `${String(Math.round(montant ?? 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;
}

// Montant sans l'unité, pour les grands chiffres où « FCFA » est composé plus petit.
export function nombre(montant) {
  return String(Math.round(montant ?? 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function moisCourt(periode) {
  const [annee, mois] = periode.split('-').map(Number);
  return { mois: ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEP', 'OCT', 'NOV', 'DÉC'][mois - 1], annee };
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function dateFr(valeur) {
  if (!valeur) return '';
  const d = new Date(valeur);
  const jour = d.getUTCDate();
  return `${jour === 1 ? '1er' : jour} ${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function libellePeriode(periode) {
  const [annee, mois] = periode.split('-').map(Number);
  return `${MOIS[mois - 1]} ${annee}`;
}

// « de novembre 2026 », « d’octobre 2026 »
export function dePeriode(periode) {
  const libelle = libellePeriode(periode);
  return /^[aeiouéàâ]/i.test(libelle) ? `d’${libelle}` : `de ${libelle}`;
}

export function periodeCourante() {
  return new Date().toISOString().slice(0, 7);
}

export function decalerPeriode(periode, n) {
  const [annee, mois] = periode.split('-').map(Number);
  return new Date(Date.UTC(annee, mois - 1 + n, 1)).toISOString().slice(0, 7);
}

export const aujourdhuiIso = () => new Date().toISOString().slice(0, 10);

export function telephoneLisible(tel) {
  if (!tel) return '';
  const m = tel.match(/^\+221(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : tel;
}

export function lienWhatsapp(telephone, message) {
  return `https://wa.me/${telephone.replace('+', '')}?text=${encodeURIComponent(message)}`;
}

export const TYPES_LOGEMENT = {
  APPARTEMENT: 'Appartement',
  MAISON: 'Maison',
  STUDIO: 'Studio',
  CHAMBRE: 'Chambre',
  BUREAU: 'Bureau',
  COMMERCE: 'Commerce',
};

export const METHODES = {
  WAVE: 'Wave',
  ORANGE_MONEY: 'Orange Money',
  FREE_MONEY: 'Free Money',
  ESPECES: 'Espèces',
  VIREMENT: 'Virement',
};
