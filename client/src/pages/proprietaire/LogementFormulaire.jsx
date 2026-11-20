import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ImagePlus, Trash2 } from 'lucide-react';
import { api } from '../../api/client.js';
import { Bouton, Champ, EnTete, Liste, MessageErreur, Modale, Squelettes, ZoneTexte } from '../../components/ui.jsx';
import { TYPES_LOGEMENT } from '../../utils/format.js';
import CartePosition from '../../components/CartePosition.jsx';

const VIDE = { nom: '', adresse: '', type: 'APPARTEMENT', loyerMensuel: '', description: '', statut: 'LIBRE' };

export default function LogementFormulaire() {
  const { id } = useParams();
  const edition = Boolean(id);
  const naviguer = useNavigate();
  const inputPhotos = useRef(null);
  const [v, setV] = useState(VIDE);
  const [logement, setLogement] = useState(null);
  const [chargement, setChargement] = useState(edition);
  const [envoi, setEnvoi] = useState(false);
  const [envoiPhotos, setEnvoiPhotos] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [confirmeSuppression, setConfirmeSuppression] = useState(false);

  function remplir(l) {
    setLogement(l);
    setV({ nom: l.nom, adresse: l.adresse, type: l.type, loyerMensuel: String(l.loyerMensuel), description: l.description, statut: l.statut });
  }

  useEffect(() => {
    if (!edition) return;
    api.get(`/logements/${id}`).then(({ logement: l }) => remplir(l)).catch(setErreur).finally(() => setChargement(false));
  }, [edition, id]);

  const champ = (nom) => ({
    value: v[nom],
    onChange: (e) => setV((p) => ({ ...p, [nom]: e.target.value })),
    erreur: erreur?.champs?.[nom],
  });

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const corps = { ...v, loyerMensuel: v.loyerMensuel.replace(/\s/g, '') };
    try {
      if (edition) {
        await api.put(`/logements/${id}`, corps);
        naviguer('/proprietaire/logements');
      } else {
        // On reste sur la fiche créée pour pouvoir y ajouter des photos.
        const { logement: l } = await api.post('/logements', corps);
        naviguer(`/proprietaire/logements/${l.id}`, { replace: true });
      }
    } catch (err) {
      setErreur(err);
    } finally {
      setEnvoi(false);
    }
  }

  async function ajouterPhotos(e) {
    const fichiers = [...e.target.files];
    e.target.value = '';
    if (fichiers.length === 0) return;
    const form = new FormData();
    fichiers.forEach((f) => form.append('photos', f));
    setErreur(null);
    setEnvoiPhotos(true);
    try {
      const { logement: l } = await api.post(`/logements/${id}/photos`, form);
      setLogement(l);
    } catch (err) {
      setErreur(err);
    } finally {
      setEnvoiPhotos(false);
    }
  }

  async function retirerPhoto(photoId) {
    setErreur(null);
    try {
      const { logement: l } = await api.supprimer(`/logements/${id}/photos/${photoId}`);
      setLogement(l);
    } catch (err) {
      setErreur(err);
    }
  }

  async function supprimer() {
    setErreur(null);
    try {
      await api.supprimer(`/logements/${id}`);
      naviguer('/proprietaire/logements', { replace: true });
    } catch (err) {
      setConfirmeSuppression(false);
      setErreur(err);
    }
  }

  if (chargement) return <><EnTete titre="Logement" retour /><div className="p-4"><Squelettes /></div></>;

  return (
    <>
      <EnTete titre={edition ? 'Modifier le logement' : 'Nouveau logement'} retour="/proprietaire/logements" />
      <main className="px-4">
        {erreur && !erreur.champs && <MessageErreur erreur={erreur} />}

        {edition && logement && (
          <section className="mb-5" aria-label="Photos du logement">
            <h2 className="mb-2 font-medium">Photos ({logement.photos.length}/10)</h2>
            <div className="grid grid-cols-3 gap-2">
              {logement.photos.map((p) => (
                <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-marque-100">
                  <img src={p.url} alt="Photo du logement" loading="lazy" className="size-full object-cover" />
                  <button type="button" onClick={() => retirerPhoto(p.id)} aria-label="Supprimer cette photo" className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-full bg-black/60 text-white">
                    <Trash2 size={20} aria-hidden="true" />
                  </button>
                </div>
              ))}
              {logement.photos.length < 10 && (
                <button
                  type="button"
                  onClick={() => inputPhotos.current.click()}
                  disabled={envoiPhotos}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-marque-700 text-sm font-medium text-marque-800"
                >
                  <ImagePlus size={24} aria-hidden="true" />
                  {envoiPhotos ? 'Envoi…' : 'Ajouter'}
                </button>
              )}
            </div>
            <input ref={inputPhotos} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={ajouterPhotos} />
          </section>
        )}

        {edition && logement && (
          <section className="mb-5" aria-label="Localisation du logement">
            <h2 className="mb-2 font-medium">Localisation</h2>
            <CartePosition logement={logement} />
          </section>
        )}

        <form onSubmit={soumettre} noValidate>
          <Champ libelle="Nom du logement" placeholder="Appartement Sacré-Cœur" {...champ('nom')} />
          <Champ libelle="Adresse" {...champ('adresse')} />
          <Liste libelle="Type" {...champ('type')}>
            {Object.entries(TYPES_LOGEMENT).map(([cle, libelle]) => <option key={cle} value={cle}>{libelle}</option>)}
          </Liste>
          <Champ libelle="Loyer mensuel (FCFA)" inputMode="numeric" placeholder="150000" {...champ('loyerMensuel')} />
          <ZoneTexte libelle="Description (facultatif)" {...champ('description')} />
          {edition && (
            <Liste libelle="Statut" {...champ('statut')}>
              <option value="LIBRE">Libre</option>
              <option value="OCCUPE">Occupé</option>
            </Liste>
          )}
          {!edition && <p className="mb-4 text-sm text-secondaire">Vous pourrez ajouter des photos à l’étape suivante.</p>}
          <Bouton type="submit" chargement={envoi}>Enregistrer</Bouton>
        </form>

        {edition && (
          <div className="mt-3">
            <Bouton variante="danger" onClick={() => setConfirmeSuppression(true)}>Supprimer ce logement</Bouton>
          </div>
        )}
      </main>

      <Modale ouverte={confirmeSuppression} titre="Supprimer ce logement ?" surFermer={() => setConfirmeSuppression(false)}>
        <p className="mb-4 text-secondaire">Le logement et ses photos seront définitivement supprimés.</p>
        <div className="space-y-2">
          <Bouton variante="danger" onClick={supprimer}>Oui, supprimer</Bouton>
          <Bouton variante="neutre" onClick={() => setConfirmeSuppression(false)}>Annuler</Bouton>
        </div>
      </Modale>
    </>
  );
}
