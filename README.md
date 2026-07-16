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
        |-- commercial/
        |-- setup/
        |-- users/
        |-- documents/
        |-- events/
        |-- finance/
        |-- hr/
        |-- reports/
        |-- workflows/
        |-- notifications/
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
AUTH_MAX_LOGIN_ATTEMPTS=5
AUTH_LOCK_MINUTES=15
AUTH_DEV_EXPOSE_TOKENS=true
EMAIL_VERIFICATION_HOURS=24
PHONE_OTP_MINUTES=10
TWO_FACTOR_CHALLENGE_MINUTES=10
GOOGLE_CLIENT_ID=""
SMTP_HOST=""
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="M Group <no-reply@mgroup.ci>"
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_FROM_NUMBER=""
EVENT_REMINDER_HOURS=24
```

Frontend : `client/.env`

Le fichier est optionnel car `client/src/api.js` utilise deja `http://127.0.0.1:4000/api` par defaut.

```env
VITE_API_URL="http://127.0.0.1:4000/api"
VITE_GOOGLE_CLIENT_ID=""
```

## Fonctionnement connecte frontend/backend

Au chargement de React, `App.jsx` appelle :

```txt
GET /api/setup/status
```

Si la base est vide, l'utilisateur arrive sur la page de choix :

- Administrateur
- Autre utilisateur

Si le setup est deja fait, l'application verifie ensuite la session :

- session valide : redirection vers le dashboard ;
- session valide avec mot de passe force : redirection vers la page de changement de mot de passe ;
- aucune session valide : redirection vers la page `LOGIN / REGISTER`.

La page d'accueil du site reste accessible depuis les boutons `Accueil du site`, mais elle n'est plus la destination automatique apres une deconnexion ou un rafraichissement sans session.

## Parcours Administrateur

1. L'administrateur remplit les informations de l'entreprise.
2. Il remplit ses propres informations.
3. Le frontend envoie les donnees a :

```txt
POST /api/setup/company-admin
```

1. Le backend cree :
   - l'entreprise ;
   - les roles par defaut ;
   - le premier utilisateur Admin ;
   - le hash du mot de passe ;
   - le statut `FORCE_PASSWORD_CHANGE`.

2. L'administrateur choisit Dashboard ou Page d'accueil.
3. Pour aller au dashboard, il doit se reconnecter.
4. Apres connexion, le backend force le changement de mot de passe.
5. Apres changement, l'admin accede au dashboard.

Routes utilisees :

```txt
POST /api/setup/company-admin
POST /api/auth/login
POST /api/auth/change-password
GET  /api/users/me
```

## Connexion et inscription sociale

La page d'authentification affiche deux modes :

- `LOGIN` affiche le libelle `Sign in with:` ;
- `REGISTER` affiche le libelle `Sign up with:`.

Les boutons sociaux proposes sont :

- Gmail ;
- Telephone.

Le backend contient maintenant les integrations reelles suivantes :

- Gmail : verification du `idToken` Google avec `google-auth-library` ;
- Telephone : envoi OTP SMS via Twilio si les variables Twilio sont configurees ;
- Email : verification d'adresse et reset mot de passe via SMTP si les variables SMTP sont configurees.

Sans `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID`, SMTP ou Twilio, les routes restent disponibles mais indiquent clairement que le fournisseur n'est pas configure. En local, `AUTH_DEV_EXPOSE_TOKENS=true` permet d'afficher les tokens de test pour continuer a developper sans service externe.

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

1. Le backend cree l'utilisateur avec le statut :

```txt
PENDING
```

1. L'utilisateur attend la validation de l'admin.

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
- une vue generale interactive avec donnees reelles : inscriptions, evenements, budgets, alertes, workflows, finance et RH ;
- des cartes statistiques colorees avec icones `lucide-react` ;
- des panneaux graphiques visuels avec activite evenementielle, budget et montants en FCFA ;
- des actions rapides vers les modules prioritaires ;
- des pages internes accessibles depuis le menu : Vue generale, Inscriptions, Workflows, Evenements, Commercial, Equipe/RH, Finances, Budget, Documents, Rapports, Alertes et Parametres ;
- des alertes sonores cote navigateur pour prevenir l'Admin lors des changements importants ;
- la validation des inscriptions en attente depuis PostgreSQL.
- une section `Parametres` complete pour le profil, la securite, l'entreprise, les utilisateurs, les preferences, les notifications, les modules et le journal d'activite.

La page `Alertes` permet d'activer/desactiver le son et de tester une notification. Le son est genere dans le navigateur avec Web Audio API, sans fichier audio externe.

## Dashboards par profil

La navigation est maintenant filtree par role. Un utilisateur ne voit que les modules utiles a son metier.

Admin :

```txt
Vue generale
Inscriptions
Workflows
Evenements
Commercial
Equipe / RH
Finances
Budget
Documents
Rapports
Alertes
Parametres
```

RH :

```txt
Vue generale
Equipe / RH
Workflows
Evenements
Documents
Alertes
Parametres
```

Comptable :

```txt
Vue generale
Finances
Budget
Documents
Rapports
Workflows
Evenements
Alertes
Parametres
```

Commercial :

```txt
Vue generale
Commercial
Workflows
Evenements
Documents
Rapports
Alertes
Parametres
```

La vue generale n'est plus statique. Elle charge les donnees API selon le role :

- Admin : inscriptions en attente, evenements, pipeline commercial, budgets, paiements, documents, rapports, workflows a valider, personnel RH et alertes ;
- RH : personnel actif, disponibilites, workflows RH, evenements, documents RH, contrats, missions et alertes ;
- Commercial : clients, prospects, demandes de prestations, devis, documents commerciaux, rapports et workflows ;
- Comptable : finances, budgets, documents financiers, rapports, workflows et alertes ;
- autres profils : vue reduite selon les modules autorises.

Les anciens pictogrammes texte du menu ont ete remplaces par des icones `lucide-react`.

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

Dans `Parametres > Utilisateurs`, seul l'Admin peut :

- voir la liste complete des utilisateurs ;
- voir les utilisateurs en attente ;
- modifier un role ;
- desactiver ou reactiver un compte ;
- reinitialiser le mot de passe temporaire d'un utilisateur ;
- voir l'historique d'un utilisateur.

Routes utilisees :

```txt
GET   /api/users
GET   /api/users/pending
PATCH /api/users/:id/role
PATCH /api/users/:id/disable
PATCH /api/users/:id/reactivate
POST  /api/users/:id/reset-password
GET   /api/users/:id/history
```

Dans `Parametres > Affichage`, l'utilisateur peut regler :

- theme clair/sombre ;
- langue francais/anglais ;
- format de date ;
- fuseau horaire ;
- densite du dashboard ;
- affichage/masquage des widgets.

Dans `Parametres > Notifications`, l'utilisateur peut regler :

- notifications d'inscription ;
- notifications budget ;
- notifications evenement ;
- notifications email ;
- notifications dans l'application ;
- frequence des rappels.

Dans `Parametres > Modules`, l'Admin peut preparer l'activation/desactivation de :

- Evenements ;
- Finances ;
- RH ;
- Commercial ;
- Documents ;
- Prestations ;
- Rapports.

Dans `Parametres > Journal`, l'Admin voit les actions sensibles :

- connexions ;
- validations d'inscriptions ;
- changement de role ;
- modification de profil ;
- modification entreprise ;
- reset mot de passe ;
- desactivation/reactivation de compte.

Les preferences, notifications et modules sont stockes en `localStorage` pour le prototype. En production, il faudra ajouter des tables Prisma dediees.

## Gestion evenementielle

La priorite evenementielle ajoute un vrai module `Evenements` connecte au backend.

Fonctionnalites disponibles :

- creation d'un evenement avec titre, description, lieu, dates, budget FCFA, statut et responsable ;
- planning de production par evenement ;
- affectation de responsables ou collaborateurs ;
- checklist avant evenement avec cases a cocher ;
- statuts : `DRAFT`, `IN_PREPARATION`, `VALIDATED`, `COMPLETED`, `CANCELLED` ;
- calendrier/liste des evenements dans le dashboard ;
- pieces jointes : contrats, fiches techniques, devis, photos ou autre document.

Le frontend utilise maintenant la page `Evenements` du dashboard au lieu des donnees statiques. Les pieces jointes peuvent etre ajoutees par lien ou fichier local converti en Data URL pour le prototype. En production, il faudra remplacer les Data URLs par un stockage fichier reel.

Tables ajoutees :

- `Event`
- `EventAssignment`
- `EventChecklistItem`
- `EventProductionStep`
- `EventAttachment`

## Finances et budget

La priorite finance ajoute un module connecte aux evenements.

Fonctionnalites disponibles :

- budget previsionnel par evenement ;
- validation ou rejet des budgets par l'Admin ;
- depenses reelles par categorie, prestataire et date ;
- suivi des paiements avec statuts `PENDING`, `PARTIAL`, `PAID`, `OVERDUE`, `CANCELLED` ;
- documents financiers : devis, factures, recus et autres documents ;
- totaux globaux en FCFA ;
- alertes quand les depenses reelles depassent la limite prevue ou validee.

La limite budgetaire utilisee par l'alerte est calculee dans cet ordre :

1. budget valide par l'Admin ;
2. budget previsionnel ;
3. budget simple renseigne dans la fiche evenement.

Tables ajoutees :

- `EventBudget`
- `EventExpense`
- `EventPayment`
- `EventFinanceDocument`

## Workflow de validation

La priorite workflow ajoute une chaine de validation adaptee a M Group :

- un `Commercial` cree une demande ;
- le `Comptable` ajoute le budget previsionnel ;
- la `RH` affecte les responsables ou collaborateurs ;
- l'`Admin` valide ou refuse la demande ;
- chaque etape est historisee dans le journal du workflow et dans le journal d'activite global.

Statuts workflow :

```txt
DRAFT
PENDING_BUDGET
PENDING_RH
PENDING_ADMIN
APPROVED
REJECTED
CANCELLED
```

Tables ajoutees :

- `WorkflowRequest`
- `WorkflowAssignee`
- `WorkflowAction`

Routes principales :

```txt
GET   /api/workflows
GET   /api/workflows/:id
POST  /api/workflows
PATCH /api/workflows/:id/budget
PATCH /api/workflows/:id/assignees
PATCH /api/workflows/:id/approve
PATCH /api/workflows/:id/reject
```

## Notifications serieuses

Le module notifications centralise les alertes importantes :

- notification dans l'application ;
- email si SMTP est configure ;
- SMS si Twilio est configure ;
- lien WhatsApp pret a ouvrir avec le message ;
- alerte sonore cote dashboard ;
- rappels avant evenement ;
- notification quand un budget attend validation ;
- notification quand un budget depasse la limite ;
- notification quand un workflow change d'etape.

Table ajoutee :

- `Notification`

Routes principales :

```txt
GET   /api/notifications
GET   /api/notifications/unread-count
PATCH /api/notifications/:id/read
POST  /api/notifications/event-reminders
```

Important : l'envoi WhatsApp automatique necessite un fournisseur officiel en production.
Dans cette version, l'application prepare le lien WhatsApp et garde la notification en base.

## Module equipe / RH

La priorite RH ajoute un dashboard dedie aux profils `RH` et `ADMIN`.

Fonctionnalites disponibles :

- liste du personnel actif ;
- roles internes et departements ;
- disponibilite : disponible, occupe, indisponible, en conge ;
- contrats avec type, statut, dates, montant FCFA et fichier ;
- documents administratifs : piece d'identite, contrat, CV, attestation, administratif ou autre ;
- affectation aux evenements via missions RH ;
- historique des missions et affectations evenementielles existantes.

Le profil `RH` ouvre directement la page `Equipe et RH` apres connexion. Cette page utilise
`GET /api/hr/overview` et n'a plus besoin des donnees statiques.

Correction locale effectuee pour le compte RH :

```txt
Nom : Traore
Prenom : Mariam
Email : traoremariam@mgroup.ci
Role : RH
Statut : ACTIVE
```

Le mot de passe fourni a ete stocke sous forme hashee en base. Les anciennes sessions du compte
ont ete revoquees pour obliger une reconnexion propre.

Tables ajoutees :

- `StaffProfile`
- `StaffContract`
- `StaffDocument`
- `StaffMission`

## Module commercial / clients

La priorite commerciale ajoute un module `Commercial` accessible aux roles `ADMIN`,
`COMMERCIAL` et `COMPTABLE`.

Fonctionnalites disponibles :

- gestion des clients et prospects ;
- demande de prestation rattachee a un client et optionnellement a un evenement ;
- devis commerciaux numerotes automatiquement (`MG-annee-numero`) ;
- suivi du pipeline avec statuts `NEW`, `IN_DISCUSSION`, `WON`, `LOST` ;
- suivi des demandes avec statuts `NEW`, `IN_DISCUSSION`, `QUOTED`, `WON`, `LOST`, `CANCELLED` ;
- suivi des devis avec statuts `DRAFT`, `SENT`, `ACCEPTED`, `REJECTED`, `EXPIRED` ;
- historique des echanges par client : canal, sujet, notes et date ;
- cartes KPI : clients, prospects ouverts, demandes actives et chiffre d'affaires gagne.

Le dashboard affiche une page interactive avec :

- une vue generale propre au Commercial, sans cartes Admin ;
- les KPI clients, prospects ouverts, demandes actives et chiffre d'affaires gagne ;
- un graphique de pipeline commercial par statut ;
- un resume des devis acceptes, en cours et des alertes ;
- les demandes de prestations et devis recents ;
- formulaire d'ajout de client/prospect ;
- pipeline par statut ;
- fiche detail client ;
- creation de demande de prestation ;
- creation de devis ;
- ajout d'un echange client ;
- liste des derniers devis.

Tables ajoutees :

- `CommercialClient`
- `ServiceRequest`
- `CommercialQuote`
- `ClientExchange`

## Module documents

La priorite documents ajoute un centre documentaire transversal accessible aux roles `ADMIN`,
`RH`, `COMPTABLE` et `COMMERCIAL`.

Fonctionnalites disponibles :

- upload prototype de fichier par URL ou Data URL ;
- classement par entreprise, evenement, client ou utilisateur ;
- types : devis, facture, recu, contrat, fiche technique, photo, administratif, rapport ou autre ;
- statuts : brouillon, a valider, valide, rejete, signe, archive ;
- generation prototype de PDF avec modele M Group et logo inclus ;
- validation ou rejet interne reserve a l'Admin ;
- notifications Admin quand un document attend validation.

Important : le stockage fichier actuel reste adapte au developpement. En production, les Data URLs doivent etre remplacees par un stockage prive avec antivirus, taille limitee, URL signee et journalisation d'acces.

Table ajoutee :

- `BusinessDocument`

## Module rapports

La priorite rapports ajoute un module `Rapports` pour les roles `ADMIN`, `COMPTABLE` et
`COMMERCIAL`.

Fonctionnalites disponibles :

- chiffre d'affaires par periode a partir des devis acceptes ;
- evenements realises ;
- budgets prevus et budgets consommes ;
- depenses par categorie ;
- utilisateurs actifs par derniere connexion ;
- performance commerciale : devis acceptes, en cours, rejetes ;
- top clients par revenu gagne ;
- export PDF ou Excel prototype ;
- historique des exports en base.

Le dashboard affiche :

- filtres debut/fin ;
- cartes KPI ;
- barres de depenses par categorie ;
- synthese de performance commerciale ;
- top clients ;
- historique des exports.

Table ajoutee :

- `ReportExport`

## Remember me et mot de passe oublie

`Remember me` fonctionne ainsi :

- le frontend memorise uniquement l'email dans `localStorage` ;
- les tokens restent proteges dans des cookies `HttpOnly` ;
- le backend allonge la duree du refresh token avec `REMEMBER_ME_DAYS` ;
- le client API tente un `POST /api/auth/refresh` automatiquement si l'access token expire.

`Forgot password?` fonctionne maintenant avec email reel si SMTP est configure :

1. L'utilisateur renseigne son email.
2. Le backend cree un token dans `PasswordResetToken`.
3. Le backend envoie un email de reinitialisation avec `nodemailer`.
4. L'utilisateur ouvre le lien recu ou saisit le token et son nouveau mot de passe.
5. Le backend hash le nouveau mot de passe, marque le token comme utilise et revoque les refresh tokens existants.

En developpement, `AUTH_DEV_EXPOSE_TOKENS=true` peut afficher le token pour tester sans SMTP. En production, cette variable doit etre absente ou definie a `false`.

## Authentification solide

La priorite securite contient maintenant :

- verification email apres inscription avec `EmailVerificationToken` ;
- reset de mot de passe par email SMTP ;
- connexion Gmail avec verification backend du `idToken` Google ;
- connexion par telephone avec OTP SMS via Twilio ;
- double authentification Admin par TOTP ;
- blocage temporaire du compte apres plusieurs echecs de connexion ;
- sessions connectees reelles via refresh tokens hashes, IP, user-agent, expiration et revocation.

Comportement important :

- un compte `PENDING` ne peut pas se connecter tant que l'Admin ne l'a pas valide ;
- un compte `DISABLED` est bloque ;
- un compte `FORCE_PASSWORD_CHANGE` peut se connecter, mais doit modifier son mot de passe avant le dashboard ;
- si la 2FA Admin est active, aucun cookie de session n'est pose avant validation du code OTP.

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
POST /api/auth/google
POST /api/auth/verify-email
POST /api/auth/resend-email-verification
POST /api/auth/phone/request-otp
POST /api/auth/phone/verify-otp
POST /api/auth/2fa/verify-login
POST /api/auth/2fa/setup
POST /api/auth/2fa/enable
POST /api/auth/2fa/disable
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

Evenements :

```txt
GET    /api/events
POST   /api/events
GET    /api/events/:id
PATCH  /api/events/:id
POST   /api/events/:id/assignments
DELETE /api/events/:id/assignments/:assignmentId
POST   /api/events/:id/checklist
PATCH  /api/events/:id/checklist/:itemId
POST   /api/events/:id/production-steps
PATCH  /api/events/:id/production-steps/:stepId
POST   /api/events/:id/attachments
DELETE /api/events/:id/attachments/:attachmentId
```

Finances :

```txt
GET    /api/finance/summary
GET    /api/finance/events/:eventId
POST   /api/finance/events/:eventId/budgets
PATCH  /api/finance/budgets/:budgetId
PATCH  /api/finance/budgets/:budgetId/approve
PATCH  /api/finance/budgets/:budgetId/reject
POST   /api/finance/events/:eventId/expenses
POST   /api/finance/events/:eventId/payments
PATCH  /api/finance/payments/:paymentId
POST   /api/finance/events/:eventId/documents
DELETE /api/finance/documents/:documentId
```

Workflows :

```txt
GET   /api/workflows
GET   /api/workflows/:id
POST  /api/workflows
PATCH /api/workflows/:id/budget
PATCH /api/workflows/:id/assignees
PATCH /api/workflows/:id/approve
PATCH /api/workflows/:id/reject
```

Notifications :

```txt
GET   /api/notifications
GET   /api/notifications/unread-count
PATCH /api/notifications/:id/read
POST  /api/notifications/event-reminders
```

RH :

```txt
GET   /api/hr/overview
GET   /api/hr/staff
PATCH /api/hr/staff/:userId/profile
POST  /api/hr/staff/:userId/contracts
POST  /api/hr/staff/:userId/documents
POST  /api/hr/staff/:userId/missions
```

Commercial :

```txt
GET   /api/commercial/overview
GET   /api/commercial/clients
POST  /api/commercial/clients
PATCH /api/commercial/clients/:clientId
POST  /api/commercial/requests
PATCH /api/commercial/requests/:requestId
POST  /api/commercial/quotes
PATCH /api/commercial/quotes/:quoteId
POST  /api/commercial/exchanges
```

Documents :

```txt
GET   /api/documents/overview
GET   /api/documents
POST  /api/documents
POST  /api/documents/generate
PATCH /api/documents/:documentId/validate
```

Rapports :

```txt
GET  /api/reports/summary
POST /api/reports/export
```

Users :

```txt
GET   /api/users/me
PATCH /api/users/me
GET   /api/users
GET   /api/users/pending
GET   /api/users/activity
GET   /api/users/:id/history
PATCH /api/users/:id/approve
PATCH /api/users/:id/role
PATCH /api/users/:id/disable
PATCH /api/users/:id/reactivate
POST  /api/users/:id/reset-password
```

## Modele de donnees Prisma

Tables principales :

- `Company` : nom, raison sociale, adresse, email, contact, logo, informations fiscales, footer documents
- `User`
- `Role`
- `UserRole`
- `RefreshToken`
- `PasswordResetToken`
- `EmailVerificationToken`
- `AuthChallenge`
- `OAuthAccount`
- `Event`
- `EventAssignment`
- `EventChecklistItem`
- `EventProductionStep`
- `EventAttachment`
- `EventBudget`
- `EventExpense`
- `EventPayment`
- `EventFinanceDocument`
- `WorkflowRequest`
- `WorkflowAssignee`
- `WorkflowAction`
- `Notification`
- `StaffProfile`
- `StaffContract`
- `StaffDocument`
- `StaffMission`
- `CommercialClient`
- `ServiceRequest`
- `CommercialQuote`
- `ClientExchange`
- `BusinessDocument`
- `ReportExport`
- `LoginAuditLog`

Actions d'audit principales :

```txt
LOGIN_SUCCESS
LOGIN_FAILED
ACCOUNT_LOCKED
PASSWORD_CHANGED
PASSWORD_RESET_REQUESTED
EMAIL_VERIFICATION_SENT
EMAIL_VERIFIED
PHONE_OTP_SENT
PHONE_LOGIN_SUCCESS
GOOGLE_LOGIN_SUCCESS
TWO_FACTOR_CHALLENGE
TWO_FACTOR_ENABLED
TWO_FACTOR_DISABLED
USER_REGISTERED
USER_APPROVED
USER_DISABLED
USER_REACTIVATED
USER_PASSWORD_RESET
ROLE_CHANGED
PROFILE_UPDATED
COMPANY_UPDATED
SETUP_COMPLETED
WORKFLOW_CREATED
WORKFLOW_BUDGET_ADDED
WORKFLOW_PEOPLE_ASSIGNED
WORKFLOW_APPROVED
WORKFLOW_REJECTED
NOTIFICATION_SENT
NOTIFICATION_READ
STAFF_PROFILE_UPDATED
STAFF_CONTRACT_CREATED
STAFF_DOCUMENT_CREATED
STAFF_MISSION_CREATED
CLIENT_CREATED
SERVICE_REQUEST_CREATED
QUOTE_CREATED
QUOTE_STATUS_UPDATED
CLIENT_EXCHANGE_CREATED
DOCUMENT_CREATED
DOCUMENT_VALIDATED
REPORT_EXPORTED
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
- reset password avec token hashe en base et email SMTP ;
- verification email apres inscription ;
- Google OAuth via verification du `idToken` ;
- OTP telephone via Twilio ;
- 2FA Admin par application TOTP ;
- blocage temporaire apres echecs de connexion ;
- CORS configure pour Vite en local ;
- validation stricte des payloads ;
- controle d'acces par role ;
- audit login/register/validation/changement de role ;
- audit des modifications du profil connecte ;
- audit des modifications entreprise ;
- audit des actions workflow et notifications ;
- audit des actions RH : profil, contrat, document et mission ;
- audit des actions commerciales : client, demande, devis et echange ;
- audit de creation/validation des documents ;
- audit des exports de rapports ;
- notifications in-app persistantes avec lecture/non lecture ;
- alertes budget et workflow vers les profils concernes ;
- changement de mot de passe obligatoire apres creation admin ou validation utilisateur.

A ajouter avant production :

- secrets forts dans `.env` ;
- HTTPS obligatoire ;
- rate limiting sur login/register ;
- fournisseur SMTP, Google OAuth et Twilio configures avec des comptes de production ;
- envoi reel WhatsApp depuis un fournisseur officiel pour les mots de passe temporaires ;
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

Note : les migrations `20260715063000_add_event_management`,
`20260716003643_add_workflows_notifications`, `20260716010817_add_hr_module` et
`20260716023000_add_commercial_documents_reports` ont ete creees manuellement parce que
Docker/PostgreSQL n'etait pas joignable pendant cette etape. Des que Docker Desktop est ouvert et
que PostgreSQL repond sur `localhost:5432`, lancer :

```powershell
cd D:\PROJETS\Dev\mgroup-app\server
npm run prisma:migrate
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
npx prisma validate
npm run lint
npm run build

cd D:\PROJETS\Dev\mgroup-app\client
npm run lint
npm run build
```

Tests HTTP utiles pour verification locale :

```txt
GET http://127.0.0.1:4000/api/setup/status
POST http://127.0.0.1:4000/api/auth/login
POST http://127.0.0.1:4000/api/auth/google
POST http://127.0.0.1:4000/api/auth/verify-email
POST http://127.0.0.1:4000/api/auth/phone/request-otp
POST http://127.0.0.1:4000/api/auth/phone/verify-otp
POST http://127.0.0.1:4000/api/auth/2fa/verify-login
POST http://127.0.0.1:4000/api/auth/forgot-password
POST http://127.0.0.1:4000/api/auth/reset-password
PATCH http://127.0.0.1:4000/api/users/me
GET http://127.0.0.1:4000/api/users
GET http://127.0.0.1:4000/api/users/activity
GET http://127.0.0.1:4000/api/users/:id/history
GET http://127.0.0.1:4000/api/auth/sessions
GET http://127.0.0.1:4000/api/auth/login-history
GET http://127.0.0.1:4000/api/events
POST http://127.0.0.1:4000/api/events
GET http://127.0.0.1:4000/api/finance/summary
GET http://127.0.0.1:4000/api/finance/events/:eventId
GET http://127.0.0.1:4000/api/workflows
POST http://127.0.0.1:4000/api/workflows
GET http://127.0.0.1:4000/api/notifications
GET http://127.0.0.1:4000/api/notifications/unread-count
GET http://127.0.0.1:4000/api/hr/overview
GET http://127.0.0.1:4000/api/commercial/overview
GET http://127.0.0.1:4000/api/commercial/clients
POST http://127.0.0.1:4000/api/commercial/clients
POST http://127.0.0.1:4000/api/commercial/requests
POST http://127.0.0.1:4000/api/commercial/quotes
GET http://127.0.0.1:4000/api/documents/overview
POST http://127.0.0.1:4000/api/documents
POST http://127.0.0.1:4000/api/documents/generate
GET http://127.0.0.1:4000/api/reports/summary
POST http://127.0.0.1:4000/api/reports/export
GET http://127.0.0.1:4000/api/setup/company
PATCH http://127.0.0.1:4000/api/setup/company
GET http://127.0.0.1:5173/
```

Les routes `/api/auth/sessions`, `/api/auth/login-history`, `/api/auth/2fa/setup`,
`/api/auth/2fa/enable`, `/api/auth/2fa/disable`, `/api/events`, `/api/finance/*`,
`/api/workflows`, `/api/notifications`, `/api/hr/*`, `/api/commercial/*`, `/api/documents/*`,
`/api/reports/*`, `/api/setup/company` et `PATCH /api/setup/company`
demandent une session connectee valide. Les routes entreprise, la configuration 2FA, la
validation/rejet de budgets, la validation documentaire, la decision finale des workflows et les rappels evenement sont
reserves au role `ADMIN`.

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
- Les modules Commercial, Documents et Rapports sont maintenant branches sur Prisma et l'API NestJS.
- Les exports PDF/Excel et les uploads fichiers sont fonctionnels en prototype, mais doivent etre remplaces par de vrais services de stockage/generation avant production.
- Les photos sont envoyees en Data URL pour le prototype. En production, il faudra faire un vrai module d'upload.
- Le dashboard admin lit les demandes `PENDING` depuis PostgreSQL.
- Les mots de passe ne sont jamais stockes en clair en base.
