import fs from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { anonyme, creerScenario, viderBase } from './outils.js';
import { prisma } from '../src/prisma.js';
import { geocoder, variantesAdresse } from '../src/services/geocodage.js';
import { FCFA_PAR_EURO, tauxDeChange, viderCacheDevises } from '../src/services/devises.js';
import { cheminQuittance, initiales } from '../src/services/quittances.js';

const json = (status, corps) => ({ ok: status < 400, status, json: async () => corps });

describe('géocodage (OpenStreetMap)', () => {
  it('essaie l’adresse complète, puis sans les parties numérotées, puis le seul quartier', () => {
    expect(variantesAdresse('Mermoz Pyrotechnie, rue 12, Dakar')).toEqual(['Mermoz Pyrotechnie, rue 12, Dakar', 'Mermoz Pyrotechnie, Dakar', 'Mermoz, Dakar']);
    expect(variantesAdresse('Sacré-Cœur 3, villa 120, Dakar')).toEqual(['Sacré-Cœur 3, villa 120, Dakar', 'Dakar']);
  });

  it('passe à la variante suivante quand une adresse n’est pas trouvée', async () => {
    const requetes = [];
    const fetchImpl = async (url, options) => {
      requetes.push({ q: decodeURIComponent(new URL(url).searchParams.get('q')), agent: options.headers['User-Agent'] });
      return requetes.length === 1 ? json(200, []) : json(200, [{ lat: '14.7066', lon: '-17.4751' }]);
    };
    const position = await geocoder('Zone Test, rue 9, Dakar', { fetchImpl, actif: true });
    expect(position).toEqual({ latitude: 14.7066, longitude: -17.4751 });
    expect(requetes.map((r) => r.q)).toEqual(['Zone Test, rue 9, Dakar', 'Zone Test, Dakar']);
    // Nominatim exige un User-Agent qui identifie l'application.
    expect(requetes[0].agent).toMatch(/^PayTonLoyer\//);
  });

  it('ne bloque jamais : panne ou désactivation renvoient null', async () => {
    const panne = async () => {
      throw new Error('ECONNRESET');
    };
    expect(await geocoder('Adresse en panne, Dakar', { fetchImpl: panne, actif: true })).toBeNull();
    expect(await geocoder('Sacré-Cœur, Dakar', { actif: false })).toBeNull();
  });
});

describe('taux de change', () => {
  beforeEach(viderCacheDevises);

  it('euro au taux fixe officiel, dollar calculé depuis le taux BCE', async () => {
    const t = await tauxDeChange({ fetchImpl: async () => json(200, { base: 'EUR', date: '2026-11-20', rates: { USD: 1.099 } }) });
    expect(t.fcfaParEuro).toBe(655.957);
    expect(t.fcfaParDollar).toBeCloseTo(FCFA_PAR_EURO / 1.099, 2);
    expect(t.dateDollar).toBe('2026-11-20');
  });

  it('garde l’euro si le service de change est injoignable', async () => {
    const t = await tauxDeChange({
      fetchImpl: async () => {
        throw new Error('hors ligne');
      },
    });
    expect(t).toMatchObject({ fcfaParEuro: 655.957, fcfaParDollar: null });
  });
});

describe('vérification publique des quittances', () => {
  beforeEach(viderBase);
  afterAll(() => prisma.$disconnect());

  async function quittancePayee() {
    const s = await creerScenario();
    await s.agentProprietaire.post(`/api/echeances/${s.echeance.id}/paiement-manuel`).send({ methode: 'ESPECES', date: '2026-01-05' }).expect(201);
    return { s, quittance: await prisma.quittance.findUnique({ where: { echeanceId: s.echeance.id } }) };
  }

  it('confirme une quittance authentique sans exposer les noms', async () => {
    const { s, quittance } = await quittancePayee();
    const { body } = await anonyme().get(`/api/quittances/verifier/${quittance.numero}`).expect(200);

    expect(body.quittance).toMatchObject({ numero: quittance.numero, montant: s.echeance.montant, methode: 'ESPECES' });
    expect(body.quittance.locataire).toBe(initiales(s.locataire.nom));
    expect(JSON.stringify(body)).not.toContain(s.locataire.nom);
    expect(JSON.stringify(body)).not.toContain(s.locataire.telephone);
  });

  it('répond « introuvable » pour un numéro inconnu ou mal formé', async () => {
    await anonyme().get('/api/quittances/verifier/Q-202601-ABCDEF').expect(404);
    await anonyme().get('/api/quittances/verifier/n-importe-quoi').expect(404);
  });

  it('imprime un QR code dans le PDF de la quittance', async () => {
    const { quittance } = await quittancePayee();
    const pdf = fs.readFileSync(cheminQuittance(quittance.fichier)).toString('latin1');
    expect(pdf).toContain('/Subtype /Image');
  });

  it('un logement sans position trouvée reste enregistré', async () => {
    const { agentProprietaire } = await creerScenario();
    const { body } = await agentProprietaire.post('/api/logements').send({ nom: 'Local', adresse: 'Quartier inconnu, Dakar', type: 'BUREAU', loyerMensuel: 50000 }).expect(201);
    expect(body.logement).toMatchObject({ latitude: null, longitude: null });
  });
});
