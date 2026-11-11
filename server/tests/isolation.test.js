import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { creerScenario, viderBase } from './outils.js';
import { prisma } from '../src/prisma.js';
import { genererQuittance } from '../src/services/quittances.js';
import { DOSSIER_UPLOADS } from '../src/services/images.js';

beforeEach(viderBase);
afterAll(() => prisma.$disconnect());

describe('isolation des données', () => {
  it('un propriétaire ne peut ni voir ni modifier le logement d’un autre', async () => {
    const a = await creerScenario();
    const b = await creerScenario();
    await b.agentProprietaire.get(`/api/logements/${a.logement.id}`).expect(404);
    await b.agentProprietaire
      .put(`/api/logements/${a.logement.id}`)
      .send({ nom: 'Piraté', adresse: 'Ailleurs', type: 'STUDIO', loyerMensuel: 1000 })
      .expect(404);
    await b.agentProprietaire.delete(`/api/logements/${a.logement.id}`).expect(404);

    const { body } = await b.agentProprietaire.get('/api/logements').expect(200);
    expect(body.logements.map((l) => l.id)).toEqual([b.logement.id]);
  });

  it('un propriétaire ne peut pas accéder au locataire ni encaisser l’échéance d’un autre', async () => {
    const a = await creerScenario();
    const b = await creerScenario();
    await b.agentProprietaire.get(`/api/locataires/${a.locataire.id}`).expect(404);
    await b.agentProprietaire.post(`/api/locataires/${a.locataire.id}/reinitialiser-code`).expect(404);
    await b.agentProprietaire
      .post(`/api/echeances/${a.echeance.id}/paiement-manuel`)
      .send({ methode: 'ESPECES', date: '2026-01-01' })
      .expect(404);

    const { body } = await b.agentProprietaire.get('/api/echeances').expect(200);
    expect(body.echeances.every((e) => e.bail.locataire.id === b.locataire.id)).toBe(true);
  });

  it('un locataire n’accède pas aux routes propriétaire', async () => {
    const { agentLocataire } = await creerScenario();
    await agentLocataire.get('/api/logements').expect(403);
    await agentLocataire.get('/api/locataires').expect(403);
    await agentLocataire.get('/api/tableau-de-bord').expect(403);
  });

  it('un propriétaire ne peut pas initier un paiement de locataire', async () => {
    const { agentProprietaire, echeance } = await creerScenario();
    await agentProprietaire.post('/api/paiements/initier').send({ echeanceId: echeance.id, methode: 'WAVE' }).expect(403);
  });

  it('un locataire ne peut ni payer ni consulter l’échéance d’un autre', async () => {
    const a = await creerScenario();
    const b = await creerScenario();
    await b.agentLocataire.post('/api/paiements/initier').send({ echeanceId: a.echeance.id, methode: 'WAVE' }).expect(404);

    const { body } = await a.agentLocataire.post('/api/paiements/initier').send({ echeanceId: a.echeance.id, methode: 'WAVE' }).expect(201);
    await b.agentLocataire.get(`/api/paiements/${body.reference}`).expect(404);
  });

  it('une quittance n’est accessible qu’au locataire et au propriétaire concernés', async () => {
    const a = await creerScenario();
    const b = await creerScenario();
    await a.agentProprietaire
      .post(`/api/echeances/${a.echeance.id}/paiement-manuel`)
      .send({ methode: 'ESPECES', date: '2026-01-05' })
      .expect(201);
    const quittance = await prisma.quittance.findUnique({ where: { echeanceId: a.echeance.id } });

    await b.agentLocataire.get(`/api/quittances/${quittance.id}/pdf`).expect(404);
    await b.agentProprietaire.get(`/api/quittances/${quittance.id}/pdf`).expect(404);
    await a.agentProprietaire.get(`/api/quittances/${quittance.id}/pdf`).expect(200);
    const res = await a.agentLocataire.get(`/api/quittances/${quittance.id}/pdf`).expect(200);
    expect(res.headers['content-type']).toMatch(/pdf/);
  });

  it('une quittance n’est pas générée pour une échéance impayée', async () => {
    const { echeance } = await creerScenario();
    expect(await genererQuittance(echeance.id)).toBeNull();
  });
});

describe('photos', () => {
  it('compresse une photo en WebP et limite sa taille', async () => {
    const { agentProprietaire, logement } = await creerScenario();
    const image = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#15803d' } }).png().toBuffer();
    const { body } = await agentProprietaire
      .post(`/api/logements/${logement.id}/photos`)
      .attach('photos', image, { filename: 'photo.png', contentType: 'image/png' })
      .expect(201);

    const fichier = path.join(DOSSIER_UPLOADS, path.basename(body.logement.photos[0].url));
    const meta = await sharp(fs.readFileSync(fichier)).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(1280);
  });

  it('refuse un faux fichier image', async () => {
    const { agentProprietaire, logement } = await creerScenario();
    await agentProprietaire
      .post(`/api/logements/${logement.id}/photos`)
      .attach('photos', Buffer.from('ceci n’est pas une image'), { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .expect(400);
  });
});
