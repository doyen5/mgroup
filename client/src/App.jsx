import { useEffect, useState } from 'react'
import heroImage from './assets/mgroup-event-hero.jpg'
import './App.css'

// Prestations affichees sur la page d'accueil finale.
const features = [
  {
    title: 'Production evenementielle',
    label: 'Production',
    text: 'Organisation complete de concerts, ceremonies, conferences et experiences premium.',
  },
  {
    title: 'Pilotage artistique',
    label: 'Coordination',
    text: 'Coordination des equipes, invites, partenaires et prestataires autour des projets de Molare.',
  },
  {
    title: 'Gestion administrative',
    label: 'Controle',
    text: 'Suivi des documents, budgets, validations, inscriptions et workflows internes de M Group.',
  },
]

// Roles supportes par la future logique RBAC cote backend.
const availableRoles = ['Secrétaire', 'Comptable', 'RH', 'Commercial', 'Admin']

// Profil de test utilise tant que l'API d'authentification n'existe pas.
const adminProfile = {
  fullName: 'Désiré Kouamé AHOU',
  role: 'Admin',
  initials: 'DK',
}

// Formatage unique pour l'horloge, le toast et la derniere connexion.
const formatDateTime = (date) =>
  new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(date)

function App() {
  const [currentView, setCurrentView] = useState('gateway')
  const [authMode, setAuthMode] = useState('login')
  const [authNotice, setAuthNotice] = useState('')
  const [loginTarget, setLoginTarget] = useState('dashboard')
  const [activeUser, setActiveUser] = useState(adminProfile)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [lastLoginAt, setLastLoginAt] = useState(null)
  const [showLoginToast, setShowLoginToast] = useState(false)

  // Le message de derniere connexion disparait automatiquement apres 5 secondes.
  useEffect(() => {
    if (!showLoginToast) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setShowLoginToast(false)
    }, 5000)

    return () => window.clearTimeout(timeoutId)
  }, [showLoginToast])

  // Navigation centralisee pour conserver un comportement coherent entre les vues.
  const showView = (view) => {
    setCurrentView(view)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Le patron arrive sur la configuration entreprise + compte admin.
  const startAdminSetup = () => {
    setAuthNotice('')
    showView('adminSetup')
  }

  // Les autres utilisateurs arrivent directement sur l'inscription en attente admin.
  const startUserRegistration = () => {
    setAuthMode('register')
    setAuthNotice(
      "Votre compte devra etre valide par l'administrateur, qui choisira votre role et vous communiquera votre mot de passe.",
    )
    showView('auth')
  }

  // Apres configuration admin, l'acces dashboard force une reconnexion.
  const requestAdminDashboardAfterSetup = () => {
    setAuthMode('login')
    setLoginTarget('passwordChange')
    setAuthNotice(
      'Configuration enregistree. Connectez-vous avec le compte admin, puis modifiez votre mot de passe.',
    )
    showView('auth')
  }

  // Apres configuration admin, la page d'accueil devient accessible.
  const goHome = () => {
    setAuthNotice('')
    showView('home')
  }

  // Mon Espace et deconnexion redirigent vers la page de connexion stylisee.
  const goLogin = (notice = '') => {
    setAuthMode('login')
    setLoginTarget('dashboard')
    setAuthNotice(notice)
    showView('auth')
  }

  // Simulation de connexion : le backend verifiera les identifiants plus tard.
  const handleLogin = (event) => {
    event.preventDefault()
    setActiveUser(adminProfile)
    setLastLoginAt(new Date())
    setShowLoginToast(true)

    if (loginTarget === 'passwordChange') {
      showView('passwordChange')
      return
    }

    showView('dashboard')
  }

  // En mode test, l'inscription utilisateur s'arrete sur une attente de validation.
  const handleRegister = (event) => {
    event.preventDefault()
    showView('pendingApproval')
  }

  // Apres le changement de mot de passe obligatoire, l'admin rejoint son dashboard.
  const handlePasswordChange = (event) => {
    event.preventDefault()
    setLoginTarget('dashboard')
    showView('dashboard')
  }

  // Confirmation de deconnexion avant de quitter la session.
  const confirmLogout = () => {
    setIsLogoutConfirmOpen(false)
    setShowLoginToast(false)
    setActiveUser(adminProfile)
    goLogin('Vous avez ete deconnecte. Reconnectez-vous pour acceder a votre espace.')
  }

  return (
    <main className="site-shell">
      {currentView === 'gateway' && (
        <GatewayView onAdmin={startAdminSetup} onOther={startUserRegistration} />
      )}

      {currentView === 'adminSetup' && (
        <AdminSetupWizard
          onGoDashboard={requestAdminDashboardAfterSetup}
          onGoHome={goHome}
        />
      )}

      {currentView === 'auth' && (
        <AuthPage
          authMode={authMode}
          notice={authNotice}
          onGmailAccess={() =>
            setAuthNotice("Google OAuth sera branche cote backend pour Gmail.")
          }
          onModeChange={(mode) => {
            setAuthMode(mode)
            setAuthNotice('')
          }}
          onRegisterSubmit={handleRegister}
          onSubmit={handleLogin}
        />
      )}

      {currentView === 'passwordChange' && (
        <PasswordChangePage onSubmit={handlePasswordChange} />
      )}

      {currentView === 'pendingApproval' && <PendingApprovalPage onGoLogin={goLogin} />}

      {currentView === 'home' && <HomeView onOpenAuth={() => goLogin()} />}

      {currentView === 'dashboard' && (
        <DashboardView
          lastLoginAt={lastLoginAt}
          onGoHome={goHome}
          onRequestLogout={() => setIsLogoutConfirmOpen(true)}
          user={activeUser}
        />
      )}

      {isLogoutConfirmOpen && (
        <LogoutConfirmModal
          onCancel={() => setIsLogoutConfirmOpen(false)}
          onConfirm={confirmLogout}
        />
      )}

      {showLoginToast && lastLoginAt && (
        <div className="login-toast" role="status">
          <strong>Derniere connexion</strong>
          <span>{formatDateTime(lastLoginAt)}</span>
        </div>
      )}
    </main>
  )
}

function GatewayView({ onAdmin, onOther }) {
  return (
    <section className="gateway-page" aria-label="Choix du type utilisateur">
      {/* Premiere porte d'entree : on choisit le parcours avant tout acces. */}
      <div className="gateway-card">
        <a className="brand dark gateway-brand" href="#start" aria-label="M Group">
          <span className="gateway-logo-mark">
            <img src="/mgroup-logo.svg" alt="" />
          </span>
        </a>
        {/*<p className="eyebrow">Mode test</p>*/}
        <h2>Qui souhaite acceder a la plateforme ?</h2>
        <p>
          Le patron configure d'abord l'entreprise et son compte admin. Les
          autres utilisateurs demandent une inscription, puis attendent la
          validation de l'administrateur.
        </p>
        <div className="gateway-actions">
          <button type="button" className="primary-button large" onClick={onAdmin}>
            Administrateur
          </button>
          <button type="button" className="secondary-button bordered large" onClick={onOther}>
            Autre utilisateur
          </button>
        </div>
      </div>
    </section>
  )
}

function HomeView({ onOpenAuth }) {
  return (
    <>
      {/* Page d'accueil finale accessible apres le choix ou apres configuration admin. */}
      <section className="hero-section" aria-label="Accueil M Group">
        <img className="hero-bg" src={heroImage} alt="" />
        <div className="hero-overlay"></div>

        <header className="topbar" aria-label="Navigation principale">
          <a className="brand" href="#accueil" aria-label="Retour a l'accueil">
            <span className="brand-mark">M</span>
            <span>M Group</span>
          </a>
          <div className="nav-actions">
            <button type="button" className="primary-button" onClick={onOpenAuth}>
              Mon Espace
            </button>
          </div>
        </header>

        <div id="accueil" className="hero-content">
          <p className="eyebrow">Gestion evenementielle premium</p>
          <h1>M Group pilote ses evenements avec precision.</h1>
          <p className="hero-copy">
            Une plateforme interne pour coordonner les productions, les finances,
            les ressources humaines et les validations autour des projets de Molare.
          </p>
          <div className="hero-actions">
            <a className="primary-button large" href="#apropos">
              Lire la suite
            </a>
            <a className="secondary-button large" href="#prestations">
              Voir nos prestations
            </a>
          </div>
        </div>
      </section>

      <section id="apropos" className="about-section">
        <div className="about-media">
          <img src={heroImage} alt="Equipe M Group en preparation evenementielle" />
        </div>
        <div className="about-content">
          <p className="eyebrow">A Propos</p>
          <h2>M Group, une structure au service de l'experience evenementielle.</h2>
          <p>
            Autour de Molare, M Group coordonne des projets qui demandent
            precision, vitesse d'execution et sens du detail. Cette application
            centralise les informations importantes, fluidifie les validations
            et donne a chaque equipe une lecture claire de son role.
          </p>
          <p>
            L'objectif est simple : mieux organiser les prestations, securiser
            les acces, suivre les budgets et garder une memoire fiable de chaque
            evenement.
          </p>
        </div>
      </section>

      <section id="prestations" className="content-section">
        <div className="section-heading">
          <p className="eyebrow">Nos prestations</p>
          <h2>Des services structures pour l'evenementiel.</h2>
          <p>
            Chaque prestation doit etre lisible, suivie et validee avec les bons
            outils pour garder un haut niveau de qualite.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-media">
                <img src={heroImage} alt="" />
              </div>
              <div className="feature-body">
                <span>{feature.label}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="organisation" className="split-section">
        <div>
          <p className="eyebrow">Acces securise</p>
          <h2>Connexion, inscription et droits adaptes.</h2>
        </div>
        <p>
          Les nouveaux utilisateurs peuvent demander un compte, mais seul
          l'administrateur attribue un role et confirme l'inscription.
        </p>
      </section>

      <footer className="footer">
        <span>Copyright © 2026 mgroup</span>
        <span>Désiré Kouamé AHOU CONCEPTION</span>
      </footer>
    </>
  )
}

function AuthPage({
  authMode,
  notice,
  onGmailAccess,
  onModeChange,
  onRegisterSubmit,
  onSubmit,
}) {
  const [registerStep, setRegisterStep] = useState('identity')

  // L'inscription reprend au debut quand on repasse sur l'onglet Register.
  const setMode = (mode) => {
    setRegisterStep('identity')
    onModeChange(mode)
  }

  return (
    <section className="auth-page" aria-label="Connexion et inscription">
      {/* Page de connexion finale : utilisee apres deconnexion et pour Mon Espace. */}
      <div className="auth-card">
        {/* Logo entreprise : cercle visuel place en haut du formulaire de connexion. */}
        <div className="auth-logo-frame">
          <img src="/mgroup-logo.svg" alt="Logo M Group" />
        </div>

        <div className="auth-switch" role="tablist" aria-label="Choisir connexion ou inscription">
          <button
            type="button"
            className={authMode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            LOGIN
          </button>
          <button
            type="button"
            className={authMode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            REGISTER
          </button>
        </div>

        {notice && <p className="auth-notice">{notice}</p>}

        <p className="auth-lead">Sign in with:</p>
        <div className="social-row" aria-label="Connexion sociale">
          <button type="button" onClick={onGmailAccess} aria-label="Gmail">
            G
          </button>
          <button type="button" aria-label="Contact">
            @
          </button>
          <button type="button" aria-label="Telephone">
            ☎
          </button>
          <button type="button" aria-label="Utilisateur">
            ◎
          </button>
        </div>
        <p className="auth-separator">or:</p>

        {authMode === 'login' ? (
          <form className="auth-form clean" onSubmit={onSubmit}>
            <label>
              Email or username
              <input type="email" placeholder="admin@mgroup.ci" required />
            </label>
            <label>
              Password
              <input type="password" placeholder="Votre mot de passe" required />
            </label>
            <div className="auth-options">
              <label className="check-row">
                <input type="checkbox" defaultChecked />
                Remember me
              </label>
              <button type="button">Forgot password?</button>
            </div>
            <button type="submit" className="primary-button full auth-submit">
              SIGN IN
            </button>
            <p className="auth-bottom">
              Not a member?{' '}
              <button type="button" onClick={() => setMode('register')}>
                Register
              </button>
            </p>
          </form>
        ) : (
          <RegisterWizard
            registerStep={registerStep}
            onBack={() => setRegisterStep('identity')}
            onContinue={() => setRegisterStep('account')}
            onSubmit={onRegisterSubmit}
          />
        )}
      </div>
    </section>
  )
}

function RegisterWizard({ registerStep, onBack, onContinue, onSubmit }) {
  if (registerStep === 'identity') {
    return (
      <form className="auth-form clean" onSubmit={(event) => {
        event.preventDefault()
        onContinue()
      }}>
        {/* Etape 1 : l'utilisateur renseigne uniquement ses informations personnelles. */}
        <div className="setup-steps compact" aria-label="Progression de l'inscription">
          <span className="setup-step active">1. Identite</span>
          <span className="setup-step">2. Compte</span>
        </div>
        <label>
          Nom
          <input type="text" placeholder="Votre nom" required />
        </label>
        <label>
          Prenom(s)
          <input type="text" placeholder="Vos prenoms" required />
        </label>
        <label>
          Adresse
          <input type="text" placeholder="Votre adresse" required />
        </label>
        <label>
          Contact
          <input type="tel" placeholder="+225 00 00 00 00 00" required />
        </label>
        <label>
          Photo
          <input type="file" accept="image/*" />
        </label>
        <button type="submit" className="primary-button full auth-submit">
          Continuer
        </button>
      </form>
    )
  }

  return (
    <form className="auth-form clean" onSubmit={onSubmit}>
      {/* Etape 2 : aucun role n'est choisi par l'utilisateur. */}
      <div className="setup-steps compact" aria-label="Progression de l'inscription">
        <span className="setup-step done">1. Identite</span>
        <span className="setup-step active">2. Compte</span>
      </div>
      <label>
        Email
        <input type="email" placeholder="nom@mgroup.ci" required />
      </label>
      <p className="form-note">
        L'administrateur choisira votre role parmi : {availableRoles.join(', ')}.
        Vous recevrez ensuite votre mot de passe pour vous connecter.
      </p>
      <div className="setup-actions">
        <button type="button" className="secondary-button bordered" onClick={onBack}>
          Retour
        </button>
        <button type="submit" className="primary-button">
          Demander l'inscription
        </button>
      </div>
    </form>
  )
}

function AdminSetupWizard({ onGoDashboard, onGoHome }) {
  const [setupStep, setSetupStep] = useState('company')
  const [isSetupComplete, setIsSetupComplete] = useState(false)

  // La configuration admin est decoupee en deux parties comme dans un assistant.
  const handleCompanySubmit = (event) => {
    event.preventDefault()
    setSetupStep('owner')
  }

  const handleOwnerSubmit = (event) => {
    event.preventDefault()
    setIsSetupComplete(true)
  }

  return (
    <section className="setup-page" aria-label="Configuration initiale administrateur">
      <div className="setup-panel">
        {isSetupComplete ? (
          <>
            <div className="setup-heading success">
              <p className="eyebrow">Configuration enregistree</p>
              <h2>Quelle redirection souhaitez-vous ?</h2>
              <p>
                Pour acceder au dashboard, l'administrateur doit se reconnecter
                puis modifier son mot de passe avant d'entrer dans son espace.
              </p>
            </div>
            <div className="choice-actions">
              <button type="button" className="primary-button large" onClick={onGoDashboard}>
                Dashboard
              </button>
              <button type="button" className="secondary-button bordered large" onClick={onGoHome}>
                Page d'accueil
              </button>
            </div>
          </>
        ) : setupStep === 'company' ? (
          <>
            <div className="setup-heading">
              <p className="eyebrow">Administrateur</p>
              <h2>Renseigner les informations de l'entreprise.</h2>
              <p>
                Ces donnees serviront de base aux documents, rapports et
                workflows internes de M Group.
              </p>
            </div>
            <div className="setup-steps" aria-label="Progression de la configuration">
              <span className="setup-step active">1. Entreprise</span>
              <span className="setup-step">2. Patron</span>
            </div>
            <form className="setup-form" onSubmit={handleCompanySubmit}>
              <fieldset>
                <legend>Informations de l'entreprise</legend>
                <div className="form-grid">
                  <label>
                    Nom de l'entreprise
                    <input type="text" placeholder="M Group" required />
                  </label>
                  <label>
                    Raison sociale
                    <input type="text" placeholder="M Group SARL" required />
                  </label>
                  <label>
                    Adresse
                    <input type="text" placeholder="Adresse du siege" required />
                  </label>
                  <label>
                    Email
                    <input type="email" placeholder="contact@mgroup.ci" required />
                  </label>
                  <label>
                    Contact
                    <input type="tel" placeholder="+225 00 00 00 00 00" required />
                  </label>
                  <label>
                    Photo ou logo
                    <input type="file" accept="image/*" />
                  </label>
                </div>
              </fieldset>
              <button type="submit" className="primary-button full">
                Continuer vers le profil patron
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="setup-heading">
              <p className="eyebrow">Compte patron</p>
              <h2>Creer le premier compte administrateur.</h2>
              <p>
                Ce compte pourra valider les inscriptions, attribuer les roles
                et piloter les modules sensibles.
              </p>
            </div>
            <div className="setup-steps" aria-label="Progression de la configuration">
              <span className="setup-step done">1. Entreprise</span>
              <span className="setup-step active">2. Patron</span>
            </div>
            <form className="setup-form" onSubmit={handleOwnerSubmit}>
              <fieldset>
                <legend>Informations du patron</legend>
                <div className="form-grid">
                  <label>
                    Nom
                    <input type="text" placeholder="Votre nom" required />
                  </label>
                  <label>
                    Prenom(s)
                    <input type="text" placeholder="Vos prenoms" required />
                  </label>
                  <label>
                    Adresse
                    <input type="text" placeholder="Votre adresse" required />
                  </label>
                  <label>
                    Email
                    <input type="email" placeholder="admin@mgroup.ci" required />
                  </label>
                  <label>
                    Contact
                    <input type="tel" placeholder="+225 00 00 00 00 00" required />
                  </label>
                  <label>
                    Mot de passe initial
                    <input type="password" placeholder="Mot de passe provisoire" required />
                  </label>
                  <label>
                    Photo
                    <input type="file" accept="image/*" />
                  </label>
                </div>
              </fieldset>
              <div className="setup-actions">
                <button
                  type="button"
                  className="secondary-button bordered"
                  onClick={() => setSetupStep('company')}
                >
                  Retour entreprise
                </button>
                <button type="submit" className="primary-button">
                  Enregistrer
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  )
}

function PasswordChangePage({ onSubmit }) {
  return (
    <section className="auth-page" aria-label="Modification du mot de passe">
      <div className="auth-card password-card">
        {/* Passage obligatoire avant le premier dashboard admin. */}
        <p className="eyebrow">Securite</p>
        <h1>Modifiez votre mot de passe.</h1>
        <p className="auth-notice">
          Cette etape protege le compte administrateur avant le premier acces au
          dashboard.
        </p>
        <form className="auth-form clean" onSubmit={onSubmit}>
          <label>
            Nouveau mot de passe
            <input type="password" placeholder="Nouveau mot de passe" required />
          </label>
          <label>
            Confirmer le mot de passe
            <input type="password" placeholder="Confirmer" required />
          </label>
          <button type="submit" className="primary-button full auth-submit">
            Valider et acceder au dashboard
          </button>
        </form>
      </div>
    </section>
  )
}

function PendingApprovalPage({ onGoLogin }) {
  return (
    <section className="auth-page" aria-label="Attente de validation">
      <div className="auth-card pending-card">
        {/* L'utilisateur ne peut pas choisir son role ni se connecter sans validation. */}
        <p className="eyebrow">Inscription envoyee</p>
        <h1>Votre demande attend la validation admin.</h1>
        <p>
          L'administrateur confirmera votre inscription, choisira votre role
          parmi {availableRoles.join(', ')}, puis vous communiquera votre mot de
          passe de connexion.
        </p>
        <button
          type="button"
          className="secondary-button bordered large"
          onClick={() => onGoLogin('Vous pourrez vous connecter apres validation admin.')}
        >
          Aller a la connexion
        </button>
      </div>
    </section>
  )
}

function DashboardView({ lastLoginAt, onGoHome, onRequestLogout, user }) {
  const [now, setNow] = useState(() => new Date())

  // Horloge temps reel affichee dans l'en-tete du dashboard.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <section className="dashboard-shell" aria-label="Dashboard administrateur">
      <header className="dashboard-header">
        <a className="brand dark" href="#dashboard" aria-label="Dashboard M Group">
          <span className="brand-mark">M</span>
          <span>M Group Admin</span>
        </a>
        <div className="dashboard-actions">
          <time className="time-chip" dateTime={now.toISOString()}>
            {now.toLocaleTimeString('fr-FR')}
          </time>
          <button type="button" className="secondary-button bordered" onClick={onGoHome}>
            Accueil du site
          </button>
          <button type="button" className="danger-button" onClick={onRequestLogout}>
            Deconnexion
          </button>
        </div>
      </header>

      <section className="profile-welcome" aria-label="Profil connecte">
        <div className="profile-avatar" aria-label={`Photo de ${user.fullName}`}>
          <span>{user.initials}</span>
        </div>
        <div>
          <p className="eyebrow">Bienvenue</p>
          <h2>{user.fullName}</h2>
          <span className="role-badge">{user.role}</span>
          <p className="welcome-message">
            Ravi de vous revoir. Votre espace de pilotage est pret.
          </p>
        </div>
        {lastLoginAt && (
          <p className="last-login-inline">
            Derniere connexion : {formatDateTime(lastLoginAt)}
          </p>
        )}
      </section>

      <div id="dashboard" className="dashboard-hero">
        <p className="eyebrow">Dashboard admin</p>
        <h1>Validation des acces et pilotage M Group.</h1>
        <p>
          Cette vue prepare les futures actions du patron : confirmer les
          inscriptions, attribuer les roles et suivre les modules sensibles.
        </p>
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-card">
          <span className="metric">12</span>
          <p>Evenements en preparation</p>
        </article>
        <article className="dashboard-card">
          <span className="metric">4</span>
          <p>Demandes d'inscription a verifier</p>
        </article>
        <article className="dashboard-card">
          <span className="metric">3</span>
          <p>Budgets en attente de validation</p>
        </article>
      </div>

      <section className="approval-panel" aria-label="Demandes d'inscription">
        <div>
          <p className="eyebrow">Validation admin</p>
          <h2>Attribuer un role avant activation.</h2>
        </div>
        <div className="approval-row">
          <div>
            <strong>Kouame Sarah</strong>
            <span>sarah.kouame@example.com</span>
          </div>
          <select aria-label="Role a attribuer">
            {availableRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button type="button" className="primary-button">
            Confirmer
          </button>
        </div>
      </section>
    </section>
  )
}

function LogoutConfirmModal({ onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-panel" aria-label="Confirmation de deconnexion">
        {/* Confirmation obligatoire avant de quitter la session admin. */}
        <div className="setup-heading success">
          <p className="eyebrow">Deconnexion</p>
          <h2>Voulez-vous vraiment vous deconnecter ?</h2>
          <p>
            Vous quitterez le dashboard admin et serez redirige vers la page de
            connexion.
          </p>
        </div>
        <div className="choice-actions">
          <button type="button" className="secondary-button bordered large" onClick={onCancel}>
            Annuler
          </button>
          <button type="button" className="danger-button large" onClick={onConfirm}>
            Confirmer
          </button>
        </div>
      </section>
    </div>
  )
}

export default App
