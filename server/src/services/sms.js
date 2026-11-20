import bcrypt from 'bcrypt';
import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { ROLES, STATUTS_ECHEANCE } from '../constantes.js';
import { ErreurApi } from '../middlewares/erreurs.js';
import { fournisseurSms } from '../../sms/index.js';
import { montantSms, versGsm } from '../../sms/texte.js';
import { debutJourUTC, dePeriode } from '../utils/dates.js';

const JOUR_MS = 24 * 3600 * 1000;
// Au plus un rappel (automatique ou manuel) tous les 7 jours par locataire pour les envois automatiques.
const INTERVALLE_RAPPELS_AUTO_MS = 7 * JOUR_MS;
const TYPES_RAPPEL = ['RAPPEL_RETARD', 'RELANCE_MANUELLE'];

const lienConnexion = () => `${config.clientUrl}/connexion`;
const prenom = (nom) => String(nom).trim().split(/\s+/)[0];
const dateCourte = (d) => {
  const date = new Date(d);
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
};

// ---------- Textes (courts : 160 caractères = 1 SMS facturé) ----------
export function messageRetard(locataire, echeances) {
  if (echeances.length === 1) {
    const [e] = echeances;
    return `PayTonLoyer : Bonjour ${prenom(locataire.nom)}, votre loyer ${dePeriode(e.periode)} (${montantSms(e.montant)}) est en retard depuis le ${dateCourte(e.dateEcheance)}. Payez-le sur ${lienConnexion()}`;
  }
  const total = echeances.reduce((somme, e) => somme + e.montant, 0);
  return `PayTonLoyer : Bonjour ${prenom(locataire.nom)}, ${echeances.length} loyers sont en retard (${montantSms(total)} au total). Payez-les sur ${lienConnexion()}`;
}

// Formulés sans ç, ê ni ô (absents de l'alphabet SMS) pour garder un français correct sans surcoût.
export const messageCode = (locataire, code) =>
  `PayTonLoyer : Bonjour ${prenom(locataire.nom)}, votre compte locataire est créé. Connectez-vous sur ${lienConnexion()} avec votre numéro et le code ${code}.`;

export const messagePaiement = (locataire, echeance) =>
  `PayTonLoyer : votre paiement de ${montantSms(echeance.montant)} pour le loyer ${dePeriode(echeance.periode)} est bien enregistré. Merci ${prenom(locataire.nom)} ! Votre quittance est dans l'application.`;

// ---------- Envoi et journal ----------
// Ne lève jamais : un SMS raté ne doit bloquer ni un paiement ni une création de compte.
export async function envoyerSms({ proprietaireId, locataireId = null, echeanceId = null, type, telephone, message }) {
  const texte = versGsm(message);
  const trace = { proprietaireId, locataireId, echeanceId, type, telephone, message: texte, fournisseur: config.sms.fournisseur };

  // L'offre Orange « SMS Senegal » n'envoie que vers des numéros sénégalais.
  if (!telephone.startsWith('+221')) {
    await prisma.notificationSms.create({ data: { ...trace, statut: 'ECHEC', erreur: 'Numéro hors Sénégal : SMS non envoyé.' } });
    return { ok: false, erreur: 'Numéro hors Sénégal : SMS non envoyé.' };
  }
  try {
    const { idExterne } = await fournisseurSms().envoyer({ telephone, message: texte });
    await prisma.notificationSms.create({ data: { ...trace, statut: 'ENVOYE', idExterne } });
    return { ok: true };
  } catch (erreur) {
    console.error(`SMS non envoyé (${type}) à ${telephone} : ${erreur.message}`);
    await prisma.notificationSms.create({ data: { ...trace, statut: 'ECHEC', erreur: erreur.message.slice(0, 300) } });
    return { ok: false, erreur: 'Le SMS n’a pas pu être envoyé. Réessayez plus tard.' };
  }
}

function dernierRappel(locataireId) {
  return prisma.notificationSms.findFirst({
    where: { locataireId, type: { in: TYPES_RAPPEL }, statut: 'ENVOYE' },
    orderBy: { createdAt: 'desc' },
  });
}

async function retardsDuLocataire(locataireId, maintenant) {
  return prisma.echeance.findMany({
    where: { statut: STATUTS_ECHEANCE.EN_ATTENTE, dateEcheance: { lt: debutJourUTC(maintenant) }, bail: { locataireId } },
    orderBy: { periode: 'asc' },
  });
}

// ---------- Relance manuelle, depuis l'écran Paiements ----------
export async function relancerParSms(echeanceId, proprietaire, maintenant = new Date()) {
  const echeance = await prisma.echeance.findFirst({
    where: { id: echeanceId, bail: { logement: { proprietaireId: proprietaire.id } } },
    include: { bail: { include: { locataire: true } } },
  });
  if (!echeance) throw new ErreurApi(404, 'Échéance introuvable.', 'NON_TROUVE');
  if (echeance.statut !== STATUTS_ECHEANCE.EN_ATTENTE) throw new ErreurApi(409, 'Ce loyer est déjà réglé.', 'DEJA_PAYEE');

  const locataire = echeance.bail.locataire;
  const dernier = await dernierRappel(locataire.id);
  if (dernier && maintenant - dernier.createdAt < JOUR_MS) {
    throw new ErreurApi(409, 'Un SMS de rappel a déjà été envoyé à ce locataire il y a moins de 24 h.', 'SMS_TROP_RECENT');
  }
  // Le SMS récapitule tous les retards du locataire, pas seulement ce mois-ci.
  const retards = await retardsDuLocataire(locataire.id, maintenant);
  const resultat = await envoyerSms({
    proprietaireId: proprietaire.id,
    locataireId: locataire.id,
    echeanceId: echeance.id,
    type: 'RELANCE_MANUELLE',
    telephone: locataire.telephone,
    message: messageRetard(locataire, retards.length > 0 ? retards : [echeance]),
  });
  if (!resultat.ok) throw new ErreurApi(502, resultat.erreur, 'SMS_ECHEC');
}

// ---------- Rappels automatiques (chaque matin) ----------
export async function envoyerRappelsRetard({ maintenant = new Date(), pause = 250 } = {}) {
  const echeances = await prisma.echeance.findMany({
    where: {
      statut: STATUTS_ECHEANCE.EN_ATTENTE,
      dateEcheance: { lt: debutJourUTC(maintenant) },
      bail: { logement: { proprietaire: { smsAutomatiques: true } } },
    },
    orderBy: { periode: 'asc' },
    include: { bail: { include: { locataire: true, logement: { select: { proprietaireId: true } } } } },
  });

  // Un seul SMS par locataire, qui regroupe tous ses loyers en retard.
  const parLocataire = new Map();
  for (const e of echeances) {
    const cle = e.bail.locataireId;
    if (!parLocataire.has(cle)) parLocataire.set(cle, { locataire: e.bail.locataire, proprietaireId: e.bail.logement.proprietaireId, echeances: [] });
    parLocataire.get(cle).echeances.push(e);
  }

  let envoyes = 0;
  for (const { locataire, proprietaireId, echeances: retards } of parLocataire.values()) {
    const dernier = await dernierRappel(locataire.id);
    if (dernier && maintenant - dernier.createdAt < INTERVALLE_RAPPELS_AUTO_MS) continue;
    const { ok } = await envoyerSms({
      proprietaireId,
      locataireId: locataire.id,
      echeanceId: retards[0].id,
      type: 'RAPPEL_RETARD',
      telephone: locataire.telephone,
      message: messageRetard(locataire, retards),
    });
    if (ok) envoyes += 1;
    // L'API Orange accepte 5 SMS par seconde : on reste largement en dessous.
    if (pause) await new Promise((r) => setTimeout(r, pause));
  }
  return envoyes;
}

// ---------- Confirmation de paiement ----------
export async function notifierPaiementRecu(echeanceId) {
  try {
    const echeance = await prisma.echeance.findUnique({
      where: { id: echeanceId },
      include: { bail: { include: { locataire: true, logement: { include: { proprietaire: true } } } } },
    });
    const proprietaire = echeance?.bail.logement.proprietaire;
    if (!proprietaire?.smsAutomatiques) return;
    const deja = await prisma.notificationSms.findFirst({ where: { echeanceId, type: 'CONFIRMATION_PAIEMENT', statut: 'ENVOYE' } });
    if (deja) return;
    await envoyerSms({
      proprietaireId: proprietaire.id,
      locataireId: echeance.bail.locataire.id,
      echeanceId,
      type: 'CONFIRMATION_PAIEMENT',
      telephone: echeance.bail.locataire.telephone,
      message: messagePaiement(echeance.bail.locataire, echeance),
    });
  } catch (erreur) {
    console.error('Confirmation de paiement par SMS impossible', erreur);
  }
}

// ---------- Code provisoire ----------
// Le serveur ne garde que le hash du code : le propriétaire le renvoie, et il est vérifié avant l'envoi.
// Ainsi la route ne peut pas servir à envoyer un texte quelconque.
export async function envoyerCodeParSms(locataireId, code, proprietaire, maintenant = new Date()) {
  const locataire = await prisma.user.findFirst({ where: { id: locataireId, proprietaireId: proprietaire.id, role: ROLES.LOCATAIRE } });
  if (!locataire) throw new ErreurApi(404, 'Locataire introuvable.', 'NON_TROUVE');
  if (!locataire.doitChangerMotDePasse || !/^\d{6}$/.test(String(code)) || !(await bcrypt.compare(String(code), locataire.motDePasseHash))) {
    throw new ErreurApi(400, 'Ce code n’est plus le code provisoire de ce locataire.', 'CODE_INVALIDE');
  }
  const envoisDuJour = await prisma.notificationSms.count({
    where: { locataireId, type: 'CODE_PROVISOIRE', createdAt: { gte: new Date(maintenant - JOUR_MS) } },
  });
  if (envoisDuJour >= 3) throw new ErreurApi(429, 'Trois SMS de code ont déjà été envoyés aujourd’hui à ce locataire.', 'SMS_TROP_RECENT');

  const resultat = await envoyerSms({
    proprietaireId: proprietaire.id,
    locataireId,
    type: 'CODE_PROVISOIRE',
    telephone: locataire.telephone,
    message: messageCode(locataire, code),
  });
  if (!resultat.ok) throw new ErreurApi(502, resultat.erreur, 'SMS_ECHEC');
}

// ---------- Tableau de bord SMS du propriétaire ----------
export async function resumeSms(proprietaire, maintenant = new Date()) {
  const debutMois = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1));
  const [ceMois, derniers] = await Promise.all([
    prisma.notificationSms.count({ where: { proprietaireId: proprietaire.id, statut: 'ENVOYE', createdAt: { gte: debutMois } } }),
    prisma.notificationSms.findMany({
      where: { proprietaireId: proprietaire.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, type: true, telephone: true, statut: true, erreur: true, createdAt: true },
    }),
  ]);
  return { smsAutomatiques: proprietaire.smsAutomatiques, modeTest: config.sms.fournisseur === 'console', ceMois, derniers };
}
