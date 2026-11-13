import crypto from 'node:crypto';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anonyme, creerScenario, viderBase } from './outils.js';
import { prisma } from '../src/prisma.js';
import { creerSaspay } from '../payments/saspay.js';
import { ErreurFournisseur, RESULTATS, SignatureInvalide } from '../payments/erreurs.js';

// Clés volontairement courtes : le garde-fou anti-secrets du push automatique ne doit pas les confondre avec de vraies clés.
// webhookSecret : le même que SASPAY_WEBHOOK_SECRET dans vitest.config.js, pour les tests de bout en bout.
const cfg = { apiKey: 'sk_test_x', webhookSecret: 'secret-webhook-de-test', emailClient: 'paiements@test.sn', baseUrl: 'https://api.saspay.test/api/v1' };
const demande = {
  reference: 'PTL-ABC-123',
  montant: 150000,
  description: 'Loyer novembre 2026',
  methode: 'WAVE',
  client: { nom: 'Moussa Ndiaye', telephone: '+221772222222' },
  urls: { retour: 'https://app.test/retour/PTL-ABC-123', annulation: 'a', webhook: 'w' },
};

const reponse = (status, corps) => async () => ({ ok: status < 400, status, json: async () => corps });

function signer(corpsBrut, horodatage = Math.floor(Date.now() / 1000), secret = cfg.webhookSecret) {
  return { horodatage: String(horodatage), signature: crypto.createHmac('sha256', secret).update(`${horodatage}.${corpsBrut}`).digest('hex') };
}

function requeteWebhook(corps, { horodatage, signature }) {
  const brut = JSON.stringify(corps);
  return { body: corps, rawBody: Buffer.from(brut), headers: { 'x-webhook-signature': signature, 'x-webhook-timestamp': horodatage } };
}

describe('adaptateur SasPay', () => {
  it('crée un paiement softpay avec le bon réseau, le client et une clé d’idempotence', async () => {
    let appel;
    const s = creerSaspay(cfg, {
      fetchImpl: async (url, options) => {
        appel = { url, options };
        return { ok: true, status: 201, json: async () => ({ success: true, data: { id: 'tx-1', status: 'PENDING', checkout_url: 'https://pay.saspay.me/w/1', instructions: '' }, code: 201 }) };
      },
    });
    const r = await s.initierPaiement(demande);

    expect(r).toEqual({ referenceExterne: 'tx-1', urlPaiement: 'https://pay.saspay.me/w/1', instructions: null });
    expect(appel.url).toBe('https://api.saspay.test/api/v1/payments/softpay/');
    expect(appel.options.headers.Authorization).toBe('Bearer sk_test_x');
    expect(appel.options.headers['Idempotency-Key']).toBe('PTL-ABC-123');
    const corps = JSON.parse(appel.options.body);
    expect(corps).toMatchObject({ amount: '150000.00', currency: 'XOF', country: 'SN', network: 'wave_sn' });
    expect(corps.customer).toEqual({ email: 'paiements@test.sn', first_name: 'Moussa', last_name: 'Ndiaye', phone: '+221772222222' });
  });

  it.each([
    ['ORANGE_MONEY', 'orange_sn'],
    ['FREE_MONEY', 'freemoney_sn'],
  ])('utilise le code réseau sénégalais pour %s', async (methode, code) => {
    let corps;
    const s = creerSaspay(cfg, { fetchImpl: async (u, o) => { corps = JSON.parse(o.body); return { ok: true, status: 201, json: async () => ({ success: true, data: { id: 't', checkout_url: '' } }) }; } });
    await s.initierPaiement({ ...demande, methode });
    expect(corps.network).toBe(code);
  });

  it('paiement poussé sur le téléphone : renvoie vers la page de retour avec les instructions', async () => {
    const s = creerSaspay(cfg, { fetchImpl: reponse(201, { success: true, data: { id: 'tx-2', status: 'PENDING', checkout_url: '', instructions: 'Composez #150# pour valider.' } }) });
    const r = await s.initierPaiement({ ...demande, methode: 'FREE_MONEY' });
    expect(r.urlPaiement).toBe(demande.urls.retour);
    expect(r.instructions).toBe('Composez #150# pour valider.');
  });

  it('transforme un refus en erreur lisible', async () => {
    const s = creerSaspay(cfg, { fetchImpl: reponse(422, { success: false, error: { message: 'Réseau inactif', code: 'invalid_method' }, code: 422 }) });
    await expect(s.initierPaiement(demande)).rejects.toThrow(/invalid_method.*Réseau inactif/);
    const panne = creerSaspay(cfg, { fetchImpl: async () => { throw new Error('ECONNRESET'); } });
    await expect(panne.initierPaiement(demande)).rejects.toThrow(ErreurFournisseur);
  });

  it.each([
    ['SUCCESS', RESULTATS.REUSSI],
    ['FAILED', RESULTATS.ECHOUE],
    ['CANCELLED', RESULTATS.ANNULE],
    ['PENDING', RESULTATS.EN_ATTENTE],
    ['INCONNU', RESULTATS.EN_ATTENTE],
  ])('traduit le statut %s et lit le montant demandé (hors frais)', async (status, attendu) => {
    let url;
    const s = creerSaspay(cfg, {
      fetchImpl: async (u) => {
        url = u;
        return { ok: true, status: 200, json: async () => ({ success: true, data: { id: 'tx-1', status, requested_amount: '150000.00', debited_amount: '152250.00', net_amount: '150000.00' } }) };
      },
    });
    expect(await s.verifierPaiement('tx-1')).toEqual({ statut: attendu, montant: 150000 });
    expect(url).toBe('https://api.saspay.test/api/v1/payments/tx-1/verify/');
  });

  it('accepte un webhook correctement signé', () => {
    const s = creerSaspay(cfg);
    const corps = { event: 'transaction.success', data: { id: 'tx-1', status: 'SUCCESS' } };
    const r = s.webhook(requeteWebhook(corps, signer(JSON.stringify(corps))));
    expect(r).toEqual({ idEvenement: 'transaction.success:tx-1:SUCCESS', referenceExterne: 'tx-1' });
  });

  it('rejette une signature fausse, un corps modifié ou une notification trop ancienne', () => {
    const s = creerSaspay(cfg);
    const corps = { event: 'transaction.success', data: { id: 'tx-1', status: 'SUCCESS' } };
    const brut = JSON.stringify(corps);

    expect(() => s.webhook(requeteWebhook(corps, signer(brut, undefined, 'mauvais-secret')))).toThrow(SignatureInvalide);
    const modifie = { ...corps, data: { ...corps.data, id: 'tx-pirate' } };
    expect(() => s.webhook(requeteWebhook(modifie, signer(brut)))).toThrow(SignatureInvalide);
    expect(() => s.webhook(requeteWebhook(corps, signer(brut, Math.floor(Date.now() / 1000) - 600)))).toThrow(/trop ancienne/);
    expect(() => s.webhook({ body: corps, headers: {} })).toThrow(SignatureInvalide);
  });

  it('ignore les événements qui ne concernent pas un paiement', () => {
    const s = creerSaspay(cfg);
    const corps = { event: 'webhook.test', data: {} };
    expect(s.webhook(requeteWebhook(corps, signer(JSON.stringify(corps)))).referenceExterne).toBeNull();
  });

  it('refuse une clé de production hors production, sauf accord explicite', () => {
    expect(() => creerSaspay({ ...cfg, apiKey: 'sk_live_x' })).toThrow(/production/);
    expect(() => creerSaspay({ ...cfg, apiKey: 'sk_live_x' }, { enProduction: true })).not.toThrow();
    expect(() => creerSaspay({ ...cfg, apiKey: 'sk_live_x', autoriserLive: true })).not.toThrow();
  });

  it('exige la clé et l’e-mail client', () => {
    expect(() => creerSaspay({ ...cfg, apiKey: '' })).toThrow(/SASPAY_API_KEY/);
    expect(() => creerSaspay({ ...cfg, emailClient: '' })).toThrow(/SASPAY_EMAIL_CLIENT/);
  });
});

describe('webhook SasPay de bout en bout', () => {
  beforeEach(viderBase);
  afterEach(() => vi.unstubAllGlobals());
  afterAll(() => prisma.$disconnect());

  async function paiementSaspayEnCours() {
    const s = await creerScenario();
    await prisma.paiement.create({
      data: {
        echeanceId: s.echeance.id,
        montant: s.echeance.montant,
        methode: 'WAVE',
        fournisseur: 'saspay',
        reference: `PTL-${s.echeance.id}`,
        referenceExterne: `tx-${s.echeance.id}`,
        cleEnCours: s.echeance.id,
      },
    });
    return s;
  }

  function envoyer(corps, entetes) {
    return anonyme()
      .post('/api/paiements/webhook/saspay')
      .set('Content-Type', 'application/json')
      .set('X-Webhook-Signature', entetes.signature)
      .set('X-Webhook-Timestamp', entetes.horodatage)
      .send(JSON.stringify(corps));
  }

  it('un paiement confirmé par SasPay solde le loyer et crée la quittance', async () => {
    const s = await paiementSaspayEnCours();
    const id = `tx-${s.echeance.id}`;
    vi.stubGlobal('fetch', vi.fn(reponse(200, { success: true, data: { id, status: 'SUCCESS', requested_amount: `${s.echeance.montant}.00` } })));

    const corps = { event: 'transaction.success', data: { id, status: 'SUCCESS' } };
    await envoyer(corps, signer(JSON.stringify(corps))).expect(200);

    const echeance = await prisma.echeance.findUnique({ where: { id: s.echeance.id }, include: { quittance: true } });
    expect(echeance.statut).toBe('PAYEE');
    expect(echeance.quittance).not.toBeNull();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`/payments/${id}/verify/`), expect.anything());
  });

  it('une signature falsifiée est rejetée sans rien modifier ni interroger SasPay', async () => {
    const s = await paiementSaspayEnCours();
    vi.stubGlobal('fetch', vi.fn());
    const corps = { event: 'transaction.success', data: { id: `tx-${s.echeance.id}`, status: 'SUCCESS' } };
    await envoyer(corps, signer(JSON.stringify(corps), undefined, 'secret-pirate')).expect(401);

    expect((await prisma.echeance.findUnique({ where: { id: s.echeance.id } })).statut).toBe('EN_ATTENTE');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('un webhook annonçant un succès que SasPay ne confirme pas ne solde rien', async () => {
    const s = await paiementSaspayEnCours();
    const id = `tx-${s.echeance.id}`;
    vi.stubGlobal('fetch', vi.fn(reponse(200, { success: true, data: { id, status: 'PENDING', requested_amount: '1.00' } })));
    const corps = { event: 'transaction.success', data: { id, status: 'SUCCESS' } };
    await envoyer(corps, signer(JSON.stringify(corps))).expect(200);
    expect((await prisma.echeance.findUnique({ where: { id: s.echeance.id } })).statut).toBe('EN_ATTENTE');
  });

  it('l’événement de test du tableau de bord est accepté et ignoré', async () => {
    const corps = { event: 'webhook.test', data: {} };
    const res = await envoyer(corps, signer(JSON.stringify(corps))).expect(200);
    expect(res.body.ignore).toBe(true);
  });
});
