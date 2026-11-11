const UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const DIZAINES = { 2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante' };

function moinsDeCent(n) {
  if (n < 17) return UNITES[n];
  if (n < 20) return `dix-${UNITES[n - 10]}`;
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (d === 7) return n === 71 ? 'soixante et onze' : `soixante-${moinsDeCent(n - 60)}`;
  if (d === 9) return `quatre-vingt-${moinsDeCent(n - 80)}`;
  if (d === 8) return u === 0 ? 'quatre-vingts' : `quatre-vingt-${UNITES[u]}`;
  if (u === 0) return DIZAINES[d];
  return u === 1 ? `${DIZAINES[d]} et un` : `${DIZAINES[d]}-${UNITES[u]}`;
}

// « cent » et « vingt » ne prennent pas de s devant « mille ».
function moinsDeMille(n, devantMille = false) {
  const c = Math.floor(n / 100);
  const r = n % 100;
  let texte = '';
  if (c === 1) texte = 'cent';
  else if (c > 1) texte = `${UNITES[c]} cent${r === 0 && !devantMille ? 's' : ''}`;
  if (r > 0) {
    const fin = moinsDeCent(r);
    const finale = devantMille && fin === 'quatre-vingts' ? 'quatre-vingt' : fin;
    texte = texte ? `${texte} ${finale}` : finale;
  }
  return texte;
}

export function nombreEnLettres(n) {
  if (n === 0) return UNITES[0];
  const morceaux = [];
  const millions = Math.floor(n / 1000000);
  const milliers = Math.floor((n % 1000000) / 1000);
  const reste = n % 1000;
  if (millions > 0) morceaux.push(millions === 1 ? 'un million' : `${moinsDeMille(millions)} millions`);
  if (milliers > 0) morceaux.push(milliers === 1 ? 'mille' : `${moinsDeMille(milliers, true)} mille`);
  if (reste > 0) morceaux.push(moinsDeMille(reste));
  return morceaux.join(' ');
}
