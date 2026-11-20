import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import sharp from 'sharp';
import { prisma } from '../src/prisma.js';
import { genererEcheancesBail } from '../src/services/echeances.js';
import { genererQuittance } from '../src/services/quittances.js';
import { ILLUSTRATIONS } from './illustrations.js';
import { decalerPeriode, periodeDe } from '../src/utils/dates.js';

if (process.env.NODE_ENV === 'production') {
  console.error('Le seed efface toutes les données : il est interdit en production.');
  process.exit(1);
}

const racine = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dossierUploads = path.join(racine, 'uploads');
const dossierQuittances = path.join(racine, 'storage', 'quittances');

async function viderDossier(dossier) {
  await fs.mkdir(dossier, { recursive: true });
  for (const nom of await fs.readdir(dossier)) {
    if (nom !== '.gitkeep') await fs.unlink(path.join(dossier, nom));
  }
}

async function creerPhotoDemo(fichier, indice) {
  await sharp(Buffer.from(ILLUSTRATIONS[indice])).webp({ quality: 78 }).toFile(path.join(dossierUploads, fichier));
}

function ilYaMois(n, jour) {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - n, jour));
}

async function main() {
  await prisma.evenementWebhook.deleteMany();
  await prisma.quittance.deleteMany();
  await prisma.paiement.deleteMany();
  await prisma.echeance.deleteMany();
  await prisma.bail.deleteMany();
  await prisma.photoLogement.deleteMany();
  await prisma.logement.deleteMany();
  await prisma.user.deleteMany({ where: { role: 'LOCATAIRE' } });
  await prisma.user.deleteMany();
  await viderDossier(dossierUploads);
  await viderDossier(dossierQuittances);

  const proprietaire = await prisma.user.create({
    data: {
      role: 'PROPRIETAIRE',
      nom: 'Mariama Sow',
      telephone: '+221770000001',
      email: 'proprietaire@demo.sn',
      motDePasseHash: await bcrypt.hash('demo1234', 10),
    },
  });

  const logementsDemo = [
    { nom: 'Appartement Sacré-Cœur', adresse: 'Sacré-Cœur 3, villa 120, Dakar', type: 'APPARTEMENT', loyerMensuel: 250000, description: 'F3 lumineux au 2e étage, deux chambres, salon, cuisine équipée.', latitude: 14.72046, longitude: -17.46794, couleur: '#15803d' },
    { nom: 'Studio Mermoz', adresse: 'Mermoz Pyrotechnie, rue 12, Dakar', type: 'STUDIO', loyerMensuel: 120000, description: 'Studio meublé proche de la VDN, eau comprise.', latitude: 14.7066, longitude: -17.4751, couleur: '#166534' },
    { nom: 'Maison Parcelles', adresse: 'Parcelles Assainies, Unité 15, Dakar', type: 'MAISON', loyerMensuel: 180000, description: 'Maison de plain-pied avec cour, trois chambres.', latitude: 14.7629, longitude: -17.4402, couleur: '#14532d' },
  ];

  const locatairesDemo = [
    { nom: 'Awa Diop', telephone: '+221771111111', code: '111111', jourEcheance: 5 },
    { nom: 'Moussa Ndiaye', telephone: '+221772222222', code: '222222', jourEcheance: 5 },
    { nom: 'Fatou Fall', telephone: '+221773333333', code: '333333', jourEcheance: 28 },
  ];

  const baux = [];
  for (const [i, demo] of logementsDemo.entries()) {
    const { couleur: _couleur, ...champs } = demo;
    const fichier = `demo-v2-logement-${i + 1}.webp`;
    await creerPhotoDemo(fichier, i);

    const logement = await prisma.logement.create({
      data: { ...champs, proprietaireId: proprietaire.id, statut: 'OCCUPE', photos: { create: [{ fichier, ordre: 0 }] } },
    });

    const infos = locatairesDemo[i];
    const locataire = await prisma.user.create({
      data: {
        role: 'LOCATAIRE',
        nom: infos.nom,
        telephone: infos.telephone,
        motDePasseHash: await bcrypt.hash(infos.code, 10),
        proprietaireId: proprietaire.id,
      },
    });

    const bail = await prisma.bail.create({
      data: {
        logementId: logement.id,
        locataireId: locataire.id,
        dateEntree: ilYaMois(4, 1),
        jourEcheance: infos.jourEcheance,
        loyerMensuel: logement.loyerMensuel,
      },
    });
    await genererEcheancesBail(bail);
    baux.push(bail);
  }

  const moisCourant = periodeDe();
  const moisPrecedent = decalerPeriode(moisCourant, -1);
  const paiementsDemo = [
    // Awa est à jour, mois courant compris
    { bail: baux[0], jusqua: moisCourant, methode: 'WAVE', fournisseur: 'simulateur' },
    // Moussa a arrêté de payer il y a deux mois : il est en retard
    { bail: baux[1], jusqua: decalerPeriode(moisCourant, -2), methode: 'ORANGE_MONEY', fournisseur: 'simulateur' },
    // Fatou paie en espèces et est à jour jusqu'au mois dernier
    { bail: baux[2], jusqua: moisPrecedent, methode: 'ESPECES', fournisseur: 'manuel' },
  ];

  const paiementsCrees = [];
  for (const { bail, jusqua, methode, fournisseur } of paiementsDemo) {
    const echeances = await prisma.echeance.findMany({
      where: { bailId: bail.id, periode: { lte: jusqua } },
      orderBy: { periode: 'asc' },
    });
    for (const echeance of echeances) {
      const date = new Date(echeance.dateEcheance);
      const paiement = await prisma.paiement.create({
        data: {
          echeanceId: echeance.id,
          montant: echeance.montant,
          methode,
          fournisseur,
          reference: `DEMO-${echeance.id}`,
          statut: 'REUSSI',
          datePaiement: date,
        },
      });
      await prisma.echeance.update({ where: { id: echeance.id }, data: { statut: 'PAYEE', payeeLe: date } });
      await genererQuittance(echeance.id);
      paiementsCrees.push(paiement);
    }
  }

  console.log(`Seed terminé : 1 propriétaire, 3 logements, 3 locataires, ${paiementsCrees.length} paiements.`);
  console.log('Propriétaire : proprietaire@demo.sn / demo1234');
  console.log('Locataires   : 77 111 11 11 / 111111 — 77 222 22 22 / 222222 — 77 333 33 33 / 333333');
}

main()
  .catch((erreur) => {
    console.error(erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
