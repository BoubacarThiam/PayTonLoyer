import { Router } from 'express';
import { prisma } from '../prisma.js';
import { MAX_PHOTOS_PAR_LOGEMENT, ROLES, STATUTS_ECHEANCE, STATUTS_LOGEMENT } from '../constantes.js';
import { ErreurApi, nonTrouve } from '../middlewares/erreurs.js';
import { exigerAuth, exigerRole } from '../middlewares/auth.js';
import { valider } from '../middlewares/valider.js';
import { uploadPhotos } from '../middlewares/upload.js';
import * as s from '../validators/schemas.js';
import { enregistrerPhoto, supprimerPhoto } from '../services/images.js';
import { geocoder } from '../services/geocodage.js';
import { logementPublic } from '../utils/serialiser.js';
import { periodeDe } from '../utils/dates.js';

const router = Router();
router.use(exigerAuth, exigerRole(ROLES.PROPRIETAIRE));

const inclusions = {
  photos: { orderBy: { ordre: 'asc' } },
  baux: { where: { actif: true }, include: { locataire: { select: { id: true, nom: true, telephone: true } } } },
};

function serialiser(logement) {
  const { baux, ...reste } = logement;
  return { ...logementPublic(reste), locataireActuel: baux?.[0]?.locataire ?? null };
}

async function trouverLogement(id, proprietaireId) {
  const logement = await prisma.logement.findFirst({ where: { id, proprietaireId }, include: inclusions });
  if (!logement) throw nonTrouve('Logement introuvable.');
  return logement;
}

router.get('/', async (req, res) => {
  const logements = await prisma.logement.findMany({
    where: { proprietaireId: req.user.id },
    include: inclusions,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ logements: logements.map(serialiser) });
});

// Position estimée depuis l'adresse ; null si introuvable (la carte n'est alors pas affichée).
async function positionner(logementId, adresse) {
  const position = await geocoder(adresse);
  return prisma.logement.update({
    where: { id: logementId },
    data: { latitude: position?.latitude ?? null, longitude: position?.longitude ?? null },
    include: inclusions,
  });
}

router.post('/', valider({ body: s.logement }), async (req, res) => {
  const cree = await prisma.logement.create({ data: { ...req.valide.body, proprietaireId: req.user.id } });
  const logement = await positionner(cree.id, cree.adresse);
  res.status(201).json({ logement: serialiser(logement) });
});

router.get('/:id', valider({ params: s.paramsId }), async (req, res) => {
  res.json({ logement: serialiser(await trouverLogement(req.valide.params.id, req.user.id)) });
});

router.put('/:id', valider({ params: s.paramsId, body: s.logement }), async (req, res) => {
  const actuel = await trouverLogement(req.valide.params.id, req.user.id);
  const donnees = req.valide.body;
  const bailActif = actuel.baux[0];

  if (bailActif && donnees.statut === STATUTS_LOGEMENT.LIBRE) {
    throw new ErreurApi(409, 'Ce logement a un locataire : mettez d’abord fin à son bail.', 'LOGEMENT_OCCUPE');
  }

  const logement = await prisma.$transaction(async (tx) => {
    // Un nouveau loyer vaut pour les mois à venir, jamais pour les mois déjà échus.
    if (bailActif && donnees.loyerMensuel !== actuel.loyerMensuel) {
      await tx.bail.update({ where: { id: bailActif.id }, data: { loyerMensuel: donnees.loyerMensuel } });
      await tx.echeance.updateMany({
        where: { bailId: bailActif.id, statut: STATUTS_ECHEANCE.EN_ATTENTE, periode: { gt: periodeDe() } },
        data: { montant: donnees.loyerMensuel },
      });
    }
    return tx.logement.update({ where: { id: actuel.id }, data: donnees, include: inclusions });
  });
  // On ne relance la recherche de position que si l'adresse change ou n'avait pas été trouvée.
  const aPositionner = donnees.adresse !== actuel.adresse || actuel.latitude == null;
  res.json({ logement: serialiser(aPositionner ? await positionner(logement.id, logement.adresse) : logement) });
});

router.delete('/:id', valider({ params: s.paramsId }), async (req, res) => {
  const logement = await trouverLogement(req.valide.params.id, req.user.id);
  const nbBaux = await prisma.bail.count({ where: { logementId: logement.id } });
  if (nbBaux > 0) {
    throw new ErreurApi(409, 'Ce logement a un historique de location : il ne peut pas être supprimé.', 'LOGEMENT_AVEC_HISTORIQUE');
  }
  await prisma.logement.delete({ where: { id: logement.id } });
  await Promise.all(logement.photos.map((p) => supprimerPhoto(p.fichier)));
  res.json({ ok: true });
});

router.post('/:id/photos', valider({ params: s.paramsId }), uploadPhotos, async (req, res) => {
  const logement = await trouverLogement(req.valide.params.id, req.user.id);
  const fichiers = req.files || [];
  if (fichiers.length === 0) throw new ErreurApi(400, 'Veuillez sélectionner au moins une photo.', 'UPLOAD');
  if (logement.photos.length + fichiers.length > MAX_PHOTOS_PAR_LOGEMENT) {
    throw new ErreurApi(400, `Un logement peut avoir ${MAX_PHOTOS_PAR_LOGEMENT} photos au maximum.`, 'UPLOAD');
  }

  const enregistres = [];
  try {
    for (const f of fichiers) enregistres.push(await enregistrerPhoto(f.buffer));
  } catch (erreur) {
    await Promise.all(enregistres.map(supprimerPhoto));
    throw erreur;
  }

  const depart = logement.photos.reduce((max, p) => Math.max(max, p.ordre + 1), 0);
  await prisma.photoLogement.createMany({
    data: enregistres.map((fichier, i) => ({ logementId: logement.id, fichier, ordre: depart + i })),
  });
  res.status(201).json({ logement: serialiser(await trouverLogement(logement.id, req.user.id)) });
});

router.delete('/:id/photos/:photoId', async (req, res) => {
  const logement = await trouverLogement(req.params.id, req.user.id);
  const photo = logement.photos.find((p) => p.id === req.params.photoId);
  if (!photo) throw nonTrouve('Photo introuvable.');
  await prisma.photoLogement.delete({ where: { id: photo.id } });
  await supprimerPhoto(photo.fichier);
  res.json({ logement: serialiser(await trouverLogement(logement.id, req.user.id)) });
});

export default router;
