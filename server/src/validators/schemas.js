import { z } from 'zod';
import { METHODES_MANUELLES, METHODES_MOBILE, STATUTS_LOGEMENT, TYPES_LOGEMENT } from '../constantes.js';
import { normaliserTelephone } from '../utils/telephone.js';

const texte = (min, max, libelle) =>
  z
    .string({ error: `${libelle} est obligatoire.` })
    .trim()
    .min(min, `${libelle} est obligatoire.`)
    .max(max, `${libelle} est trop long (${max} caractères maximum).`);

export const telephone = z
  .string({ error: 'Le numéro de téléphone est obligatoire.' })
  .transform((valeur, ctx) => {
    const normalise = normaliserTelephone(valeur);
    if (!normalise) {
      ctx.addIssue({ code: 'custom', message: 'Numéro de téléphone invalide. Exemple : 77 123 45 67.' });
      return z.NEVER;
    }
    return normalise;
  });

const motDePasse = z
  .string({ error: 'Le mot de passe est obligatoire.' })
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
  .max(72, 'Le mot de passe est trop long (72 caractères maximum).');

const codePin = z.string({ error: 'Le code est obligatoire.' }).regex(/^\d{6}$/, 'Le code doit contenir 6 chiffres.');

const dateJour = (libelle) =>
  z
    .string({ error: `${libelle} est obligatoire.` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${libelle} est invalide.`)
    .transform((valeur, ctx) => {
      const date = new Date(`${valeur}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== valeur) {
        ctx.addIssue({ code: 'custom', message: `${libelle} est invalide.` });
        return z.NEVER;
      }
      return date;
    });

const montant = (libelle) =>
  z.coerce
    .number({ error: `${libelle} est invalide.` })
    .int(`${libelle} doit être un nombre entier de FCFA.`)
    .min(1000, `${libelle} doit être d’au moins 1 000 FCFA.`)
    .max(100000000, `${libelle} est trop élevé.`);

const jourEcheance = z.coerce
  .number({ error: 'Le jour d’échéance est invalide.' })
  .int('Le jour d’échéance est invalide.')
  .min(1, 'Le jour d’échéance doit être compris entre 1 et 31.')
  .max(31, 'Le jour d’échéance doit être compris entre 1 et 31.');

export const periode = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Période invalide.');

export const paramsId = z.object({ id: z.string().min(1).max(40) });

// --- Authentification ---
export const inscription = z.object({
  nom: texte(2, 100, 'Le nom'),
  telephone,
  email: z.email('Adresse e-mail invalide.').max(150).toLowerCase(),
  motDePasse,
});

export const connexion = z.object({
  identifiant: texte(3, 150, 'L’e-mail ou le téléphone'),
  motDePasse: z.string({ error: 'Le mot de passe est obligatoire.' }).min(1, 'Le mot de passe est obligatoire.').max(72),
});

export const connexionLocataire = z.object({ telephone, code: codePin });

export const changementSecret = z.object({
  ancien: z.string({ error: 'Le code actuel est obligatoire.' }).min(1, 'Le code actuel est obligatoire.').max(72),
  nouveau: z.string({ error: 'Le nouveau code est obligatoire.' }).min(1, 'Le nouveau code est obligatoire.').max(72),
});

// --- Logements ---
const champsLogement = {
  nom: texte(2, 100, 'Le nom'),
  adresse: texte(3, 200, 'L’adresse'),
  type: z.enum(TYPES_LOGEMENT, { error: 'Type de logement invalide.' }),
  loyerMensuel: montant('Le loyer'),
  description: z.string().trim().max(1000, 'La description est trop longue.').default(''),
  statut: z.enum(Object.values(STATUTS_LOGEMENT), { error: 'Statut invalide.' }).optional(),
};
export const logement = z.object(champsLogement);

// --- Locataires ---
export const nouveauLocataire = z.object({
  nom: texte(2, 100, 'Le nom'),
  telephone,
  logementId: z.string({ error: 'Veuillez choisir un logement.' }).min(1, 'Veuillez choisir un logement.').max(40),
  dateEntree: dateJour('La date d’entrée'),
  jourEcheance,
});

export const modifLocataire = z.object({
  nom: texte(2, 100, 'Le nom'),
  telephone,
  jourEcheance: jourEcheance.optional(),
});

export const affectation = z.object({
  logementId: z.string({ error: 'Veuillez choisir un logement.' }).min(1, 'Veuillez choisir un logement.').max(40),
  dateEntree: dateJour('La date d’entrée'),
  jourEcheance,
});

export const finBail = z.object({ dateSortie: dateJour('La date de sortie').optional() });

// --- Échéances et paiements ---
export const filtreEcheances = z.object({
  periode: periode.optional(),
  statut: z.enum(['EN_ATTENTE', 'EN_RETARD', 'PAYEE', 'IMPAYE']).optional(),
  locataireId: z.string().max(40).optional(),
  logementId: z.string().max(40).optional(),
});

export const paiementManuel = z.object({
  methode: z.enum(METHODES_MANUELLES, { error: 'Mode de paiement invalide.' }),
  date: dateJour('La date du paiement'),
  note: z.string().trim().max(300, 'La note est trop longue.').optional(),
});

export const initierPaiement = z.object({
  echeanceId: z.string({ error: 'Échéance manquante.' }).min(1, 'Échéance manquante.').max(40),
  methode: z.enum(METHODES_MOBILE, { error: 'Veuillez choisir Wave, Orange Money ou Free Money.' }),
});

export const paramsReference = z.object({ reference: z.string().min(1).max(60) });

export const filtrePeriode = z.object({ periode: periode.optional() });
