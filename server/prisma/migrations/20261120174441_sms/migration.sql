-- CreateTable
CREATE TABLE "NotificationSms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proprietaireId" TEXT NOT NULL,
    "locataireId" TEXT,
    "echeanceId" TEXT,
    "type" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "erreur" TEXT,
    "idExterne" TEXT,
    "fournisseur" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "motDePasseHash" TEXT NOT NULL,
    "doitChangerMotDePasse" BOOLEAN NOT NULL DEFAULT false,
    "smsAutomatiques" BOOLEAN NOT NULL DEFAULT false,
    "tentativesEchouees" INTEGER NOT NULL DEFAULT 0,
    "verrouilleJusqua" DATETIME,
    "proprietaireId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "doitChangerMotDePasse", "email", "id", "motDePasseHash", "nom", "proprietaireId", "role", "telephone", "tentativesEchouees", "updatedAt", "verrouilleJusqua") SELECT "createdAt", "doitChangerMotDePasse", "email", "id", "motDePasseHash", "nom", "proprietaireId", "role", "telephone", "tentativesEchouees", "updatedAt", "verrouilleJusqua" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_telephone_key" ON "User"("telephone");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_proprietaireId_idx" ON "User"("proprietaireId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "NotificationSms_proprietaireId_createdAt_idx" ON "NotificationSms"("proprietaireId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationSms_locataireId_type_createdAt_idx" ON "NotificationSms"("locataireId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationSms_echeanceId_idx" ON "NotificationSms"("echeanceId");
