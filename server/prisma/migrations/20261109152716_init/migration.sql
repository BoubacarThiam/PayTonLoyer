-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "motDePasseHash" TEXT NOT NULL,
    "doitChangerMotDePasse" BOOLEAN NOT NULL DEFAULT false,
    "tentativesEchouees" INTEGER NOT NULL DEFAULT 0,
    "verrouilleJusqua" DATETIME,
    "proprietaireId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Logement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proprietaireId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "loyerMensuel" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "statut" TEXT NOT NULL DEFAULT 'LIBRE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Logement_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PhotoLogement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "logementId" TEXT NOT NULL,
    "fichier" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhotoLogement_logementId_fkey" FOREIGN KEY ("logementId") REFERENCES "Logement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "logementId" TEXT NOT NULL,
    "locataireId" TEXT NOT NULL,
    "dateEntree" DATETIME NOT NULL,
    "dateSortie" DATETIME,
    "jourEcheance" INTEGER NOT NULL,
    "loyerMensuel" INTEGER NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bail_logementId_fkey" FOREIGN KEY ("logementId") REFERENCES "Logement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Bail_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Echeance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bailId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "dateEcheance" DATETIME NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "payeeLe" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Echeance_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "echeanceId" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "methode" TEXT NOT NULL,
    "fournisseur" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "referenceExterne" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'INITIE',
    "cleEnCours" TEXT,
    "urlPaiement" TEXT,
    "note" TEXT,
    "datePaiement" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Paiement_echeanceId_fkey" FOREIGN KEY ("echeanceId") REFERENCES "Echeance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quittance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "echeanceId" TEXT NOT NULL,
    "paiementId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "fichier" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Quittance_echeanceId_fkey" FOREIGN KEY ("echeanceId") REFERENCES "Echeance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quittance_paiementId_fkey" FOREIGN KEY ("paiementId") REFERENCES "Paiement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvenementWebhook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fournisseur" TEXT NOT NULL,
    "idExterne" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telephone_key" ON "User"("telephone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_proprietaireId_idx" ON "User"("proprietaireId");

-- CreateIndex
CREATE INDEX "Logement_proprietaireId_idx" ON "Logement"("proprietaireId");

-- CreateIndex
CREATE INDEX "PhotoLogement_logementId_idx" ON "PhotoLogement"("logementId");

-- CreateIndex
CREATE INDEX "Bail_logementId_idx" ON "Bail"("logementId");

-- CreateIndex
CREATE INDEX "Bail_locataireId_idx" ON "Bail"("locataireId");

-- CreateIndex
CREATE INDEX "Echeance_periode_idx" ON "Echeance"("periode");

-- CreateIndex
CREATE INDEX "Echeance_statut_idx" ON "Echeance"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "Echeance_bailId_periode_key" ON "Echeance"("bailId", "periode");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_reference_key" ON "Paiement"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_referenceExterne_key" ON "Paiement"("referenceExterne");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_cleEnCours_key" ON "Paiement"("cleEnCours");

-- CreateIndex
CREATE INDEX "Paiement_echeanceId_idx" ON "Paiement"("echeanceId");

-- CreateIndex
CREATE INDEX "Paiement_statut_idx" ON "Paiement"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "Quittance_echeanceId_key" ON "Quittance"("echeanceId");

-- CreateIndex
CREATE UNIQUE INDEX "Quittance_paiementId_key" ON "Quittance"("paiementId");

-- CreateIndex
CREATE UNIQUE INDEX "Quittance_numero_key" ON "Quittance"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "EvenementWebhook_fournisseur_idExterne_key" ON "EvenementWebhook"("fournisseur", "idExterne");
