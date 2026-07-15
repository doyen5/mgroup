# M Group App - Gestion evenementielle

Application web de gestion pour M Group, structure evenementielle liee a l'artiste Molare.

Le projet contient maintenant :

- un frontend React/Vite connecte au backend ;
- un backend NestJS/Prisma ;
- une base PostgreSQL lancee avec Docker ;
- une authentification avec mots de passe hashes, JWT et refresh tokens ;
- une gestion des roles Admin, Secretaire, Comptable, RH, Commercial, Client et Autre.

## Objectif metier

L'application sert a gerer les acces et les workflows internes de M Group.

Regle principale : un utilisateur ne choisit jamais son role lui-meme. Il fait une demande d'inscription, puis l'administrateur valide le compte, attribue le role et communique le mot de passe temporaire.

## Stack technique

Frontend :

- React
- Vite
- lucide-react pour les icones du dashboard
- CSS personnalise
- `fetch` avec cookies `HttpOnly`
- fichier API centralise : `client/src/api.js`

Backend :

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- bcrypt pour le hash des mots de passe
- JWT access token
- refresh token stocke en base sous forme hashee
- validation DTO avec `class-validator`
- guards par role
- audit des connexions et actions sensibles

Infrastructure locale :

- Docker Desktop
- `docker-compose.yml` pour PostgreSQL

## Structure du projet

```txt
mgroup-app/
|-- README.md
|-- package.json
|-- docker-compose.yml
|-- client/
|   |-- .env.example
|   |-- index.html
|   |-- package.json
|   |-- public/
|   |   |-- favicon.svg
|   |   |-- icons.svg
|   |   `-- mgroup-logo.svg
|   `-- src/
|       |-- api.js
|       |-- App.jsx
|       |-- App.css
|       |-- index.css
|       |-- main.jsx
|       `-- assets/
|           `-- mgroup-event-hero.jpg
`-- server/
    |-- .env.example
    |-- package.json
    |-- package-lock.json
    |-- prisma/
    |   |-- schema.prisma
    |   `-- migrations/
    `-- src/
        |-- main.ts
        |-- app.module.ts
        |-- auth/
        |-- setup/
        |-- users/
        |-- prisma/
        `-- common/
```

## Lancement complet

Depuis la racine du projet :

```powershell
cd D:\PROJETS\Dev\mgroup-app
```

Demarrer PostgreSQL :

```powershell
docker compose up -d postgres
```

Installer et configurer le backend :

```powershell
cd D:\PROJETS\Dev\mgroup-app\server
npm install
Copy-Item .env.example .env
npm run prisma:migrate
npm run start:dev
```

Demarrer le frontend dans un autre terminal :

```powershell
cd D:\PROJETS\Dev\mgroup-app
npm run client:dev
```

Ouvrir :

```txt
http://127.0.0.1:5173/
```

L'API est disponible sur :

```txt
http://127.0.0.1:4000/api
```

## Variables d'environnement

Backend : `server/.env`

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mgroup_app?schema=public"
PORT=4000
CLIENT_ORIGIN="http://127.0.0.1:5173"
JWT_ACCESS_SECRET="change-this-access-secret"
JWT_ACCESS_EXPIRES_IN="15m"
REFRESH_TOKEN_DAYS=7
REMEMBER_ME_DAYS=30
BCRYPT_SALT_ROUNDS=12
```

Frontend : `client/.env`

Le fichier est optionnel car `client/src/api.js` utilise deja `http://127.0.0.1:4000/api` par defaut.

```env
VITE_API_URL="http://127.0.0.1:4000/api"
```

## Fonctionnement connecte frontend/backend

Au chargement de React, `App.jsx` appelle :

```txt
GET /api/setup/status
```

Si la base est vide, l'utilisateur arrive sur la page de choix :

- Administrateur
- Autre utilisateur

Si le setup est deja fait, l'application affiche directement la page d'accueil.

## Parcours Administrateur

1. L'administrateur remplit les informations de l'entreprise.
2. Il remplit ses propres informations.
3. Le frontend envoie les donnees a :

```txt
POST /api/setup/company-admin
```

4. Le backend cree :
   - l'entreprise ;
   - les roles par defaut ;
   - le premier utilisateur Admin ;
   - le hash du mot de passe ;
   - le statut `FORCE_PASSWORD_CHANGE`.

5. L'administrateur choisit Dashboard ou Page d'accueil.
6. Pour aller au dashboard, il doit se reconnecter.
7. Apres connexion, le backend force le changement de mot de passe.
8. Apres changement, l'admin accede au dashboard.

Routes utilisees :

```txt
POST /api/setup/company-admin
POST /api/auth/login
POST /api/auth/change-password
GET  /api/users/me
```

## Parcours Autre utilisateur

1. L'utilisateur ouvre `REGISTER`.
2. Il renseigne :
   - Nom ;
   - Prenom(s) ;
   - Adresse ;
   - Contact ;
   - Photo ;
   - Email.

3. Le frontend envoie la demande a :

```txt
POST /api/auth/register
```

4. Le backend cree l'utilisateur avec le statut :

```txt
PENDING
```

5. L'utilisateur attend la validation de l'admin.

## Validation admin

Quand l'admin arrive sur le dashboard, React charge les demandes en attente :

```txt
GET /api/users/pending
```

Pour valider un utilisateur, l'admin choisit un role et confirme :

```txt
PATCH /api/users/:id/approve
```

L'admin dispose aussi de deux actions avant validation :

- `Voir` : ouvre une fiche de verification pour controler si le nom, le prenom, l'adresse, le contact, l'email et la photo sont remplis ;
- `Annuler` : ouvre une confirmation propre puis refuse la demande en passant le compte en `DISABLED`.

Le backend :

- attribue le role choisi ;
- genere un mot de passe temporaire si aucun n'est fourni ;
- hash le mot de passe ;
- passe l'utilisateur en `FORCE_PASSWORD_CHANGE` ;
- renvoie le mot de passe temporaire a communiquer de maniere securisee.

Apres validation, le frontend affiche le mot de passe temporaire et prepare trois moyens d'envoi :

- WhatsApp : ouverture d'un lien `wa.me` avec le message deja rempli ;
- SMS : ouverture de l'application SMS locale avec le message deja rempli ;
- Gmail : ouverture de la fenetre de composition Gmail avec le destinataire et le message.

Important : en mode prototype, ces boutons preparent l'envoi mais ne remplacent pas encore un vrai fournisseur serveur. En production, il faudra brancher un service email/SMS/WhatsApp officiel et ne plus exposer le mot de passe temporaire dans l'interface.

## Dashboard Admin

Le dashboard Admin contient maintenant :

- une barre laterale gauche sombre avec le menu principal ;
- le logo M Group image dans la sidebar et dans l'en-tete ;
- le libelle `Le Boss Molare` dans l'en-tete du dashboard ;
- une zone profil avec nom complet, role, photo/avatar et derniere connexion ;
- une horloge temps reel ;
- des cartes statistiques colorees ;
- des panneaux graphiques visuels avec budget et montants en FCFA ;
- des pages internes accessibles depuis le menu : Inscriptions, Evenements, Finance, Equipe, Budget, Alertes et Parametres ;
- des alertes sonores cote navigateur pour prevenir l'Admin lors des changements importants ;
- la validation des inscriptions en attente depuis PostgreSQL.
- une section `Parametres` complete pour le profil, la securite et l'entreprise.

La page `Alertes` permet d'activer/desactiver le son et de tester une notification. Le son est genere dans le navigateur avec Web Audio API, sans fichier audio externe.

Dans `Parametres > Profil utilisateur`, l'utilisateur peut modifier :

- sa photo de profil ;
- son nom ;
- son prenom ;
- son adresse ;
- son contact ;
- son email avec confirmation avant sauvegarde.

Le role reste non modifiable par l'utilisateur. Il est gere par l'administrateur.
La date de derniere connexion est affichee en lecture seule.

La sauvegarde appelle :

```txt
PATCH /api/users/me
```

Chaque modification du profil est enregistree dans `LoginAuditLog` avec l'action `PROFILE_UPDATED`.

Dans `Parametres > Securite du compte`, l'utilisateur peut :

- changer son mot de passe ;
- deconnecter la session courante ;
- revoquer toutes les sessions actives du compte ;
- voir les sessions recentes ;
- voir l'historique des actions de connexion/securite ;
- voir les emplacements prevus pour la 2FA et les notifications de connexion suspecte.

Routes utilisees :

```txt
POST /api/auth/change-password
POST /api/auth/logout-all
GET  /api/auth/sessions
GET  /api/auth/login-history
```

Dans `Parametres > Parametres entreprise`, seul l'Admin peut modifier :

- le nom de l'entreprise ;
- la raison sociale ;
- le logo ;
- l'adresse ;
- les contacts ;
- l'email officiel ;
- les informations fiscales ou administratives ;
- la signature/footer pour documents.

Routes utilisees :

```txt
GET   /api/setup/company
PATCH /api/setup/company
```

Chaque modification entreprise est auditee avec l'action `COMPANY_UPDATED`.

## Remember me et mot de passe oublie

`Remember me` fonctionne ainsi :

- le frontend memorise uniquement l'email dans `localStorage` ;
- les tokens restent proteges dans des cookies `HttpOnly` ;
- le backend allonge la duree du refresh token avec `REMEMBER_ME_DAYS` ;
- le client API tente un `POST /api/auth/refresh` automatiquement si l'access token expire.

`Forgot password?` fonctionne en mode local :

1. L'utilisateur renseigne son email.
2. Le backend cree un token dans `PasswordResetToken`.
3. Comme aucun service email n'est encore branche, le token est renvoye a l'ecran en mode developpement.
4. L'utilisateur saisit le token et son nouveau mot de passe.
5. Le backend hash le nouveau mot de passe, marque le token comme utilise et revoque les refresh tokens existants.

En production, le token ne devra plus etre affiche dans l'interface. Il devra etre envoye par email.

## Routes backend principales

Setup :

```txt
GET  /api/setup/status
POST /api/setup/company-admin
GET  /api/setup/company
PATCH /api/setup/company
```

Auth :

```txt
POST /api/auth/register
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/logout-all
POST /api/auth/change-password
GET  /api/auth/sessions
GET  /api/auth/login-history
GET  /api/auth/me
```

Users :

```txt
GET   /api/users/me
PATCH /api/users/me
GET   /api/users/pending
PATCH /api/users/:id/approve
PATCH /api/users/:id/role
PATCH /api/users/:id/disable
```

## Modele de donnees Prisma

Tables principales :

- `Company` : nom, raison sociale, adresse, email, contact, logo, informations fiscales, footer documents
- `User`
- `Role`
- `UserRole`
- `RefreshToken`
- `PasswordResetToken`
- `LoginAuditLog`

Actions d'audit principales :

```txt
LOGIN_SUCCESS
LOGIN_FAILED
PASSWORD_CHANGED
USER_REGISTERED
USER_APPROVED
USER_DISABLED
ROLE_CHANGED
PROFILE_UPDATED
COMPANY_UPDATED
SETUP_COMPLETED
```

Statuts utilisateur :

```txt
PENDING
ACTIVE
DISABLED
FORCE_PASSWORD_CHANGE
```

Roles :

```txt
ADMIN
SECRETAIRE
COMPTABLE
RH
COMMERCIAL
CLIENT
AUTRE
```

## Securite actuelle

Deja en place :

- mots de passe hashes avec bcrypt ;
- access token JWT ;
- refresh token aleatoire hashe en base ;
- refresh token prolonge quand `Remember me` est coche ;
- revocation de toutes les sessions actives d'un compte ;
- consultation des sessions recentes ;
- historique des connexions et actions de securite ;
- cookies `HttpOnly` ;
- reset password avec token hashe en base ;
- CORS configure pour Vite en local ;
- validation stricte des payloads ;
- controle d'acces par role ;
- audit login/register/validation/changement de role ;
- audit des modifications du profil connecte ;
- audit des modifications entreprise ;
- changement de mot de passe obligatoire apres creation admin ou validation utilisateur.

A ajouter avant production :

- secrets forts dans `.env` ;
- HTTPS obligatoire ;
- rate limiting sur login/register ;
- envoi reel email/SMS/WhatsApp depuis le backend pour les mots de passe temporaires ;
- Google OAuth ;
- upload fichier reel au lieu des Data URLs ;
- tests automatises ;
- CI/CD avec lint, build, tests et migrations controlees.

## Commandes utiles

Depuis la racine :

```powershell
npm run client:dev
npm run client:build
npm run server:dev
npm run server:build
```

Backend :

```powershell
cd D:\PROJETS\Dev\mgroup-app\server
npm run prisma:generate
npm run prisma:migrate
npm run lint
npm run build
npm run start:dev
```

Frontend :

```powershell
cd D:\PROJETS\Dev\mgroup-app\client
npm run dev
npm run lint
npm run build
```

Docker :

```powershell
docker compose up -d postgres
docker compose ps
docker compose down
```

## Verifications effectuees

Les commandes suivantes passent :

```powershell
cd D:\PROJETS\Dev\mgroup-app\server
npm run lint
npm run build

cd D:\PROJETS\Dev\mgroup-app\client
npm run lint
npm run build
```

Tests HTTP utiles pour verification locale :

```txt
GET http://127.0.0.1:4000/api/setup/status
POST http://127.0.0.1:4000/api/auth/forgot-password
PATCH http://127.0.0.1:4000/api/users/me
GET http://127.0.0.1:4000/api/auth/sessions
GET http://127.0.0.1:4000/api/auth/login-history
GET http://127.0.0.1:4000/api/setup/company
PATCH http://127.0.0.1:4000/api/setup/company
GET http://127.0.0.1:5173/
```

Les routes `/api/auth/sessions`, `/api/auth/login-history`, `/api/setup/company` et
`PATCH /api/setup/company` demandent une session connectee valide. Les routes entreprise demandent
le role `ADMIN`.

Etat actuel de la base de test au moment de la derniere verification :

```json
{
  "requiresSetup": false,
  "companyCount": 1,
  "adminCount": 1
}
```

Cela signifie que le setup initial a deja ete fait sur la base locale actuelle.

## Notes importantes

- Le frontend est maintenant branche sur le backend.
- Les donnees de setup, connexion, inscription et validation admin passent par l'API.
- Les donnees du profil connecte peuvent etre modifiees depuis `Parametres`.
- Les parametres Admin gerent maintenant le profil, la securite du compte et l'entreprise.
- Les sessions actives peuvent etre consultees et revoquees depuis l'interface.
- Les photos sont envoyees en Data URL pour le prototype. En production, il faudra faire un vrai module d'upload.
- Le dashboard admin lit les demandes `PENDING` depuis PostgreSQL.
- Les mots de passe ne sont jamais stockes en clair en base.
