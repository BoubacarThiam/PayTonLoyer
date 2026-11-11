// Renvoie le numéro au format international (+221771234567), ou null s'il est invalide.
// Sans indicatif, un numéro est considéré comme sénégalais (9 chiffres commençant par 7 ou 3).
export function normaliserTelephone(valeur) {
  const brut = String(valeur).replace(/[\s.\-()]/g, '');
  if (/^\+[1-9]\d{7,14}$/.test(brut)) return brut;
  if (/^00[1-9]\d{7,14}$/.test(brut)) return `+${brut.slice(2)}`;
  if (/^[73]\d{8}$/.test(brut)) return `+221${brut}`;
  return null;
}
