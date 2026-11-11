# PayTonLoyer

Plateforme de gestion locative pour le Sénégal et l'Afrique de l'Ouest. Les propriétaires suivent leurs logements, leurs locataires et leurs encaissements ; les locataires paient leur loyer par Mobile Money et récupèrent leurs quittances.

Application web mobile installable (PWA), entièrement en français.

## Fonctionnalités

**Propriétaire**

- Tableau de bord du mois : loyers attendus, encaissés, impayés, arriérés
- Logements avec photos compressées à l'envoi
- Locataires, affectation à un logement, fin de bail
- Échéances mensuelles générées automatiquement
- Suivi des paiements (payé, en attente, en retard) et historique par locataire
- Enregistrement des paiements en espèces ou par virement
- Rappel WhatsApp pré-rempli pour les retards
- Quittances PDF

**Locataire**

- Connexion par téléphone et code à 6 chiffres
- Logement, loyer et prochaine échéance
- Paiement Wave, Orange Money ou Free Money
- Historique et téléchargement des quittances

## Prérequis

- Node.js 20 ou plus récent
- npm

## Installation

```bash
npm run installer
```

Copier ensuite le fichier d'environnement :

```bash
# macOS / Linux / Git Bash
cp server/.env.example server/.env

# PowerShell
Copy-Item server/.env.example server/.env
```

Dans `server/.env`, remplacer `JWT_SECRET` par une valeur aléatoire :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Créer la base et charger les données de démonstration :

```bash
cd server
npx prisma migrate deploy
npx prisma generate
npm run db:seed
cd ..
```

> **Windows :** éviter de placer le projet dans un dossier synchronisé (OneDrive, Dropbox). La synchronisation peut verrouiller la base SQLite et `node_modules`.

## Lancement

### Développement

```bash
npm run dev
```

- Application : <http://localhost:5173>
- API : <http://localhost:4000>

Le service worker n'est actif que sur la version compilée.

### Production

```bash
npm run build
npm start
```

Le serveur distribue alors le client compilé sur le port `PORT`. En production :

- définir `NODE_ENV=production` et un `JWT_SECRET` d'au moins 32 caractères ;
- servir l'application en **HTTPS**, sans quoi le cookie de session n'est pas envoyé ;
- configurer un fournisseur réel : le serveur refuse de démarrer avec le simulateur ;
- sauvegarder la base, `server/uploads/` et `server/storage/quittances/`.

## Comptes de démonstration

| Rôle | Identifiant | Secret | Situation |
|---|---|---|---|
| Propriétaire | `proprietaire@demo.sn` | `demo1234` | 3 logements |
| Locataire | `77 111 11 11` | `111111` | Awa Diop, à jour |
| Locataire | `77 222 22 22` | `222222` | Moussa Ndiaye, en retard |
| Locataire | `77 333 33 33` | `333333` | Fatou Fall, paie en espèces |

`npm run seed` réinitialise toutes les données (commande bloquée en production).

## Variables d'environnement

Fichier `server/.env` :

| Variable | Rôle | Défaut |
|---|---|---|
| `NODE_ENV` | `development`, `test` ou `production` | `development` |
| `PORT` | Port de l'API | `4000` |
| `CLIENT_URL` | URL publique de l'application (retours de paiement) | `http://localhost:5173` |
| `API_URL` | URL publique de l'API, joignable par l'agrégateur | `http://localhost:4000` |
| `DATABASE_URL` | Base de données | `file:./dev.db` |
| `JWT_SECRET` | Secret de signature des sessions | obligatoire |
| `JWT_DUREE` | Durée de session | `7d` |
| `PAIEMENT_FOURNISSEUR` | `simulateur` ou `paydunya` | `simulateur` |
| `PAYDUNYA_MODE` | `test` (sandbox) ou `live` | `test` |
| `PAYDUNYA_MASTER_KEY` | Clé principale PayDunya | |
| `PAYDUNYA_PRIVATE_KEY` | Clé privée PayDunya | |
| `PAYDUNYA_PUBLIC_KEY` | Clé publique PayDunya | |
| `PAYDUNYA_TOKEN` | Token PayDunya | |
| `PAYDUNYA_STORE_NAME` | Nom affiché sur la page de paiement | `PayTonLoyer` |
| `PAYDUNYA_CANAL_WAVE` | Limite la page à ce canal (facultatif) | vide |
| `PAYDUNYA_CANAL_ORANGE_MONEY` | Idem pour Orange Money | vide |
| `PAYDUNYA_CANAL_FREE_MONEY` | Idem pour Free Money | vide |

## Paiement Mobile Money

Le code se trouve dans `server/payments/`. Chaque fournisseur expose la même interface : `initierPaiement`, `verifierPaiement` et `webhook`. Pour en ajouter un, créer un module avec ces fonctions et l'enregistrer dans `server/payments/index.js`.

### Simulateur (par défaut)

Aucune clé n'est nécessaire. Le bouton de paiement ouvre une page de test proposant de valider, de faire échouer ou d'annuler le paiement.

### PayDunya en sandbox

1. Créer un compte sur [PayDunya](https://paydunya.com) et une application en mode test.
2. Renseigner les clés `PAYDUNYA_*` dans `server/.env`, avec `PAIEMENT_FOURNISSEUR=paydunya` et `PAYDUNYA_MODE=test`.
3. Exposer l'API par un tunnel pour recevoir les webhooks, par exemple `ngrok http 4000`.
4. Mettre l'URL du tunnel dans `API_URL`, puis relancer le serveur.

Sans tunnel, le paiement est quand même confirmé au retour du locataire dans l'application, mais pas s'il ferme la page avant.

La page PayDunya propose tous les moyens actifs sur le compte. Les variables `PAYDUNYA_CANAL_*` permettent de la limiter à un canal ; leurs valeurs figurent dans la documentation PayDunya.

### Passage en production

Mettre `PAYDUNYA_MODE=live`, utiliser les clés de production, et définir `API_URL` et `CLIENT_URL` sur les URL publiques en HTTPS.

### Règles de confirmation

- Un webhook n'est jamais cru sur parole : le statut et le montant sont relus auprès de l'API du fournisseur.
- Une échéance n'a qu'un seul paiement en cours, et une seule quittance.
- Un webhook rejoué est ignoré.
- Un montant incorrect, ou un paiement reçu sur une échéance déjà réglée, devient une **anomalie** affichée dans le tableau de bord. Le remboursement éventuel se fait hors de l'application.

## Tests

```bash
npm test
```

Les tests utilisent une base et des dossiers séparés. Ils couvrent l'authentification, l'isolation des données, les photos, le paiement (réussite, échec, annulation, doublons, signature, montant) et l'adaptateur PayDunya, avec des réponses d'API simulées.

## Structure

```
PayTonLoyer/
├── client/              PWA React + Vite + Tailwind
│   └── src/             api, components, hooks, pages, utils
├── server/
│   ├── prisma/          schéma, migrations, données de démonstration
│   ├── payments/        fournisseurs de paiement
│   ├── src/             routes, services, middlewares, validators, jobs
│   ├── tests/
│   ├── uploads/         photos, publiques
│   └── storage/         quittances, accès contrôlé
└── prototype/           ancienne maquette HTML, conservée pour référence
```

## Logo et vidéo de présentation

- **Logo :** la source est `marque/logo-source.png`. `node server/scripts/generer-logos.js` produit les versions bleue et blanche, l'emblème et les icônes de l'application dans `client/public/`.
- **Animation :** sur le site, elle tourne en direct dans `client/src/pages/vitrine/AnimationMarque.jsx`. `motion/showreel.html` en est la version autonome, qu'on peut exporter en MP4 pour la partager (FFmpeg requis, ou chemin dans la variable `FFMPEG`) :

```bash
cd motion
npm install
npm run apercu   # images clés dans motion/apercu/
npm run rendre   # motion/showreel-1080p.mp4 et showreel-720p.mp4
```

## Passer à PostgreSQL

1. Dans `server/prisma/schema.prisma`, mettre `provider = "postgresql"`.
2. Définir `DATABASE_URL` avec l'URL PostgreSQL.
3. Supprimer `server/prisma/migrations/`, puis lancer `npx prisma migrate dev --name init`.

## Limites connues

- Chaque échéance se règle en totalité : les acomptes ne sont pas gérés.
- Un paiement enregistré manuellement ne peut pas être annulé depuis l'application.
- Un numéro de téléphone correspond à un seul compte : un locataire ne peut pas être rattaché à deux propriétaires.
- Le moyen de paiement enregistré est celui choisi dans l'application, même si le locataire en utilise un autre sur la page PayDunya (sans restriction `PAYDUNYA_CANAL_*`).
- Le code provisoire d'un locataire est transmis par le propriétaire : il n'y a pas d'envoi par SMS ni de réinitialisation autonome.
