// Équivalents du loyer en euros et en dollars, à titre indicatif.
// Le franc CFA (XOF) est arrimé à l'euro : 1 € = 655,957 FCFA, taux officiel fixe, sans API.
// Le dollar vient de Frankfurter (taux de référence de la Banque centrale européenne), gratuit et sans clé.
export const FCFA_PAR_EURO = 655.957;
const URL_FRANKFURTER = 'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD';
const DUREE_CACHE_MS = 6 * 3600 * 1000;

let cache = null;

export async function tauxDeChange({ fetchImpl = (...a) => fetch(...a), maintenant = Date.now() } = {}) {
  if (cache && maintenant - cache.obtenuLe < DUREE_CACHE_MS) return cache.valeur;

  const valeur = { fcfaParEuro: FCFA_PAR_EURO, fcfaParDollar: null, dateDollar: null, source: 'BCE via Frankfurter' };
  try {
    const reponse = await fetchImpl(URL_FRANKFURTER, { signal: AbortSignal.timeout(8000) });
    const donnees = await reponse.json();
    const dollarsParEuro = Number(donnees?.rates?.USD);
    if (reponse.ok && dollarsParEuro > 0) {
      valeur.fcfaParDollar = Math.round((FCFA_PAR_EURO / dollarsParEuro) * 1000) / 1000;
      valeur.dateDollar = donnees.date;
    }
  } catch {
    // Service injoignable : l'euro reste disponible, le dollar est simplement omis.
  }
  // Un échec n'est gardé que 10 minutes, pour retenter rapidement.
  cache = { valeur, obtenuLe: valeur.fcfaParDollar ? maintenant : maintenant - DUREE_CACHE_MS + 10 * 60 * 1000 };
  return valeur;
}

export function viderCacheDevises() {
  cache = null;
}
