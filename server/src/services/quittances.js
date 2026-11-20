import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { LIBELLES_METHODE, STATUTS_ECHEANCE, STATUTS_PAIEMENT } from '../constantes.js';
import { dePeriode, formatDateFr } from '../utils/dates.js';
import { formatFCFA } from '../utils/format.js';
import { nombreEnLettres } from '../utils/lettres.js';

// Hors de /uploads : les quittances ne sont servies qu'après contrôle d'accès.
export const DOSSIER_QUITTANCES =
  process.env.DOSSIER_QUITTANCES || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../storage/quittances');

const VERT = '#047857';
const ENCRE = '#1a2e22';
const GRIS = '#526058';
const FILET = '#e2e8e2';

const cheminDe = (fichier) => path.join(DOSSIER_QUITTANCES, path.basename(fichier));

export const urlVerification = (numero) => `${config.clientUrl}/verifier/${encodeURIComponent(numero)}`;

// Initiales seulement : la page de vérification est publique, elle ne doit pas exposer les noms.
export function initiales(nom = '') {
  return nom
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((mot) => `${mot[0].toUpperCase()}.`)
    .join(' ');
}

// Informations publiques d'une quittance, ou null si le numéro n'existe pas.
export async function verifierQuittance(numero) {
  const q = await prisma.quittance.findUnique({
    where: { numero },
    include: {
      paiement: { select: { datePaiement: true, methode: true } },
      echeance: {
        select: {
          periode: true,
          montant: true,
          bail: { select: { locataire: { select: { nom: true } }, logement: { select: { proprietaire: { select: { nom: true } } } } } },
        },
      },
    },
  });
  if (!q) return null;
  return {
    numero: q.numero,
    periode: q.echeance.periode,
    montant: q.echeance.montant,
    datePaiement: q.paiement.datePaiement,
    methode: q.paiement.methode,
    emiseLe: q.createdAt,
    bailleur: initiales(q.echeance.bail.logement.proprietaire.nom),
    locataire: initiales(q.echeance.bail.locataire.nom),
  };
}

function dessiner(doc, { numero, echeance, paiement, bail, qrCode }) {
  const { logement, locataire } = bail;
  const bailleur = logement.proprietaire;
  const gauche = 50;
  const largeur = doc.page.width - 100;
  const lettres = nombreEnLettres(echeance.montant);
  const periode = dePeriode(echeance.periode);

  doc.rect(0, 0, doc.page.width, 90).fill(VERT);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22).text('Quittance de loyer', gauche, 28);
  doc.font('Helvetica').fontSize(11).text(`N° ${numero}`, gauche, 58);
  doc.font('Helvetica-Bold').fontSize(11).text('PayTonLoyer', gauche, 58, { width: largeur, align: 'right' });

  const haut = 120;
  const colonne = (x, titre, lignes) => {
    doc.fillColor(GRIS).font('Helvetica-Bold').fontSize(9).text(titre.toUpperCase(), x, haut, { width: largeur / 2 - 10 });
    doc.moveDown(0.3).fillColor(ENCRE).font('Helvetica-Bold').fontSize(12).text(lignes[0], { width: largeur / 2 - 10 });
    doc.font('Helvetica').fontSize(11).fillColor(GRIS);
    lignes.slice(1).forEach((l) => doc.text(l, { width: largeur / 2 - 10 }));
  };
  colonne(gauche, 'Bailleur', [bailleur.nom, bailleur.telephone]);
  colonne(gauche + largeur / 2 + 10, 'Locataire', [locataire.nom, locataire.telephone]);

  doc.fillColor(GRIS).font('Helvetica-Bold').fontSize(9).text('LOGEMENT', gauche, 200);
  doc.moveDown(0.3).fillColor(ENCRE).font('Helvetica-Bold').fontSize(12).text(logement.nom, { width: largeur });
  doc.font('Helvetica').fontSize(11).fillColor(GRIS).text(logement.adresse, { width: largeur });

  const yMontant = 265;
  doc.roundedRect(gauche, yMontant, largeur, 78, 8).fill('#f0fdf4');
  doc.fillColor(GRIS).font('Helvetica').fontSize(11).text(`Loyer ${periode}`, gauche + 16, yMontant + 12);
  doc.fillColor(ENCRE).font('Helvetica-Bold').fontSize(22).text(formatFCFA(echeance.montant), gauche + 16, yMontant + 28);
  doc.fillColor(GRIS).font('Helvetica').fontSize(10).text(`${lettres} francs CFA`, gauche + 16, yMontant + 55, { width: largeur - 32 });

  doc.fillColor(ENCRE).font('Helvetica').fontSize(11).text(
    `Je soussigné(e) ${bailleur.nom}, bailleur du logement désigné ci-dessus, déclare avoir reçu de ${locataire.nom} ` +
      `la somme de ${formatFCFA(echeance.montant)} (${lettres} francs CFA) au titre du loyer ${periode}, et lui en donne quittance, ` +
      'sous réserve de tous mes droits.',
    gauche,
    365,
    { width: largeur, lineGap: 3 },
  );

  let y = 450;
  const ligne = (libelle, valeur) => {
    doc.fillColor(GRIS).font('Helvetica').fontSize(11).text(libelle, gauche, y);
    doc.fillColor(ENCRE).font('Helvetica-Bold').fontSize(11).text(valeur, gauche + 170, y, { width: largeur - 170, align: 'right' });
    y += 24;
    doc.moveTo(gauche, y - 7).lineTo(gauche + largeur, y - 7).strokeColor(FILET).lineWidth(1).stroke();
  };
  ligne('Échéance', formatDateFr(echeance.dateEcheance));
  ligne('Date du paiement', formatDateFr(paiement.datePaiement));
  ligne('Mode de paiement', LIBELLES_METHODE[paiement.methode]);
  ligne('Référence', paiement.reference);

  // QR code de vérification : il mène à une page publique qui confirme l'authenticité de la quittance.
  if (qrCode) {
    const yQr = y + 30;
    doc.image(qrCode.image, gauche, yQr, { width: 92 });
    doc.fillColor(ENCRE).font('Helvetica-Bold').fontSize(11).text('Vérifier cette quittance', gauche + 110, yQr + 14, { width: largeur - 110 });
    doc
      .fillColor(GRIS)
      .font('Helvetica')
      .fontSize(9.5)
      .text('Scannez ce code avec un téléphone pour confirmer qu’elle a bien été émise par PayTonLoyer :', gauche + 110, yQr + 32, { width: largeur - 110 })
      .text(qrCode.url, { width: largeur - 110 });
  }

  doc.fillColor(GRIS).font('Helvetica').fontSize(9).text(
    `Quittance établie le ${formatDateFr(new Date())} via PayTonLoyer. Elle atteste du seul paiement du loyer de la période indiquée.`,
    gauche,
    doc.page.height - 80,
    { width: largeur, align: 'center', lineBreak: true },
  );
}

async function ecrirePdf(fichier, donnees) {
  await fs.promises.mkdir(DOSSIER_QUITTANCES, { recursive: true });
  const cible = cheminDe(fichier);
  const temporaire = `${cible}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  const url = urlVerification(donnees.numero);
  const qrCode = { url, image: await QRCode.toBuffer(url, { margin: 1, width: 300, color: { dark: '#10231b', light: '#ffffff' } }) };
  await new Promise((resoudre, rejeter) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: { Title: `Quittance de loyer ${donnees.numero}`, Author: 'PayTonLoyer' },
    });
    const flux = fs.createWriteStream(temporaire);
    flux.on('finish', resoudre).on('error', rejeter);
    doc.on('error', rejeter);
    doc.pipe(flux);
    dessiner(doc, { ...donnees, qrCode });
    doc.end();
  });
  await fs.promises.rename(temporaire, cible);
}

function chargerEcheance(echeanceId) {
  return prisma.echeance.findUnique({
    where: { id: echeanceId },
    include: {
      quittance: true,
      paiements: { where: { statut: STATUTS_PAIEMENT.REUSSI }, take: 1 },
      bail: { include: { locataire: true, logement: { include: { proprietaire: true } } } },
    },
  });
}

// Idempotent : une échéance n'a jamais qu'une quittance.
export async function genererQuittance(echeanceId) {
  const echeance = await chargerEcheance(echeanceId);
  const paiement = echeance?.paiements[0];
  if (!echeance || echeance.statut !== STATUTS_ECHEANCE.PAYEE || !paiement) return null;
  const donnees = { echeance, paiement, bail: echeance.bail };

  if (echeance.quittance) {
    // Fichier disparu (déploiement, purge) : on le recrée à l'identique.
    if (!fs.existsSync(cheminDe(echeance.quittance.fichier))) {
      await ecrirePdf(echeance.quittance.fichier, { ...donnees, numero: echeance.quittance.numero });
    }
    return echeance.quittance;
  }

  const numero = `Q-${echeance.periode.replace('-', '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const fichier = `${numero}.pdf`;
  await ecrirePdf(fichier, { ...donnees, numero });
  try {
    return await prisma.quittance.create({ data: { echeanceId, paiementId: paiement.id, numero, fichier } });
  } catch (erreur) {
    await fs.promises.unlink(cheminDe(fichier)).catch(() => {});
    if (erreur.code === 'P2002') return prisma.quittance.findUnique({ where: { echeanceId } });
    throw erreur;
  }
}

// Un paiement encaissé reste valide même si le PDF échoue : il sera recréé à la demande.
export async function genererQuittanceSansEchec(echeanceId) {
  try {
    return await genererQuittance(echeanceId);
  } catch (erreur) {
    console.error(`Génération de quittance impossible pour l'échéance ${echeanceId}`, erreur);
    return null;
  }
}

export const cheminQuittance = cheminDe;
