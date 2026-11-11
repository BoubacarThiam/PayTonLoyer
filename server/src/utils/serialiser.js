export function utilisateurPublic(user) {
  return {
    id: user.id,
    role: user.role,
    nom: user.nom,
    telephone: user.telephone,
    email: user.email,
    doitChangerMotDePasse: user.doitChangerMotDePasse,
  };
}

export function logementPublic(logement) {
  const { photos, ...reste } = logement;
  return {
    ...reste,
    photos: (photos || []).map((p) => ({ id: p.id, url: `/uploads/${p.fichier}`, ordre: p.ordre })),
  };
}

// Champs d'un paiement qu'on peut montrer aux deux parties.
export function paiementPublic(p) {
  if (!p) return null;
  return {
    id: p.id,
    reference: p.reference,
    montant: p.montant,
    methode: p.methode,
    fournisseur: p.fournisseur,
    statut: p.statut,
    note: p.note,
    datePaiement: p.datePaiement,
    createdAt: p.createdAt,
  };
}
