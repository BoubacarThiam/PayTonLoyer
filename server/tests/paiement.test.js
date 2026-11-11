import crypto from 'node:crypto';
import fs from 'node:fs';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { anonyme, creerScenario, viderBase } from './outils.js';
import { prisma } from '../src/prisma.js';
import { controleSimulateur, deciderTransaction } from '../payments/simulateur.js';
import { creerPaydunya } from '../payments/paydunya.js';
import { ErreurFournisseur, RESULTATS, SignatureInvalide } from '../payments/erreurs.js';
import { cheminQuittance } from '../src/services/quittances.js';

beforeEach(viderBase);
afterEach(() => {
  controleSimulateur.enPanne = false;
});
afterAll(() => prisma.$disconnect());

const initier = (s, methode = 'WAVE') => s.agentLocataire.post('/api/paiements/initier').send({ echeanceId: s.echeance.id, methode });
const paiementDe = (reference) => prisma.paiement.findUnique({ where: { reference } });
const echeanceDe = (s) => prisma.echeance.findUnique({ where: { id: s.echeance.id }, include: { quittance: true } });

async function notifier(s, reference, statut, montant) {
  const { referenceExterne } = await paiementDe(reference);
  const corps = deciderTransaction(referenceExterne, statut, montant);
  return anonyme().post('/api/paiements/webhook/simulateur').send(corps);
}

describe('initiation', () => {
  it('renvoie une URL de paiement et crée un paiement en cours', async () => {
    const s = await creerScenario();
    const { body } = await initier(s).expect(201);
    expect(body.urlPaiement).toContain('/api/paiements/simulateur/');
    expect((await paiementDe(body.reference)).statut).toBe('INITIE');
  });

  it('un double clic reprend le même paiement', async () => {
    const s = await creerScenario();
    const a = await initier(s).expect(201);
    const b = await initier(s).expect(201);
    expect(b.body.reference).toBe(a.body.reference);
    expect(await prisma.paiement.count({ where: { echeanceId: s.echeance.id } })).toBe(1);
  });

  it('deux demandes simultanées ne créent qu’un seul paiement en cours', async () => {
    const s = await creerScenario();
    const reponses = await Promise.all([initier(s), initier(s), initier(s)]);
    expect(reponses.some((r) => r.status === 201)).toBe(true);
    expect(await prisma.paiement.count({ where: { echeanceId: s.echeance.id, statut: 'INITIE' } })).toBe(1);
  });

  it('changer de moyen de paiement remplace le paiement en cours', async () => {
    const s = await creerScenario();
    const a = await initier(s, 'WAVE').expect(201);
    const b = await initier(s, 'ORANGE_MONEY').expect(201);
    expect(b.body.reference).not.toBe(a.body.reference);
    expect((await paiementDe(a.body.reference)).statut).toBe('ANNULE');
    expect((await paiementDe(b.body.reference)).statut).toBe('INITIE');
  });

  it('refuse une méthode inconnue et une échéance déjà payée', async () => {
    const s = await creerScenario();
    await initier(s, 'BITCOIN').expect(400);
    const { body } = await initier(s).expect(201);
    await notifier(s, body.reference, RESULTATS.REUSSI).then((r) => expect(r.status).toBe(200));
    await initier(s).expect(409);
  });

  it('libère l’échéance si le fournisseur est en panne', async () => {
    const s = await creerScenario();
    controleSimulateur.enPanne = true;
    const res = await initier(s).expect(502);
    expect(res.body.message).toMatch(/service de paiement/);
    controleSimulateur.enPanne = false;
    await initier(s).expect(201);
  });
});

describe('webhook', () => {
  it('un paiement réussi solde l’échéance et génère la quittance', async () => {
    const s = await creerScenario();
    const { body } = await initier(s).expect(201);
    await notifier(s, body.reference, RESULTATS.REUSSI).then((r) => expect(r.status).toBe(200));

    expect((await paiementDe(body.reference)).statut).toBe('REUSSI');
    const echeance = await echeanceDe(s);
    expect(echeance.statut).toBe('PAYEE');
    expect(echeance.quittance.numero).toMatch(/^Q-\d{6}-/);
    expect(fs.existsSync(cheminQuittance(echeance.quittance.fichier))).toBe(true);
  });

  it('un webhook rejoué ne produit aucun effet supplémentaire', async () => {
    const s = await creerScenario();
    const { body } = await initier(s).expect(201);
    const { referenceExterne } = await paiementDe(body.reference);
    const corps = deciderTransaction(referenceExterne, RESULTATS.REUSSI);

    await anonyme().post('/api/paiements/webhook/simulateur').send(corps).expect(200);
    const rejeu = await anonyme().post('/api/paiements/webhook/simulateur').send(corps).expect(200);
    expect(rejeu.body.doublon).toBe(true);
    expect(await prisma.quittance.count({ where: { echeanceId: s.echeance.id } })).toBe(1);
  });

  it('rejette une signature falsifiée sans rien modifier', async () => {
    const s = await creerScenario();
    const { body } = await initier(s).expect(201);
    const { referenceExterne } = await paiementDe(body.reference);
    await anonyme()
      .post('/api/paiements/webhook/simulateur')
      .send({ token: referenceExterne, statut: RESULTATS.REUSSI, signature: 'a'.repeat(64) })
      .expect(401);
    expect((await echeanceDe(s)).statut).toBe('EN_ATTENTE');
  });

  it('se fie à la vérification du fournisseur et non au contenu du webhook', async () => {
    const s = await creerScenario();
    const { body } = await initier(s).expect(201);
    const { referenceExterne } = await paiementDe(body.reference);
    // Signature valide annonçant un succès, alors que le fournisseur dit « en attente »
    const corps = deciderTransaction(referenceExterne, RESULTATS.REUSSI);
    deciderTransaction(referenceExterne, RESULTATS.EN_ATTENTE);

    await anonyme().post('/api/paiements/webhook/simulateur').send(corps).expect(200);
    expect((await echeanceDe(s)).statut).toBe('EN_ATTENTE');
    expect((await paiementDe(body.reference)).statut).toBe('INITIE');
  });

  it('un échec laisse l’échéance due et permet de réessayer', async () => {
    const s = await creerScenario();
    const { body } = await initier(s).expect(201);
    await notifier(s, body.reference, RESULTATS.ECHOUE).then((r) => expect(r.status).toBe(200));

    expect((await paiementDe(body.reference)).statut).toBe('ECHOUE');
    expect((await echeanceDe(s)).statut).toBe('EN_ATTENTE');
    const nouvel = await initier(s).expect(201);
    expect(nouvel.body.reference).not.toBe(body.reference);
  });

  it('un montant différent est signalé comme anomalie, sans quittance', async () => {
    const s = await creerScenario();
    const { body } = await initier(s).expect(201);
    await notifier(s, body.reference, RESULTATS.REUSSI, 1000).then((r) => expect(r.status).toBe(200));

    expect((await paiementDe(body.reference)).statut).toBe('ANOMALIE');
    const echeance = await echeanceDe(s);
    expect(echeance.statut).toBe('EN_ATTENTE');
    expect(echeance.quittance).toBeNull();

    const tableau = await s.agentProprietaire.get('/api/tableau-de-bord').expect(200);
    expect(tableau.body.anomalies).toHaveLength(1);
  });

  it('un paiement en ligne sur une échéance réglée en espèces devient une anomalie', async () => {
    const s = await creerScenario();
    const { body } = await initier(s).expect(201);
    await s.agentProprietaire
      .post(`/api/echeances/${s.echeance.id}/paiement-manuel`)
      .send({ methode: 'ESPECES', date: '2026-01-05' })
      .expect(201);

    await notifier(s, body.reference, RESULTATS.REUSSI).then((r) => expect(r.status).toBe(200));
    expect((await paiementDe(body.reference)).statut).toBe('ANOMALIE');
    expect(await prisma.quittance.count({ where: { echeanceId: s.echeance.id } })).toBe(1);
  });

  it('ignore une référence inconnue et un fournisseur inexistant', async () => {
    const corps = { token: 'inconnu', statut: RESULTATS.REUSSI };
    await anonyme().post('/api/paiements/webhook/simulateur').send(corps).expect(401);
    await anonyme().post('/api/paiements/webhook/constructor').send(corps).expect(404);
  });
});

describe('retour du locataire', () => {
  it('confirme le paiement même si le webhook n’est jamais arrivé', async () => {
    const s = await creerScenario();
    const { body } = await initier(s).expect(201);
    const { referenceExterne } = await paiementDe(body.reference);
    deciderTransaction(referenceExterne, RESULTATS.REUSSI);

    const res = await s.agentLocataire.get(`/api/paiements/${body.reference}`).expect(200);
    expect(res.body.paiement.statut).toBe('REUSSI');
    expect(res.body.quittance.numero).toBeTruthy();
  });

  it('l’annulation libère l’échéance', async () => {
    const s = await creerScenario();
    const { body } = await initier(s).expect(201);
    const res = await s.agentLocataire.post(`/api/paiements/${body.reference}/annuler`).expect(200);
    expect(res.body.paiement.statut).toBe('ANNULE');
    await initier(s).expect(201);
  });

  it('une annulation après un paiement validé ne l’efface pas', async () => {
    const s = await creerScenario();
    const { body } = await initier(s).expect(201);
    const { referenceExterne } = await paiementDe(body.reference);
    deciderTransaction(referenceExterne, RESULTATS.REUSSI);

    const res = await s.agentLocataire.post(`/api/paiements/${body.reference}/annuler`).expect(200);
    expect(res.body.paiement.statut).toBe('REUSSI');
  });
});

describe('paiement manuel', () => {
  it('solde l’échéance, génère la quittance et refuse le doublon', async () => {
    const s = await creerScenario();
    const url = `/api/echeances/${s.echeance.id}/paiement-manuel`;
    const { body } = await s.agentProprietaire.post(url).send({ methode: 'ESPECES', date: '2026-01-05' }).expect(201);
    expect(body.echeance.statutReel).toBe('PAYEE');
    expect(body.echeance.quittance.numero).toBeTruthy();
    await s.agentProprietaire.post(url).send({ methode: 'ESPECES', date: '2026-01-05' }).expect(409);
  });

  it('refuse une date future et un mode invalide', async () => {
    const s = await creerScenario();
    const url = `/api/echeances/${s.echeance.id}/paiement-manuel`;
    await s.agentProprietaire.post(url).send({ methode: 'ESPECES', date: '2099-01-01' }).expect(400);
    await s.agentProprietaire.post(url).send({ methode: 'WAVE', date: '2026-01-01' }).expect(400);
  });
});

describe('adaptateur PayDunya', () => {
  const cfg = { mode: 'test', masterKey: 'maitre', privateKey: 'prive', token: 'jeton', storeName: 'Test', canaux: {} };
  const repondre = (corps) => async () => ({ status: 200, json: async () => corps });
  const demande = { reference: 'R1', montant: 150000, description: 'Loyer', methode: 'WAVE', client: { nom: 'A', telephone: '+221' }, urls: { retour: 'r', annulation: 'a', webhook: 'w' } };

  it('appelle le bac à sable en mode test, avec les clés en en-têtes', async () => {
    let appel;
    const p = creerPaydunya(cfg, async (url, options) => {
      appel = { url, options };
      return { status: 200, json: async () => ({ response_code: '00', response_text: 'https://paie.test/x', token: 'T1' }) };
    });
    const r = await p.initierPaiement(demande);
    expect(r).toEqual({ referenceExterne: 'T1', urlPaiement: 'https://paie.test/x' });
    expect(appel.url).toBe('https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create');
    expect(appel.options.headers['PAYDUNYA-MASTER-KEY']).toBe('maitre');
    const corps = JSON.parse(appel.options.body);
    expect(corps.invoice.total_amount).toBe(150000);
    expect(corps.actions.callback_url).toBe('w');
    expect(corps.invoice.channels).toBeUndefined();
  });

  it('utilise l’API réelle uniquement en mode live', async () => {
    let url;
    const p = creerPaydunya({ ...cfg, mode: 'live' }, async (u) => {
      url = u;
      return { status: 200, json: async () => ({ response_code: '00', status: 'pending', invoice: { total_amount: '1000' } }) };
    });
    await p.verifierPaiement('T1');
    expect(url).toBe('https://app.paydunya.com/api/v1/checkout-invoice/confirm/T1');
  });

  it.each([
    ['completed', RESULTATS.REUSSI],
    ['failed', RESULTATS.ECHOUE],
    ['cancelled', RESULTATS.ANNULE],
    ['pending', RESULTATS.EN_ATTENTE],
    ['statut-inconnu', RESULTATS.EN_ATTENTE],
  ])('traduit le statut %s', async (status, attendu) => {
    const p = creerPaydunya(cfg, repondre({ response_code: '00', status, invoice: { total_amount: '150000.00' } }));
    expect(await p.verifierPaiement('T1')).toEqual({ statut: attendu, montant: 150000 });
  });

  it('signale un refus et une panne réseau', async () => {
    await expect(creerPaydunya(cfg, repondre({ response_code: '1001', response_text: 'Refus' })).initierPaiement(demande)).rejects.toThrow(ErreurFournisseur);
    await expect(
      creerPaydunya(cfg, async () => {
        throw new Error('réseau');
      }).verifierPaiement('T1'),
    ).rejects.toThrow(ErreurFournisseur);
  });

  it('valide le hash du webhook et rejette un hash faux', () => {
    const p = creerPaydunya(cfg, repondre({}));
    const hash = crypto.createHash('sha512').update('maitre').digest('hex');
    const req = { body: { data: { hash, status: 'completed', invoice: { token: 'T1' } } } };
    expect(p.webhook(req)).toEqual({ idEvenement: 'T1:completed', referenceExterne: 'T1' });
    expect(() => p.webhook({ body: { data: { hash: 'faux', invoice: { token: 'T1' } } } })).toThrow(SignatureInvalide);
    expect(() => p.webhook({ body: {} })).toThrow(SignatureInvalide);
  });

  it('refuse de démarrer sans clés', () => {
    expect(() => creerPaydunya({ ...cfg, masterKey: '' })).toThrow(/Clés PayDunya/);
  });
});
