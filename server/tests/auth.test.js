import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import bcrypt from 'bcrypt';
import { anonyme, creerScenario, session, viderBase } from './outils.js';
import { prisma } from '../src/prisma.js';

const nouveauCompte = { nom: 'Mariama Sow', telephone: '77 123 45 67', email: 'Mariama@Test.sn', motDePasse: 'motdepasse1' };

beforeEach(viderBase);
afterAll(() => prisma.$disconnect());

describe('inscription', () => {
  it('crée un propriétaire, normalise le téléphone et hache le mot de passe', async () => {
    const res = await anonyme().post('/api/auth/inscription').send(nouveauCompte).expect(201);
    expect(res.body.utilisateur.role).toBe('PROPRIETAIRE');
    expect(res.body.utilisateur.telephone).toBe('+221771234567');
    expect(res.body.utilisateur.motDePasseHash).toBeUndefined();

    const enBase = await prisma.user.findUnique({ where: { telephone: '+221771234567' } });
    expect(enBase.email).toBe('mariama@test.sn');
    expect(enBase.motDePasseHash).not.toContain('motdepasse1');
    expect(await bcrypt.compare('motdepasse1', enBase.motDePasseHash)).toBe(true);
  });

  it('pose un cookie httpOnly', async () => {
    const res = await anonyme().post('/api/auth/inscription').send(nouveauCompte).expect(201);
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
  });

  it('refuse un téléphone invalide avec un message en français', async () => {
    const res = await anonyme().post('/api/auth/inscription').send({ ...nouveauCompte, telephone: '12' }).expect(400);
    expect(res.body.champs.telephone).toMatch(/Numéro de téléphone invalide/);
  });

  it('refuse un mot de passe trop court', async () => {
    const res = await anonyme().post('/api/auth/inscription').send({ ...nouveauCompte, motDePasse: 'court' }).expect(400);
    expect(res.body.champs.motDePasse).toMatch(/8 caractères/);
  });

  it('refuse un compte déjà existant', async () => {
    await anonyme().post('/api/auth/inscription').send(nouveauCompte).expect(201);
    await anonyme().post('/api/auth/inscription').send(nouveauCompte).expect(409);
  });
});

describe('connexion', () => {
  it('accepte l’e-mail ou le téléphone du propriétaire', async () => {
    const { proprietaire } = await creerScenario();
    await anonyme().post('/api/auth/connexion').send({ identifiant: proprietaire.email, motDePasse: 'motdepasse' }).expect(200);
    await anonyme().post('/api/auth/connexion').send({ identifiant: proprietaire.telephone, motDePasse: 'motdepasse' }).expect(200);
  });

  it('donne le même message pour un mauvais mot de passe et un compte inconnu', async () => {
    const { proprietaire } = await creerScenario();
    const mauvais = await anonyme().post('/api/auth/connexion').send({ identifiant: proprietaire.email, motDePasse: 'faux' }).expect(401);
    const inconnu = await anonyme().post('/api/auth/connexion').send({ identifiant: 'x@test.sn', motDePasse: 'faux' }).expect(401);
    expect(mauvais.body.message).toBe(inconnu.body.message);
  });

  it('bloque le compte après 5 codes erronés, même avec le bon code ensuite', async () => {
    const { locataire } = await creerScenario();
    const essai = (code) => anonyme().post('/api/auth/connexion-locataire').send({ telephone: locataire.telephone, code });
    for (let i = 0; i < 5; i += 1) await essai('000000').expect(401);
    await essai('123456').expect(429);
  });

  it('n’autorise pas un propriétaire à passer par la connexion locataire', async () => {
    const { proprietaire } = await creerScenario();
    await anonyme().post('/api/auth/connexion-locataire').send({ telephone: proprietaire.telephone, code: '123456' }).expect(401);
  });
});

describe('sessions', () => {
  it('refuse une route protégée sans session ou avec un jeton falsifié', async () => {
    await anonyme().get('/api/logements').expect(401);
    await anonyme().get('/api/logements').set('Cookie', 'ptl_session=faux.jeton.signe').expect(401);
  });

  it('la déconnexion ferme la session', async () => {
    const { agentProprietaire } = await creerScenario();
    await agentProprietaire.get('/api/logements').expect(200);
    await agentProprietaire.post('/api/auth/deconnexion').expect(200);
    await agentProprietaire.get('/api/logements').expect(401);
  });

  it('impose de changer le code provisoire avant tout accès', async () => {
    const { agentProprietaire, logement } = await creerScenario();
    const libre = await prisma.logement.create({
      data: { proprietaireId: logement.proprietaireId, nom: 'Libre', adresse: 'Dakar', type: 'STUDIO', loyerMensuel: 90000 },
    });
    const { body } = await agentProprietaire
      .post('/api/locataires')
      .send({ nom: 'Ibou Ba', telephone: '784444444', logementId: libre.id, dateEntree: '2026-01-10', jourEcheance: 31 })
      .expect(201);
    expect(body.codeProvisoire).toMatch(/^\d{6}$/);

    const agent = session();
    await agent.post('/api/auth/connexion-locataire').send({ telephone: '784444444', code: body.codeProvisoire }).expect(200);
    await agent.get('/api/locataire/accueil').expect(403);
    await agent.post('/api/auth/changer-code').send({ ancien: body.codeProvisoire, nouveau: 'abc' }).expect(400);
    await agent.post('/api/auth/changer-code').send({ ancien: body.codeProvisoire, nouveau: '654321' }).expect(200);
    await agent.get('/api/locataire/accueil').expect(200);
  });
});
