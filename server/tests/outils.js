import request from 'supertest';
import bcrypt from 'bcrypt';
import { creerApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { genererEcheancesBail } from '../src/services/echeances.js';

export const app = creerApp();
export const session = () => request.agent(app);
export const anonyme = () => request(app);

export async function viderBase() {
  await prisma.evenementWebhook.deleteMany();
  await prisma.quittance.deleteMany();
  await prisma.paiement.deleteMany();
  await prisma.echeance.deleteMany();
  await prisma.bail.deleteMany();
  await prisma.photoLogement.deleteMany();
  await prisma.logement.deleteMany();
  await prisma.user.deleteMany({ where: { role: 'LOCATAIRE' } });
  await prisma.user.deleteMany();
}

let compteur = 0;
const HASH = bcrypt.hashSync('motdepasse', 4);
const HASH_PIN = bcrypt.hashSync('123456', 4);

// Crée un propriétaire, un logement, un locataire et leurs échéances, avec des sessions ouvertes.
export async function creerScenario() {
  compteur += 1;
  const suffixe = String(compteur).padStart(4, '0');
  const proprietaire = await prisma.user.create({
    data: {
      role: 'PROPRIETAIRE',
      nom: `Bailleur ${suffixe}`,
      telephone: `+22177100${suffixe}`,
      email: `bailleur${suffixe}@test.sn`,
      motDePasseHash: HASH,
    },
  });
  const logement = await prisma.logement.create({
    data: { proprietaireId: proprietaire.id, nom: 'Studio', adresse: 'Dakar', type: 'STUDIO', loyerMensuel: 150000, statut: 'OCCUPE' },
  });
  const locataire = await prisma.user.create({
    data: {
      role: 'LOCATAIRE',
      nom: `Locataire ${suffixe}`,
      telephone: `+22177200${suffixe}`,
      motDePasseHash: HASH_PIN,
      proprietaireId: proprietaire.id,
    },
  });
  const entree = new Date();
  entree.setUTCMonth(entree.getUTCMonth() - 1, 1);
  const bail = await prisma.bail.create({
    data: { logementId: logement.id, locataireId: locataire.id, dateEntree: entree, jourEcheance: 5, loyerMensuel: 150000 },
  });
  await genererEcheancesBail(bail);
  const echeance = await prisma.echeance.findFirst({ where: { bailId: bail.id }, orderBy: { periode: 'asc' } });

  const agentProprietaire = session();
  await agentProprietaire.post('/api/auth/connexion').send({ identifiant: proprietaire.email, motDePasse: 'motdepasse' }).expect(200);
  const agentLocataire = session();
  await agentLocataire.post('/api/auth/connexion-locataire').send({ telephone: locataire.telephone, code: '123456' }).expect(200);

  return { proprietaire, logement, locataire, bail, echeance, agentProprietaire, agentLocataire };
}
