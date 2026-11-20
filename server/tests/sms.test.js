import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { creerScenario, viderBase } from './outils.js';
import { prisma } from '../src/prisma.js';
import { estGsm, versGsm } from '../sms/texte.js';
import { creerOrangeSms } from '../sms/orange.js';
import { smsEnvoyes } from '../sms/console.js';
import { ErreurFournisseur } from '../payments/erreurs.js';
import { envoyerRappelsRetard, messageCode, messagePaiement, messageRetard } from '../src/services/sms.js';

const JOUR = 24 * 3600 * 1000;
const json = (status, corps, entetes = {}) => ({ ok: status < 400, status, json: async () => corps, headers: { get: (n) => entetes[n.toLowerCase()] ?? null } });
const activerSms = (proprietaireId, actif = true) => prisma.user.update({ where: { id: proprietaireId }, data: { smsAutomatiques: actif } });
const sms = (where) => prisma.notificationSms.findMany({ where, orderBy: { createdAt: 'asc' } });

describe('textes SMS', () => {
  it('remplace les caractères qui feraient passer le SMS en Unicode (plus cher)', () => {
    expect(versGsm('Votre compte est prêt d’ici «demain» ç œ')).toBe('Votre compte est pret d\'ici "demain" c oe');
    expect(versGsm('é è à ù restent')).toBe('é è à ù restent');
  });

  it('les messages tiennent en un SMS et restent en alphabet GSM', () => {
    const locataire = { nom: 'Moussa Ndiaye' };
    const echeance = { periode: '2026-10', montant: 120000, dateEcheance: new Date('2026-10-05') };
    for (const m of [messageRetard(locataire, [echeance]), messageCode(locataire, '123456'), messagePaiement(locataire, echeance)]) {
      const texte = versGsm(m);
      expect(estGsm(texte)).toBe(true);
      expect(texte.length).toBeLessThanOrEqual(160);
    }
    expect(versGsm(messageRetard(locataire, [echeance]))).toContain("loyer d'octobre 2026 (120 000 FCFA)");
    // Aucun mot ne doit perdre son accent : les messages n'emploient que des lettres de l'alphabet SMS.
    for (const m of [messageCode(locataire, '123456'), messagePaiement(locataire, echeance)]) expect(versGsm(m)).toBe(m.replace(/’/g, "'"));
  });
});

describe('adaptateur Orange SMS', () => {
  const cfg = { clientId: 'id-test', clientSecret: 'secret-test', senderAddress: 'tel:+2210000' };

  it('obtient un jeton OAuth2 puis envoie au format de l’API, en réutilisant le jeton', async () => {
    const appels = [];
    const fetchImpl = async (url, options) => {
      appels.push({ url, options });
      if (url.includes('/oauth/')) return json(200, { access_token: 'jeton-1', expires_in: '3600' });
      return json(201, {}, { location: 'https://api.orange.com/smsmessaging/v1/outbound/tel:+2210000/requests/abc-123' });
    };
    const orange = creerOrangeSms(cfg, { fetchImpl });
    expect(await orange.envoyer({ telephone: '+221772222222', message: 'Bonjour' })).toEqual({ idExterne: 'abc-123' });
    await orange.envoyer({ telephone: '+221771111111', message: 'Re' });

    const jetons = appels.filter((a) => a.url.includes('/oauth/'));
    expect(jetons).toHaveLength(1);
    expect(jetons[0].options.headers.Authorization).toBe(`Basic ${Buffer.from('id-test:secret-test').toString('base64')}`);
    expect(jetons[0].options.body).toBe('grant_type=client_credentials');

    const envoi = appels[1];
    expect(envoi.url).toBe('https://api.orange.com/smsmessaging/v1/outbound/tel%3A%2B2210000/requests');
    expect(envoi.options.headers.Authorization).toBe('Bearer jeton-1');
    expect(JSON.parse(envoi.options.body)).toEqual({
      outboundSMSMessageRequest: { address: 'tel:+221772222222', senderAddress: 'tel:+2210000', outboundSMSTextMessage: { message: 'Bonjour' } },
    });
  });

  it('redemande un jeton une fois si Orange le juge expiré', async () => {
    let jetons = 0;
    let envois = 0;
    const fetchImpl = async (url) => {
      if (url.includes('/oauth/')) return json(200, { access_token: `jeton-${++jetons}`, expires_in: 3600 });
      envois += 1;
      return envois === 1 ? json(401, { code: 42, message: 'Expired credentials' }) : json(201, {});
    };
    await creerOrangeSms(cfg, { fetchImpl }).envoyer({ telephone: '+221772222222', message: 'x' });
    expect(jetons).toBe(2);
    expect(envois).toBe(2);
  });

  it('signale un refus ou des identifiants manquants', async () => {
    const refus = async (url) => (url.includes('/oauth/') ? json(200, { access_token: 't' }) : json(400, { requestError: { serviceException: { text: 'Invalid senderName' } } }));
    await expect(creerOrangeSms(cfg, { fetchImpl: refus }).envoyer({ telephone: '+221772222222', message: 'x' })).rejects.toThrow(/Invalid senderName/);
    const authRefusee = async () => json(401, { message: 'Invalid credentials' });
    await expect(creerOrangeSms(cfg, { fetchImpl: authRefusee }).envoyer({ telephone: '+221772222222', message: 'x' })).rejects.toThrow(ErreurFournisseur);
    expect(() => creerOrangeSms({ clientId: '', clientSecret: '' })).toThrow(/ORANGE_SMS_CLIENT_ID/);
  });
});

describe('SMS dans l’application', () => {
  beforeEach(async () => {
    await viderBase();
    smsEnvoyes.length = 0;
  });
  afterAll(() => prisma.$disconnect());

  it('relance manuelle : un SMS récapitulant les retards, puis refus pendant 24 h', async () => {
    const s = await creerScenario();
    await s.agentProprietaire.post(`/api/echeances/${s.echeance.id}/rappel-sms`).expect(201);

    expect(smsEnvoyes).toHaveLength(1);
    expect(smsEnvoyes[0].telephone).toBe(s.locataire.telephone);
    expect(smsEnvoyes[0].message).toMatch(/loyers sont en retard|en retard depuis/);
    const res = await s.agentProprietaire.post(`/api/echeances/${s.echeance.id}/rappel-sms`).expect(409);
    expect(res.body.message).toMatch(/moins de 24 h/);
  });

  it('un propriétaire ne peut pas relancer le locataire d’un autre', async () => {
    const a = await creerScenario();
    const b = await creerScenario();
    await b.agentProprietaire.post(`/api/echeances/${a.echeance.id}/rappel-sms`).expect(404);
    expect(smsEnvoyes).toHaveLength(0);
  });

  it('rappels automatiques : seulement si activés, un SMS par locataire, au plus un par semaine', async () => {
    const s = await creerScenario();
    expect(await envoyerRappelsRetard({ pause: 0 })).toBe(0);

    await activerSms(s.proprietaire.id);
    expect(await envoyerRappelsRetard({ pause: 0 })).toBe(1);
    expect(smsEnvoyes).toHaveLength(1);
    expect(await envoyerRappelsRetard({ pause: 0 })).toBe(0);
    expect(await envoyerRappelsRetard({ pause: 0, maintenant: new Date(Date.now() + 8 * JOUR) })).toBe(1);
  });

  it('confirmation de paiement envoyée au locataire si les SMS automatiques sont actifs', async () => {
    const s = await creerScenario();
    await s.agentProprietaire.post(`/api/echeances/${s.echeance.id}/paiement-manuel`).send({ methode: 'ESPECES', date: '2026-01-05' }).expect(201);
    await new Promise((r) => setTimeout(r, 200));
    expect(await sms({ type: 'CONFIRMATION_PAIEMENT' })).toHaveLength(0);

    const t = await creerScenario();
    await activerSms(t.proprietaire.id);
    await t.agentProprietaire.post(`/api/echeances/${t.echeance.id}/paiement-manuel`).send({ methode: 'ESPECES', date: '2026-01-05' }).expect(201);
    await vi.waitFor(async () => expect(await sms({ type: 'CONFIRMATION_PAIEMENT', statut: 'ENVOYE' })).toHaveLength(1));
    expect(smsEnvoyes.at(-1).message).toContain('est bien enregistré');
  });

  it('code provisoire : envoyé seulement si c’est bien le code du locataire, 3 fois par jour au plus', async () => {
    const s = await creerScenario();
    const libre = await prisma.logement.create({ data: { proprietaireId: s.proprietaire.id, nom: 'Libre', adresse: 'Dakar', type: 'STUDIO', loyerMensuel: 90000 } });
    const { body } = await s.agentProprietaire
      .post('/api/locataires')
      .send({ nom: 'Ibou Ba', telephone: '784444444', logementId: libre.id, dateEntree: '2026-01-10', jourEcheance: 5 })
      .expect(201);
    const id = body.locataire.id;

    await s.agentProprietaire.post(`/api/locataires/${id}/envoyer-code`).send({ code: '000000' }).expect(400);
    await s.agentProprietaire.post(`/api/locataires/${id}/envoyer-code`).send({ code: 'texte libre' }).expect(400);
    for (let i = 0; i < 3; i += 1) await s.agentProprietaire.post(`/api/locataires/${id}/envoyer-code`).send({ code: body.codeProvisoire }).expect(201);
    await s.agentProprietaire.post(`/api/locataires/${id}/envoyer-code`).send({ code: body.codeProvisoire }).expect(429);
    expect(smsEnvoyes.every((m) => m.message.includes(body.codeProvisoire))).toBe(true);
  });

  it('un numéro hors Sénégal n’est pas envoyé mais reste tracé', async () => {
    const s = await creerScenario();
    await prisma.user.update({ where: { id: s.locataire.id }, data: { telephone: '+33612345678' } });
    const res = await s.agentProprietaire.post(`/api/echeances/${s.echeance.id}/rappel-sms`).expect(502);
    expect(res.body.message).toMatch(/hors Sénégal/);
    expect(smsEnvoyes).toHaveLength(0);
    expect(await sms({ statut: 'ECHEC' })).toHaveLength(1);
  });

  it('réglages : le propriétaire active les SMS et voit son compteur ; un locataire n’y a pas accès', async () => {
    const s = await creerScenario();
    const avant = await s.agentProprietaire.get('/api/sms').expect(200);
    expect(avant.body).toMatchObject({ smsAutomatiques: false, modeTest: true, ceMois: 0 });
    const apres = await s.agentProprietaire.put('/api/sms/preferences').send({ smsAutomatiques: true }).expect(200);
    expect(apres.body.smsAutomatiques).toBe(true);
    await s.agentLocataire.get('/api/sms').expect(403);
  });
});
