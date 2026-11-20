// Position GPS d'une adresse via Nominatim (OpenStreetMap), gratuit et sans clé.
// Règles d'usage de Nominatim : 1 requête par seconde au plus, un User-Agent identifiant l'application,
// mise en cache des résultats et attribution « © contributeurs OpenStreetMap » sur les cartes.
const URL_NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const AGENT = 'PayTonLoyer/1.0 (+https://github.com/BoubacarThiam/PayTonLoyer)';
const INTERVALLE_MS = 1100;
const DELAI_MS = 8000;

const cache = new Map();
let derniereRequete = Promise.resolve();

// Les adresses sénégalaises mêlent souvent quartier, numéro de villa et rue, que Nominatim connaît mal.
// On essaie donc l'adresse complète, puis sans les parties numérotées, puis le seul nom de quartier.
export function variantesAdresse(adresse) {
  const parties = adresse.split(',').map((p) => p.trim()).filter(Boolean);
  const sansNumeros = parties.filter((p) => !/\d|\b(villa|rue|lot|immeuble|appartement|app)\b/i.test(p));
  const variantes = [parties.join(', ')];
  if (sansNumeros.length > 0) variantes.push(sansNumeros.join(', '));
  if (sansNumeros.length > 1 && sansNumeros[0].includes(' ')) {
    variantes.push([sansNumeros[0].split(/\s+/)[0], ...sansNumeros.slice(1)].join(', '));
  }
  return [...new Set(variantes)];
}

// Une requête à la fois, espacées d'au moins une seconde, quel que soit le nombre d'appels simultanés.
function enFile(tache) {
  const resultat = derniereRequete.then(tache);
  derniereRequete = resultat.catch(() => {}).then(() => new Promise((r) => setTimeout(r, INTERVALLE_MS)));
  return resultat;
}

async function chercher(requete, fetchImpl) {
  const url = `${URL_NOMINATIM}?format=jsonv2&limit=1&countrycodes=sn&accept-language=fr&q=${encodeURIComponent(requete)}`;
  const reponse = await fetchImpl(url, { headers: { 'User-Agent': AGENT }, signal: AbortSignal.timeout(DELAI_MS) });
  if (!reponse.ok) return null;
  const [premier] = await reponse.json();
  if (!premier) return null;
  return { latitude: Number(premier.lat), longitude: Number(premier.lon) };
}

// Renvoie { latitude, longitude } ou null. Ne lève jamais : une adresse introuvable n'empêche rien.
export async function geocoder(adresse, { fetchImpl = (...a) => fetch(...a), actif = process.env.GEOCODAGE_ACTIF !== 'non' } = {}) {
  if (!actif || !adresse) return null;
  const cle = adresse.trim().toLowerCase();
  if (cache.has(cle)) return cache.get(cle);

  let position = null;
  for (const variante of variantesAdresse(adresse)) {
    try {
      position = await enFile(() => chercher(variante, fetchImpl));
    } catch {
      position = null;
    }
    if (position) break;
  }
  cache.set(cle, position);
  return position;
}
