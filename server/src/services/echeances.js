import { prisma } from '../prisma.js';
import { STATUTS_ECHEANCE } from '../constantes.js';
import { dateEcheancePour, debutJourUTC, decalerPeriode, periodeDe } from '../utils/dates.js';

// Statut affiché : « en retard » dépend de la date du jour, il n'est donc pas stocké.
export function statutReel(echeance, maintenant = new Date()) {
  if (echeance.statut === STATUTS_ECHEANCE.EN_ATTENTE && new Date(echeance.dateEcheance) < debutJourUTC(maintenant)) {
    return STATUTS_ECHEANCE.EN_RETARD;
  }
  return echeance.statut;
}

export function avecStatutReel(echeance, maintenant = new Date()) {
  return { ...echeance, statutReel: statutReel(echeance, maintenant) };
}

// Crée les échéances manquantes d'un bail, du mois d'entrée jusqu'au mois suivant
// le mois courant. Relançable sans risque grâce à l'unicité (bailId, periode).
export async function genererEcheancesBail(bail, maintenant = new Date()) {
  if (!bail.actif) return 0;

  const dateEntree = debutJourUTC(new Date(bail.dateEntree));
  const derniere = decalerPeriode(periodeDe(maintenant), 1);
  const existantes = await prisma.echeance.findMany({ where: { bailId: bail.id }, select: { periode: true } });
  const dejaLa = new Set(existantes.map((e) => e.periode));

  let creees = 0;
  for (let periode = periodeDe(dateEntree); periode <= derniere; periode = decalerPeriode(periode, 1)) {
    if (dejaLa.has(periode)) continue;
    const date = dateEcheancePour(periode, bail.jourEcheance);
    try {
      await prisma.echeance.create({
        data: {
          bailId: bail.id,
          periode,
          montant: bail.loyerMensuel,
          // Une entrée en cours de mois ne peut pas être due avant l'entrée.
          dateEcheance: date < dateEntree ? dateEntree : date,
        },
      });
      creees += 1;
    } catch (erreur) {
      // Course avec une autre génération : l'échéance existe déjà.
      if (erreur.code !== 'P2002') throw erreur;
    }
  }
  return creees;
}

export async function genererToutesLesEcheances(maintenant = new Date()) {
  const baux = await prisma.bail.findMany({ where: { actif: true } });
  let total = 0;
  for (const bail of baux) total += await genererEcheancesBail(bail, maintenant);
  return total;
}
