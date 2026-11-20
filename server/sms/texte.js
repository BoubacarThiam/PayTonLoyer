// Un SMS en alphabet GSM tient en 160 caractères ; un seul caractère hors GSM (ê, ç, «…) le fait
// passer en Unicode, limité à 70 caractères : le message coûte alors deux ou trois fois plus cher.
// On remplace donc ces caractères par leur équivalent le plus proche, en gardant é, è, à, ù, présents en GSM.
const REMPLACEMENTS = {
  â: 'a', ä: 'a', ê: 'e', ë: 'e', î: 'i', ï: 'i', ô: 'o', ö: 'o', û: 'u', ü: 'u', ç: 'c', ÿ: 'y',
  Â: 'A', À: 'A', Ê: 'E', È: 'E', Ë: 'E', Î: 'I', Ï: 'I', Ô: 'O', Û: 'U', Ù: 'U', Ç: 'C',
  œ: 'oe', Œ: 'OE', æ: 'ae', '’': "'", '‘': "'", '«': '"', '»': '"', '“': '"', '”': '"', '–': '-', '—': '-',
  '…': '...', ' ': ' ', ' ': ' ',
};

const GSM = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà",
);

export function versGsm(texte) {
  return [...String(texte)]
    .map((c) => (GSM.has(c) ? c : (REMPLACEMENTS[c] ?? (c.normalize('NFD').replace(/[̀-ͯ]/g, '') || '?'))))
    .map((c) => (GSM.has(c) || c.length > 1 ? c : '?'))
    .join('');
}

export const estGsm = (texte) => [...texte].every((c) => GSM.has(c));

// Montant avec espaces simples (l'espace insécable n'existe pas en GSM).
export const montantSms = (montant) => `${String(Math.round(montant)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;
