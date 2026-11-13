import crypto from 'node:crypto';
import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { DUREE_REPRISE_PAIEMENT_MS, STATUTS_ECHEANCE, STATUTS_PAIEMENT } from '../constantes.js';
import { ErreurApi } from '../middlewares/erreurs.js';
import { fournisseurActif, obtenirFournisseur } from '../../payments/index.js';
import { ErreurFournisseur, RESULTATS } from '../../payments/erreurs.js';
import { genererQuittanceSansEchec } from './quittances.js';
import { libellePeriode } from '../utils/dates.js';

export function nouvelleReference() {
  return `PTL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

// Paiement en espèces ou virement déclaré par le propriétaire.
export async function enregistrerPaiementManuel(echeance, { methode, date, note }) {
  const paiement = await prisma.$transaction(async (tx) => {
    // updateMany conditionnel : deux enregistrements simultanés ne peuvent pas réussir tous les deux.
    const { count } = await tx.echeance.updateMany({
      where: { id: echeance.id, statut: STATUTS_ECHEANCE.EN_ATTENTE },
      data: { statut: STATUTS_ECHEANCE.PAYEE, payeeLe: date },
    });
    if (count === 0) throw new ErreurApi(409, 'Cette échéance est déjà réglée ou annulée.', 'DEJA_PAYEE');

    // Un paiement en ligne resté en cours n'a plus lieu d'être.
    await tx.paiement.updateMany({
      where: { cleEnCours: echeance.id },
      data: { statut: STATUTS_PAIEMENT.ANNULE, cleEnCours: null },
    });

    return tx.paiement.create({
      data: {
        echeanceId: echeance.id,
        montant: echeance.montant,
        methode,
        fournisseur: 'manuel',
        reference: nouvelleReference(),
        statut: STATUTS_PAIEMENT.REUSSI,
        note: note || null,
        datePaiement: date,
      },
    });
  });
  await genererQuittanceSansEchec(echeance.id);
  return paiement;
}

// Applique le résultat vérifié auprès du fournisseur. Rejouable sans effet de bord.
export async function appliquerResultat(paiementId, resultat) {
  if (resultat.statut === RESULTATS.EN_ATTENTE) return false;

  const reussite = await prisma.$transaction(async (tx) => {
    const paiement = await tx.paiement.findUnique({ where: { id: paiementId } });
    if (paiement.statut === STATUTS_PAIEMENT.REUSSI || paiement.statut === STATUTS_PAIEMENT.ANOMALIE) return false;

    if (resultat.statut !== RESULTATS.REUSSI) {
      if (paiement.statut === STATUTS_PAIEMENT.INITIE) {
        await tx.paiement.update({
          where: { id: paiement.id },
          data: {
            statut: resultat.statut === RESULTATS.ANNULE ? STATUTS_PAIEMENT.ANNULE : STATUTS_PAIEMENT.ECHOUE,
            cleEnCours: null,
          },
        });
      }
      return false;
    }

    const anomalie = (note) =>
      tx.paiement.update({ where: { id: paiement.id }, data: { statut: STATUTS_PAIEMENT.ANOMALIE, cleEnCours: null, note } });

    if (resultat.montant !== paiement.montant) {
      await anomalie(`Montant reçu (${resultat.montant}) différent du montant attendu (${paiement.montant}).`);
      return false;
    }

    // Un paiement précédemment annulé peut réussir : l'argent a bien été reçu.
    const maintenant = new Date();
    const { count } = await tx.echeance.updateMany({
      where: { id: paiement.echeanceId, statut: STATUTS_ECHEANCE.EN_ATTENTE },
      data: { statut: STATUTS_ECHEANCE.PAYEE, payeeLe: maintenant },
    });
    if (count === 0) {
      await anomalie('Paiement reçu pour une échéance déjà réglée ou annulée : à rembourser.');
      return false;
    }

    await tx.paiement.update({
      where: { id: paiement.id },
      data: { statut: STATUTS_PAIEMENT.REUSSI, cleEnCours: null, datePaiement: maintenant },
    });
    return true;
  });

  if (reussite) {
    const { echeanceId } = await prisma.paiement.findUnique({ where: { id: paiementId }, select: { echeanceId: true } });
    await genererQuittanceSansEchec(echeanceId);
  }
  return reussite;
}

// Interroge le fournisseur ; une panne laisse simplement le paiement en cours.
export async function actualiserPaiement(paiement) {
  if (paiement.statut !== STATUTS_PAIEMENT.INITIE || !paiement.referenceExterne) return paiement;
  try {
    const resultat = await obtenirFournisseur(paiement.fournisseur).verifierPaiement(paiement.referenceExterne);
    await appliquerResultat(paiement.id, resultat);
  } catch (erreur) {
    if (!(erreur instanceof ErreurFournisseur)) throw erreur;
    console.warn(`Vérification impossible pour ${paiement.reference} : ${erreur.message}`);
  }
  return prisma.paiement.findUnique({ where: { id: paiement.id } });
}

async function libererPaiementEnCours(echeance, methode) {
  const enCours = await prisma.paiement.findUnique({ where: { cleEnCours: echeance.id } });
  if (!enCours) return null;

  const recent = Date.now() - enCours.createdAt.getTime() < DUREE_REPRISE_PAIEMENT_MS;
  if (recent && enCours.methode === methode && enCours.urlPaiement) return enCours;

  const actualise = await actualiserPaiement(enCours);
  if (actualise.statut === STATUTS_PAIEMENT.REUSSI) {
    throw new ErreurApi(409, 'Ce loyer vient d’être payé.', 'DEJA_PAYEE');
  }
  if (actualise.statut === STATUTS_PAIEMENT.INITIE) {
    await prisma.paiement.update({
      where: { id: enCours.id },
      data: { statut: STATUTS_PAIEMENT.ANNULE, cleEnCours: null },
    });
  }
  return null;
}

export async function initierPaiementEnLigne({ echeance, methode, locataire }) {
  if (echeance.statut !== STATUTS_ECHEANCE.EN_ATTENTE) {
    throw new ErreurApi(409, 'Ce loyer est déjà réglé.', 'DEJA_PAYEE');
  }
  const fournisseur = fournisseurActif();
  if (!fournisseur.methodes.includes(methode)) {
    throw new ErreurApi(400, 'Ce moyen de paiement n’est pas disponible.', 'METHODE_INDISPONIBLE');
  }

  const reprise = await libererPaiementEnCours(echeance, methode);
  if (reprise) return reprise;

  const reference = nouvelleReference();
  let paiement;
  try {
    // cleEnCours est unique : un double envoi simultané échoue ici.
    paiement = await prisma.paiement.create({
      data: {
        echeanceId: echeance.id,
        montant: echeance.montant,
        methode,
        fournisseur: fournisseur.nom,
        reference,
        cleEnCours: echeance.id,
      },
    });
  } catch (erreur) {
    if (erreur.code === 'P2002') throw new ErreurApi(409, 'Un paiement est déjà en cours pour ce loyer.', 'PAIEMENT_EN_COURS');
    throw erreur;
  }

  try {
    const { referenceExterne, urlPaiement, instructions } = await fournisseur.initierPaiement({
      reference,
      montant: echeance.montant,
      description: `Loyer ${libellePeriode(echeance.periode)}`,
      methode,
      client: { nom: locataire.nom, telephone: locataire.telephone },
      urls: {
        retour: `${config.clientUrl}/locataire/paiement/retour/${reference}`,
        annulation: `${config.clientUrl}/locataire/paiement/annule/${reference}`,
        webhook: `${config.apiUrl}/api/paiements/webhook/${fournisseur.nom}`,
      },
    });
    // instructions : consignes de l'opérateur pour un paiement poussé sur le téléphone (affichées au locataire).
    return await prisma.paiement.update({ where: { id: paiement.id }, data: { referenceExterne, urlPaiement, note: instructions || null } });
  } catch (erreur) {
    await prisma.paiement.update({ where: { id: paiement.id }, data: { statut: STATUTS_PAIEMENT.ECHOUE, cleEnCours: null } });
    if (erreur instanceof ErreurFournisseur) {
      console.error(`Échec d'initiation ${reference} : ${erreur.message}`);
      throw new ErreurApi(502, 'Le service de paiement ne répond pas. Veuillez réessayer dans quelques instants.', 'FOURNISSEUR_INDISPONIBLE');
    }
    throw erreur;
  }
}

// Le contenu du webhook ne sert qu'à identifier le paiement : le statut retenu
// est toujours celui que renvoie l'API du fournisseur.
export async function traiterWebhook(nomFournisseur, req) {
  const fournisseur = obtenirFournisseur(nomFournisseur);
  const { idEvenement, referenceExterne } = fournisseur.webhook(req);
  // Événement authentique mais sans lien avec un paiement (test, retrait…) : rien à faire.
  if (!referenceExterne) return { ignore: true };

  const dejaTraite = await prisma.evenementWebhook.findUnique({
    where: { fournisseur_idExterne: { fournisseur: fournisseur.nom, idExterne: idEvenement } },
  });
  if (dejaTraite) return { doublon: true };

  const paiement = await prisma.paiement.findFirst({ where: { referenceExterne, fournisseur: fournisseur.nom } });
  if (!paiement) return { ignore: true };

  const resultat = await fournisseur.verifierPaiement(referenceExterne);
  await appliquerResultat(paiement.id, resultat);

  // Enregistré après traitement : si celui-ci échoue, une nouvelle tentative du fournisseur repasse ici.
  if (resultat.statut !== RESULTATS.EN_ATTENTE) {
    await prisma.evenementWebhook
      .create({ data: { fournisseur: fournisseur.nom, idExterne: idEvenement } })
      .catch((erreur) => {
        if (erreur.code !== 'P2002') throw erreur;
      });
  }
  return { traite: true };
}
