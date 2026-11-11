export class ErreurApi extends Error {
  constructor(message, status, code, champs) {
    super(message);
    this.status = status;
    this.code = code;
    this.champs = champs;
  }
}

async function requete(methode, chemin, corps) {
  const options = { method: methode, credentials: 'same-origin', headers: {} };
  if (corps instanceof FormData) {
    options.body = corps;
  } else if (corps !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(corps);
  }

  let reponse;
  try {
    reponse = await fetch(`/api${chemin}`, options);
  } catch {
    throw new ErreurApi('Connexion impossible. Vérifiez votre réseau et réessayez.', 0, 'RESEAU');
  }

  const donnees = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    const erreur = new ErreurApi(
      donnees?.message || 'Une erreur est survenue. Veuillez réessayer.',
      reponse.status,
      donnees?.code,
      donnees?.champs,
    );
    if (reponse.status === 401 && erreur.code === 'NON_CONNECTE') {
      window.dispatchEvent(new Event('session-expiree'));
    }
    throw erreur;
  }
  return donnees;
}

export const api = {
  get: (chemin) => requete('GET', chemin),
  post: (chemin, corps = {}) => requete('POST', chemin, corps),
  put: (chemin, corps) => requete('PUT', chemin, corps),
  supprimer: (chemin) => requete('DELETE', chemin),
};
