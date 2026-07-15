import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Banknote,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Eye,
  History,
  Home,
  Layers,
  LogOut,
  Mail,
  MessageCircle,
  MonitorCog,
  Smartphone,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  Wallet,
  XCircle,
} from 'lucide-react'
import { api, fileToDataUrl } from './api'
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

// Roles backend disponibles. La valeur est envoyee a Prisma, le label est affiche a l'ecran.
const availableRoles = [
  { value: 'SECRETAIRE', label: 'Secretaire' },
  { value: 'COMPTABLE', label: 'Comptable' },
  { value: 'RH', label: 'RH' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'CLIENT', label: 'Client' },
  { value: 'AUTRE', label: 'Autre' },
  { value: 'ADMIN', label: 'Admin' },
]

const eventRows = [
  { title: 'Concert prive - Plateau', date: '22 juillet 2026', budget: 4500000, status: 'Production' },
  { title: 'Conference partenaire', date: '28 juillet 2026', budget: 2800000, status: 'Validation' },
  { title: 'Activation marque', date: '04 aout 2026', budget: 6200000, status: 'Brief client' },
]

const financeRows = [
  { label: 'Cachets artistes', value: 9200000, percent: 58 },
  { label: 'Technique et scene', value: 5400000, percent: 34 },
  { label: 'Communication', value: 2700000, percent: 22 },
  { label: 'Logistique', value: 3900000, percent: 28 },
]

const teamRows = [
  { role: 'Production', members: 8, load: 76 },
  { role: 'Finance', members: 3, load: 42 },
  { role: 'Commercial', members: 5, load: 61 },
  { role: 'RH', members: 2, load: 35 },
]

const alertRows = [
  { title: 'Budget technique a valider', level: 'Haute', time: 'Aujourd hui 09:20' },
  { title: 'Nouvelle demande utilisateur', level: 'Moyenne', time: 'Aujourd hui 08:42' },
  { title: 'Facture prestataire en attente', level: 'Haute', time: 'Hier 18:10' },
]

// Formatage unique pour l'horloge, le toast et la derniere connexion.
const formatDateTime = (date) =>
  new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(date)

const formatFcfa = (value) => `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`

// Lecture securisee d'un champ de formulaire HTML.
const getFormValue = (formData, name) => String(formData.get(name) ?? '').trim()

const settingsStorageKey = 'mgroup.admin.preferences'

const defaultAdminSettings = {
  display: {
    theme: 'light',
    language: 'fr',
    dateFormat: 'full',
    timezone: 'Africa/Abidjan',
    density: 'comfortable',
    widgets: {
      budget: true,
      events: true,
      alerts: true,
      team: true,
      finance: true,
    },
  },
  notifications: {
    registration: true,
    budget: true,
    event: true,
    email: true,
    inApp: true,
    reminderFrequency: 'daily',
  },
  modules: {
    events: true,
    finances: true,
    rh: true,
    commercial: true,
    documents: false,
    prestations: true,
    reports: false,
  },
}

const readAdminSettings = () => {
  try {
    const storedSettings = window.localStorage.getItem(settingsStorageKey)
    return storedSettings
      ? {
          ...defaultAdminSettings,
          ...JSON.parse(storedSettings),
          display: {
            ...defaultAdminSettings.display,
            ...JSON.parse(storedSettings).display,
            widgets: {
              ...defaultAdminSettings.display.widgets,
              ...JSON.parse(storedSettings).display?.widgets,
            },
          },
          notifications: {
            ...defaultAdminSettings.notifications,
            ...JSON.parse(storedSettings).notifications,
          },
          modules: {
            ...defaultAdminSettings.modules,
            ...JSON.parse(storedSettings).modules,
          },
        }
      : defaultAdminSettings
  } catch {
    return defaultAdminSettings
  }
}

const writeAdminSettings = (settings) => {
  window.localStorage.setItem(settingsStorageKey, JSON.stringify(settings))
}

// Traduit les evenements d'audit backend en libelles lisibles dans l'interface.
const auditActionLabel = (action) =>
  ({
    LOGIN_SUCCESS: 'Connexion reussie',
    LOGOUT: 'Deconnexion',
    PASSWORD_CHANGED: 'Mot de passe modifie',
    PROFILE_UPDATED: 'Profil modifie',
    USER_APPROVED: 'Inscription validee',
    USER_DISABLED: 'Compte desactive',
    USER_REACTIVATED: 'Compte reactive',
    USER_PASSWORD_RESET: 'Mot de passe reinitialise',
    ROLE_CHANGED: 'Role modifie',
    COMPANY_UPDATED: 'Entreprise modifiee',
    USER_REGISTERED: 'Inscription demandee',
    SETUP_COMPLETED: 'Configuration initiale',
  })[action] ?? action

// Controle les informations demandees lors de l'inscription avant validation Admin.
const getRegistrationChecklist = (user) => [
  { label: 'Nom', value: user.lastName },
  { label: 'Prenom(s)', value: user.firstName },
  { label: 'Adresse', value: user.address },
  { label: 'Contact', value: user.phone },
  { label: 'Email', value: user.email },
  { label: 'Photo', value: user.photoUrl },
]

const normalizePhone = (phone) => String(phone ?? '').replace(/[^\d]/g, '')

const buildTemporaryPasswordMessage = ({ email, fullName, password, role }) =>
  `Bonjour ${fullName || ''}, votre compte M Group est valide avec le role ${role}. Email: ${email}. Mot de passe temporaire: ${password}. Connectez-vous puis changez votre mot de passe.`

// Transforme le format backend en profil directement exploitable par le dashboard.
const toDashboardUser = (user) => {
  const firstName = user?.firstName ?? ''
  const lastName = user?.lastName ?? ''
  const roleValues = user?.roles?.map((role) => role.name) ?? []
  const roleLabel = user?.roles?.[0]?.label ?? roleValues[0] ?? 'Utilisateur'
  const initials = `${lastName[0] ?? ''}${firstName[0] ?? ''}`.toUpperCase() || 'MG'

  return {
    ...user,
    fullName: `${lastName} ${firstName}`.trim() || user?.email || 'Utilisateur M Group',
    initials,
    role: roleLabel,
    roleValues,
  }
}

function App() {
  const [currentView, setCurrentView] = useState('boot')
  const [setupStatus, setSetupStatus] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authNotice, setAuthNotice] = useState('')
  const [passwordNotice, setPasswordNotice] = useState('')
  const [createdAdminEmail, setCreatedAdminEmail] = useState('')
  const [activeUser, setActiveUser] = useState(null)
  const [isAuthBusy, setIsAuthBusy] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [lastLoginAt, setLastLoginAt] = useState(null)
  const [showLoginToast, setShowLoginToast] = useState(false)

  // Au lancement, le frontend demande au backend si le premier setup admin est requis.
  useEffect(() => {
    let isMounted = true

    api
      .getSetupStatus()
      .then((status) => {
        if (!isMounted) {
          return
        }

        setSetupStatus(status)
        setCurrentView(status.requiresSetup ? 'gateway' : 'home')
      })
      .catch((error) => {
        if (!isMounted) {
          return
        }

        setAuthNotice(`API indisponible : ${error.message}`)
        setCurrentView('gateway')
      })

    return () => {
      isMounted = false
    }
  }, [])

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

  const startAdminSetup = () => {
    setAuthNotice('')
    showView('adminSetup')
  }

  const startUserRegistration = () => {
    setAuthMode('register')
    setAuthNotice(
      setupStatus?.requiresSetup
        ? "Vous pouvez preparer une demande, mais l'admin doit d'abord configurer l'entreprise."
        : "Votre compte devra etre valide par l'administrateur, qui choisira votre role.",
    )
    showView('auth')
  }

  const requestAdminDashboardAfterSetup = () => {
    setAuthMode('login')
    setAuthNotice(
      createdAdminEmail
        ? `Connectez-vous avec ${createdAdminEmail}, puis modifiez votre mot de passe.`
        : 'Connectez-vous avec le compte admin, puis modifiez votre mot de passe.',
    )
    showView('auth')
  }

  const goHome = () => {
    setAuthNotice('')
    showView('home')
  }

  const goLogin = (notice = '') => {
    setAuthMode('login')
    setAuthNotice(notice)
    showView('auth')
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    setIsAuthBusy(true)
    setAuthNotice('')

    try {
      const result = await api.login({
        email: getFormValue(formData, 'email'),
        password: getFormValue(formData, 'password'),
        rememberMe: formData.get('rememberMe') === 'on',
      })
      const dashboardUser = toDashboardUser(result.user)

      // Remember me garde uniquement l'email localement ; les tokens restent en cookies HttpOnly.
      if (formData.get('rememberMe') === 'on') {
        window.localStorage.setItem('mgroup.rememberedEmail', getFormValue(formData, 'email'))
      } else {
        window.localStorage.removeItem('mgroup.rememberedEmail')
      }

      setActiveUser(dashboardUser)
      setLastLoginAt(result.user?.lastLoginAt ? new Date(result.user.lastLoginAt) : new Date())
      setShowLoginToast(true)

      if (result.forcePasswordChange) {
        setPasswordNotice('Votre compte exige une modification du mot de passe avant le dashboard.')
        showView('passwordChange')
        return
      }

      showView('dashboard')
    } catch (error) {
      setAuthNotice(error.message)
    } finally {
      setIsAuthBusy(false)
    }
  }

  const handleRegister = async (payload) => {
    setIsAuthBusy(true)
    setAuthNotice('')

    try {
      await api.register(payload)
      showView('pendingApproval')
    } catch (error) {
      setAuthNotice(error.message)
    } finally {
      setIsAuthBusy(false)
    }
  }

  const handlePasswordChange = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const newPassword = getFormValue(formData, 'newPassword')
    const confirmPassword = getFormValue(formData, 'confirmPassword')

    if (newPassword !== confirmPassword) {
      setPasswordNotice('Les deux nouveaux mots de passe ne correspondent pas.')
      return
    }

    setIsAuthBusy(true)
    setPasswordNotice('')

    try {
      await api.changePassword({
        currentPassword: getFormValue(formData, 'currentPassword'),
        newPassword,
      })
      const profile = await api.getUserProfile()

      setActiveUser(toDashboardUser(profile))
      showView('dashboard')
    } catch (error) {
      setPasswordNotice(error.message)
    } finally {
      setIsAuthBusy(false)
    }
  }

  const handleProfileUpdate = async (payload) => {
    const updated = await api.updateUserProfile(payload)
    const dashboardUser = toDashboardUser(updated)

    setActiveUser(dashboardUser)
    return dashboardUser
  }

  const handleCompanyUpdate = async (payload) => {
    // Sauvegarde centralisee pour les parametres entreprise reserves a l'Admin.
    return api.updateCompany(payload)
  }

  const confirmLogout = async () => {
    setIsLogoutConfirmOpen(false)
    setShowLoginToast(false)

    try {
      await api.logout()
    } catch {
      // Meme si le token est deja expire, l'interface doit quitter la session locale.
    }

    setActiveUser(null)
    goLogin('Vous avez ete deconnecte. Reconnectez-vous pour acceder a votre espace.')
  }

  return (
    <main className="site-shell">
      {currentView === 'boot' && <BootView />}

      {currentView === 'gateway' && (
        <GatewayView notice={authNotice} onAdmin={startAdminSetup} onOther={startUserRegistration} />
      )}

      {currentView === 'adminSetup' && (
        <AdminSetupWizard
          onGoDashboard={requestAdminDashboardAfterSetup}
          onGoHome={goHome}
          onSetupComplete={(adminEmail) => {
            setCreatedAdminEmail(adminEmail)
            setSetupStatus({ requiresSetup: false, companyCount: 1, adminCount: 1 })
          }}
        />
      )}

      {currentView === 'auth' && (
        <AuthPage
          authMode={authMode}
          isBusy={isAuthBusy}
          notice={authNotice}
          onGmailAccess={() =>
            setAuthNotice('Google OAuth sera branche apres la configuration OAuth backend.')
          }
          onPhoneAccess={() =>
            setAuthNotice('La connexion par telephone sera branchee avec le service SMS/OTP backend.')
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
        <PasswordChangePage
          isBusy={isAuthBusy}
          notice={passwordNotice}
          onSubmit={handlePasswordChange}
        />
      )}

      {currentView === 'pendingApproval' && <PendingApprovalPage onGoLogin={goLogin} />}

      {currentView === 'home' && <HomeView onOpenAuth={() => goLogin()} />}

      {currentView === 'dashboard' && activeUser && (
        <DashboardView
          lastLoginAt={lastLoginAt}
          onCompanyUpdate={handleCompanyUpdate}
          onGoHome={goHome}
          onProfileUpdate={handleProfileUpdate}
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

function BootView() {
  return (
    <section className="gateway-page" aria-label="Chargement">
      {/* Ecran transitoire pendant que le frontend interroge l'API backend. */}
      <div className="gateway-card boot-card">
        <span className="gateway-logo-mark">
          <img src="/mgroup-logo.svg" alt="" />
        </span>
        <p className="eyebrow">Connexion API</p>
        <h1>Preparation de la plateforme M Group.</h1>
        <p>Verification du setup initial et de la base de donnees...</p>
      </div>
    </section>
  )
}

function GatewayView({ notice, onAdmin, onOther }) {
  return (
    <section className="gateway-page" aria-label="Choix du type utilisateur">
      {/* Premiere porte d'entree : on choisit le parcours avant tout acces. */}
      <div className="gateway-card">
        <a className="brand dark gateway-brand" href="#start" aria-label="M Group">
          <span className="gateway-logo-mark">
            <img src="/mgroup-logo.svg" alt="" />
          </span>
        </a>
        {notice && <p className="auth-notice">{notice}</p>}
        <p className="eyebrow">Mode connecte</p>
        <h1>Qui souhaite acceder a la plateforme ?</h1>
        <p>
          Le patron configure d'abord l'entreprise et son compte admin. Les autres utilisateurs
          demandent une inscription, puis attendent la validation de l'administrateur.
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
      {/* Page d'accueil finale accessible quand le setup initial n'est plus requis. */}
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
            Une plateforme interne pour coordonner les productions, les finances, les ressources
            humaines et les validations autour des projets de Molare.
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
            Autour de Molare, M Group coordonne des projets qui demandent precision, vitesse
            d'execution et sens du detail.
          </p>
          <p>
            L'objectif est simple : mieux organiser les prestations, securiser les acces, suivre les
            budgets et garder une memoire fiable de chaque evenement.
          </p>
        </div>
      </section>

      <section id="prestations" className="content-section">
        <div className="section-heading">
          <p className="eyebrow">Nos prestations</p>
          <h2>Des services structures pour l'evenementiel.</h2>
          <p>
            Chaque prestation doit etre lisible, suivie et validee avec les bons outils pour garder
            un haut niveau de qualite.
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
          Les nouveaux utilisateurs peuvent demander un compte, mais seul l'administrateur attribue
          un role et confirme l'inscription.
        </p>
      </section>

      <footer className="footer">
        <span>Copyright © 2026 mgroup</span>
        <span>Desire Kouame AHOU CONCEPTION</span>
      </footer>
    </>
  )
}

function AuthPage({
  authMode,
  isBusy,
  notice,
  onGmailAccess,
  onPhoneAccess,
  onModeChange,
  onRegisterSubmit,
  onSubmit,
}) {
  const [registerStep, setRegisterStep] = useState('identity')
  const [loginEmail, setLoginEmail] = useState(
    () => window.localStorage.getItem('mgroup.rememberedEmail') ?? '',
  )
  const [rememberMe, setRememberMe] = useState(
    () => Boolean(window.localStorage.getItem('mgroup.rememberedEmail')),
  )
  const [passwordFlow, setPasswordFlow] = useState('login')
  const [resetNotice, setResetNotice] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [isResetBusy, setIsResetBusy] = useState(false)

  // L'inscription reprend au debut quand on repasse sur l'onglet Register.
  const setMode = (mode) => {
    setRegisterStep('identity')
    setPasswordFlow('login')
    setResetNotice('')
    onModeChange(mode)
  }

  const requestPasswordReset = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    setIsResetBusy(true)
    setResetNotice('')

    try {
      const result = await api.forgotPassword({
        email: getFormValue(formData, 'resetEmail'),
      })

      setResetToken(result.developmentResetToken ?? '')
      setPasswordFlow('reset')
      setResetNotice(
        result.developmentResetToken
          ? 'Token genere en mode local. Definissez maintenant votre nouveau mot de passe.'
          : result.message,
      )
    } catch (error) {
      setResetNotice(error.message)
    } finally {
      setIsResetBusy(false)
    }
  }

  const resetPassword = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const newPassword = getFormValue(formData, 'newPassword')
    const confirmPassword = getFormValue(formData, 'confirmPassword')

    if (newPassword !== confirmPassword) {
      setResetNotice('Les deux mots de passe ne correspondent pas.')
      return
    }

    setIsResetBusy(true)
    setResetNotice('')

    try {
      await api.resetPassword({
        token: getFormValue(formData, 'token'),
        newPassword,
      })
      setPasswordFlow('login')
      setResetToken('')
      setResetNotice('Mot de passe reinitialise. Vous pouvez vous connecter.')
    } catch (error) {
      setResetNotice(error.message)
    } finally {
      setIsResetBusy(false)
    }
  }

  return (
    <section className="auth-page" aria-label="Connexion et inscription">
      {/* Page de connexion finale : utilisee apres deconnexion et pour Mon Espace. */}
      <div className="auth-card">
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

        {(notice || resetNotice) && <p className="auth-notice">{notice || resetNotice}</p>}

        <p className="auth-lead">{authMode === 'register' ? 'Sign up with:' : 'Sign in with:'}</p>
        <div
          className="social-row"
          aria-label={authMode === 'register' ? 'Inscription sociale' : 'Connexion sociale'}
        >
          <button type="button" onClick={onGmailAccess} aria-label="Gmail">
            G
          </button>
          <button type="button" onClick={onPhoneAccess} aria-label="Telephone">
            <Smartphone size={17} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
        <p className="auth-separator">or:</p>

        {authMode === 'login' && passwordFlow !== 'login' ? (
          <ForgotPasswordPanel
            isBusy={isResetBusy}
            onBack={() => {
              setPasswordFlow('login')
              setResetNotice('')
            }}
            onRequestReset={requestPasswordReset}
            onResetPassword={resetPassword}
            resetToken={resetToken}
            step={passwordFlow}
          />
        ) : authMode === 'login' ? (
          <form className="auth-form clean" onSubmit={onSubmit}>
            {/* Les noms des champs correspondent au payload POST /api/auth/login. */}
            <label>
              Email
              <input
                name="email"
                type="email"
                placeholder="admin@mgroup.ci"
                required
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
              />
            </label>
            <label>
              Password
              <input name="password" type="password" placeholder="Votre mot de passe" required />
            </label>
            <div className="auth-options">
              <label className="check-row">
                <input
                  name="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => {
                  setPasswordFlow('forgot')
                  setResetNotice('')
                }}
              >
                Forgot password?
              </button>
            </div>
            <button type="submit" className="primary-button full auth-submit" disabled={isBusy}>
              {isBusy ? 'Connexion...' : 'SIGN IN'}
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
            isBusy={isBusy}
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

function ForgotPasswordPanel({
  isBusy,
  onBack,
  onRequestReset,
  onResetPassword,
  resetToken,
  step,
}) {
  if (step === 'forgot') {
    return (
      <form className="auth-form clean" onSubmit={onRequestReset}>
        {/* Etape 1 du mot de passe oublie : demander un token de reset au backend. */}
        <label>
          Email du compte
          <input name="resetEmail" type="email" placeholder="admin@mgroup.ci" required />
        </label>
        <div className="setup-actions">
          <button type="button" className="secondary-button bordered" onClick={onBack}>
            Retour
          </button>
          <button type="submit" className="primary-button" disabled={isBusy}>
            {isBusy ? 'Envoi...' : 'Recevoir le token'}
          </button>
        </div>
      </form>
    )
  }

  return (
    <form className="auth-form clean" onSubmit={onResetPassword}>
      {/* Etape 2 : en local, le token est affiche ici ; en production il viendra par email. */}
      <label>
        Token de reinitialisation
        <input name="token" type="text" defaultValue={resetToken} required />
      </label>
      <label>
        Nouveau mot de passe
        <input name="newPassword" type="password" minLength={10} required />
      </label>
      <label>
        Confirmer le mot de passe
        <input name="confirmPassword" type="password" minLength={10} required />
      </label>
      <div className="setup-actions">
        <button type="button" className="secondary-button bordered" onClick={onBack}>
          Retour
        </button>
        <button type="submit" className="primary-button" disabled={isBusy}>
          {isBusy ? 'Validation...' : 'Changer le mot de passe'}
        </button>
      </div>
    </form>
  )
}

function RegisterWizard({ isBusy, registerStep, onBack, onContinue, onSubmit }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    address: '',
    phone: '',
    email: '',
    photoFile: null,
  })

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submitRegistration = async (event) => {
    event.preventDefault()
    const photoUrl = await fileToDataUrl(form.photoFile)

    // Le backend cree un utilisateur PENDING ; aucun role n'est envoye depuis ce formulaire.
    await onSubmit({
      firstName: form.firstName,
      lastName: form.lastName,
      address: form.address,
      email: form.email,
      phone: form.phone,
      photoUrl,
    })
  }

  if (registerStep === 'identity') {
    return (
      <form
        className="auth-form clean"
        onSubmit={(event) => {
          event.preventDefault()
          onContinue()
        }}
      >
        {/* Etape 1 : informations personnelles, sans email ni role. */}
        <div className="setup-steps compact" aria-label="Progression de l'inscription">
          <span className="setup-step active">1. Identite</span>
          <span className="setup-step">2. Compte</span>
        </div>
        <div className="register-inline-grid">
          <label>
            Nom
            <input
              type="text"
              placeholder="Votre nom"
              required
              value={form.lastName}
              onChange={(event) => updateField('lastName', event.target.value)}
            />
          </label>
          <label>
            Prenom(s)
            <input
              type="text"
              placeholder="Vos prenoms"
              required
              value={form.firstName}
              onChange={(event) => updateField('firstName', event.target.value)}
            />
          </label>
        </div>
        <div className="register-inline-grid">
          <label>
            Adresse
            <input
              type="text"
              placeholder="Votre adresse"
              required
              value={form.address}
              onChange={(event) => updateField('address', event.target.value)}
            />
          </label>
          <label>
            Contact
            <input
              type="tel"
              placeholder="+225 00 00 00 00 00"
              required
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
            />
          </label>
        </div>
        <label>
          Photo
          <input
            type="file"
            accept="image/*"
            onChange={(event) => updateField('photoFile', event.target.files?.[0] ?? null)}
          />
        </label>
        <button type="submit" className="primary-button full auth-submit">
          Continuer
        </button>
      </form>
    )
  }

  return (
    <form className="auth-form clean" onSubmit={submitRegistration}>
      {/* Etape 2 : creation de la demande d'inscription dans la base. */}
      <div className="setup-steps compact" aria-label="Progression de l'inscription">
        <span className="setup-step done">1. Identite</span>
        <span className="setup-step active">2. Compte</span>
      </div>
      <label>
        Email
        <input
          type="email"
          placeholder="nom@mgroup.ci"
          required
          value={form.email}
          onChange={(event) => updateField('email', event.target.value)}
        />
      </label>
      <p className="form-note">
        L'administrateur choisira votre role parmi :{' '}
        {availableRoles.map((role) => role.label).join(', ')}.
      </p>
      <div className="setup-actions">
        <button type="button" className="secondary-button bordered" onClick={onBack}>
          Retour
        </button>
        <button type="submit" className="primary-button" disabled={isBusy}>
          {isBusy ? 'Envoi...' : "Demander l'inscription"}
        </button>
      </div>
    </form>
  )
}

function AdminSetupWizard({ onGoDashboard, onGoHome, onSetupComplete }) {
  const [setupStep, setSetupStep] = useState('company')
  const [companyData, setCompanyData] = useState(null)
  const [isSetupComplete, setIsSetupComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [setupMessage, setSetupMessage] = useState('')

  const handleCompanySubmit = (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    // On conserve les donnees entreprise pendant que le patron remplit la deuxieme etape.
    setCompanyData({
      companyName: getFormValue(formData, 'companyName'),
      legalName: getFormValue(formData, 'legalName'),
      companyAddress: getFormValue(formData, 'companyAddress'),
      companyEmail: getFormValue(formData, 'companyEmail'),
      companyPhone: getFormValue(formData, 'companyPhone'),
      companyPhotoFile: formData.get('companyPhoto'),
    })
    setSetupMessage('')
    setSetupStep('owner')
  }

  const handleOwnerSubmit = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    setIsSubmitting(true)
    setSetupMessage('')

    try {
      const companyPhotoUrl = await fileToDataUrl(companyData?.companyPhotoFile)
      const adminPhotoUrl = await fileToDataUrl(formData.get('adminPhoto'))
      const payload = {
        ...companyData,
        companyPhotoFile: undefined,
        companyPhotoUrl,
        adminFirstName: getFormValue(formData, 'adminFirstName'),
        adminLastName: getFormValue(formData, 'adminLastName'),
        adminAddress: getFormValue(formData, 'adminAddress'),
        adminEmail: getFormValue(formData, 'adminEmail'),
        adminPhone: getFormValue(formData, 'adminPhone'),
        adminPassword: getFormValue(formData, 'adminPassword'),
        adminPhotoUrl,
      }

      await api.createCompanyAdmin(payload)
      onSetupComplete(payload.adminEmail)
      setIsSetupComplete(true)
    } catch (error) {
      setSetupMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
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
                Pour acceder au dashboard, l'administrateur doit se reconnecter puis modifier son
                mot de passe avant d'entrer dans son espace.
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
                Ces donnees seront enregistrees dans PostgreSQL via l'API NestJS.
              </p>
            </div>
            {setupMessage && <p className="auth-notice error">{setupMessage}</p>}
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
                    <input name="companyName" type="text" placeholder="M Group" required />
                  </label>
                  <label>
                    Raison sociale
                    <input name="legalName" type="text" placeholder="M Group SARL" required />
                  </label>
                  <label>
                    Adresse
                    <input name="companyAddress" type="text" placeholder="Adresse du siege" required />
                  </label>
                  <label>
                    Email
                    <input name="companyEmail" type="email" placeholder="contact@mgroup.ci" required />
                  </label>
                  <label>
                    Contact
                    <input name="companyPhone" type="tel" placeholder="+225 00 00 00 00 00" required />
                  </label>
                  <label>
                    Photo ou logo
                    <input name="companyPhoto" type="file" accept="image/*" />
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
                Ce compte sera cree en statut FORCE_PASSWORD_CHANGE pour forcer un nouveau mot de
                passe avant le dashboard.
              </p>
            </div>
            {setupMessage && <p className="auth-notice error">{setupMessage}</p>}
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
                    <input name="adminLastName" type="text" placeholder="Votre nom" required />
                  </label>
                  <label>
                    Prenom(s)
                    <input name="adminFirstName" type="text" placeholder="Vos prenoms" required />
                  </label>
                  <label>
                    Adresse
                    <input name="adminAddress" type="text" placeholder="Votre adresse" required />
                  </label>
                  <label>
                    Email
                    <input name="adminEmail" type="email" placeholder="admin@mgroup.ci" required />
                  </label>
                  <label>
                    Contact
                    <input name="adminPhone" type="tel" placeholder="+225 00 00 00 00 00" required />
                  </label>
                  <label>
                    Mot de passe initial
                    <input
                      name="adminPassword"
                      type="password"
                      placeholder="Mot de passe provisoire"
                      minLength={8}
                      required
                    />
                  </label>
                  <label>
                    Photo
                    <input name="adminPhoto" type="file" accept="image/*" />
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
                <button type="submit" className="primary-button" disabled={isSubmitting}>
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  )
}

function PasswordChangePage({ isBusy, notice, onSubmit }) {
  return (
    <section className="auth-page" aria-label="Modification du mot de passe">
      <div className="auth-card password-card">
        {/* Passage obligatoire avant le premier dashboard admin. */}
        <p className="eyebrow">Securite</p>
        <h1>Modifiez votre mot de passe.</h1>
        {notice && <p className="auth-notice">{notice}</p>}
        <form className="auth-form clean" onSubmit={onSubmit}>
          <label>
            Mot de passe actuel
            <input name="currentPassword" type="password" placeholder="Mot de passe actuel" required />
          </label>
          <label>
            Nouveau mot de passe
            <input
              name="newPassword"
              type="password"
              placeholder="Nouveau mot de passe"
              minLength={10}
              required
            />
          </label>
          <label>
            Confirmer le mot de passe
            <input
              name="confirmPassword"
              type="password"
              placeholder="Confirmer"
              minLength={10}
              required
            />
          </label>
          <button type="submit" className="primary-button full auth-submit" disabled={isBusy}>
            {isBusy ? 'Validation...' : 'Valider et acceder au dashboard'}
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
          L'administrateur confirmera votre inscription, choisira votre role parmi{' '}
          {availableRoles.map((role) => role.label).join(', ')}, puis vous communiquera votre mot
          de passe de connexion.
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

function DashboardView({
  lastLoginAt,
  onCompanyUpdate,
  onGoHome,
  onProfileUpdate,
  onRequestLogout,
  user,
}) {
  const [now, setNow] = useState(() => new Date())
  const [activePanel, setActivePanel] = useState('overview')
  const [pendingUsers, setPendingUsers] = useState([])
  const [selectedRoles, setSelectedRoles] = useState({})
  const [approvalFeedback, setApprovalFeedback] = useState('')
  const [dashboardError, setDashboardError] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelUser, setCancelUser] = useState(null)
  const [reviewUser, setReviewUser] = useState(null)
  const [deliveryInfo, setDeliveryInfo] = useState(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [soundNotice, setSoundNotice] = useState('')
  const audioContextRef = useRef(null)
  const soundTimeoutRef = useRef(null)
  const didLoadPendingRef = useRef(false)
  const previousPendingCountRef = useRef(0)
  const roleKey = useMemo(() => user.roleValues.join('|'), [user.roleValues])
  const isAdmin = user.roleValues.includes('ADMIN')

  const playAdminSound = useCallback(
    (message = 'Action admin detectee') => {
      if (!soundEnabled || typeof window === 'undefined') {
        return
      }

      const AudioContext = window.AudioContext || window.webkitAudioContext

      if (!AudioContext) {
        setSoundNotice(message)
        return
      }

      // Son court genere cote navigateur pour signaler une action importante a l'Admin.
      const context = audioContextRef.current ?? new AudioContext()
      audioContextRef.current = context
      const start = context.currentTime
      const oscillator = context.createOscillator()
      const gain = context.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(740, start)
      oscillator.frequency.exponentialRampToValueAtTime(1240, start + 0.12)
      gain.gain.setValueAtTime(0.001, start)
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.34)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.36)

      setSoundNotice(message)
      window.clearTimeout(soundTimeoutRef.current)
      soundTimeoutRef.current = window.setTimeout(() => setSoundNotice(''), 4200)
    },
    [soundEnabled],
  )

  // Horloge temps reel affichee dans l'en-tete du dashboard.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  // Le dashboard admin charge les demandes PENDING depuis PostgreSQL.
  useEffect(() => {
    if (!isAdmin) {
      return undefined
    }

    let isMounted = true

    api
      .getPendingUsers()
      .then((users) => {
        if (isMounted) {
          setPendingUsers(users)
        }
      })
      .catch((error) => {
        if (isMounted) {
          setDashboardError(error.message)
        }
      })

    return () => {
      isMounted = false
    }
  }, [isAdmin, roleKey])

  // Toute variation des demandes en attente peut produire une alerte sonore Admin.
  useEffect(() => {
    if (!isAdmin) {
      return
    }

    if (!didLoadPendingRef.current) {
      didLoadPendingRef.current = true
      previousPendingCountRef.current = pendingUsers.length
      return
    }

    if (pendingUsers.length !== previousPendingCountRef.current) {
      const message =
        pendingUsers.length > previousPendingCountRef.current
          ? 'Nouvelle demande utilisateur'
          : 'Demandes utilisateurs mises a jour'

      playAdminSound(message)
      previousPendingCountRef.current = pendingUsers.length
    }
  }, [isAdmin, pendingUsers.length, playAdminSound])

  const approveUser = async (pendingUser) => {
    const role = selectedRoles[pendingUser.id] ?? 'SECRETAIRE'
    const roleLabel = availableRoles.find((item) => item.value === role)?.label ?? role
    setIsApproving(true)
    setDashboardError('')
    setApprovalFeedback('')

    try {
      const result = await api.approveUser(pendingUser.id, { role })
      setPendingUsers((current) => current.filter((item) => item.id !== pendingUser.id))
      setDeliveryInfo({
        email: pendingUser.email,
        fullName: `${pendingUser.lastName ?? ''} ${pendingUser.firstName ?? ''}`.trim(),
        password: result.temporaryPassword,
        phone: pendingUser.phone,
        role: roleLabel,
      })
      setApprovalFeedback(
        `Compte valide pour ${pendingUser.email}. Le mot de passe temporaire est pret a envoyer.`,
      )
      playAdminSound('Compte utilisateur valide')
    } catch (error) {
      setDashboardError(error.message)
    } finally {
      setIsApproving(false)
    }
  }

  const cancelPendingUser = async (pendingUser) => {
    setIsCancelling(true)
    setDashboardError('')
    setApprovalFeedback('')

    try {
      await api.disableUser(pendingUser.id)
      setPendingUsers((current) => current.filter((item) => item.id !== pendingUser.id))
      setApprovalFeedback(`Demande annulee pour ${pendingUser.email}.`)
      playAdminSound('Demande utilisateur annulee')
      setCancelUser(null)
    } catch (error) {
      setDashboardError(error.message)
    } finally {
      setIsCancelling(false)
    }
  }

  const toggleSound = () => {
    const nextValue = !soundEnabled
    setSoundEnabled(nextValue)
    setSoundNotice(nextValue ? 'Alertes sonores activees' : 'Alertes sonores desactivees')
  }

  return (
    <section className="admin-layout" aria-label="Dashboard administrateur">
      {/* Sidebar admin : navigation principale toujours visible a gauche. */}
      <aside className="admin-sidebar" aria-label="Menu administrateur">
        <div className="sidebar-logo">
          <img src="/mgroup-logo.svg" alt="Logo M Group" />
        </div>
        <div className="sidebar-project">
          <span>Le Boss</span>
          <strong>Molare</strong>
        </div>
        <nav className="sidebar-menu">
          <a
            className={activePanel === 'overview' ? 'active' : ''}
            href="#dashboard"
            onClick={() => setActivePanel('overview')}
          >
            <span>▣</span>
            Overview
          </a>
          <a
            className={activePanel === 'validation' ? 'active' : ''}
            href="#validation"
            onClick={() => setActivePanel('validation')}
          >
            <span>●</span>
            Inscriptions
          </a>
          <a
            className={activePanel === 'events' ? 'active' : ''}
            href="#events"
            onClick={() => setActivePanel('events')}
          >
            <span>◆</span>
            Evenements
          </a>
          <a
            className={activePanel === 'finance' ? 'active' : ''}
            href="#finance"
            onClick={() => setActivePanel('finance')}
          >
            <span>▥</span>
            Finances
          </a>
          <a
            className={activePanel === 'team' ? 'active' : ''}
            href="#team"
            onClick={() => setActivePanel('team')}
          >
            <span>◉</span>
            Equipe
          </a>
          <button
            type="button"
            className={activePanel === 'budget' ? 'active' : ''}
            onClick={() => setActivePanel('budget')}
          >
            <Banknote size={17} aria-hidden="true" />
            Budget
          </button>
          <button
            type="button"
            className={activePanel === 'alerts' ? 'active' : ''}
            onClick={() => setActivePanel('alerts')}
          >
            <Bell size={17} aria-hidden="true" />
            Alertes
          </button>
          <button
            type="button"
            className={activePanel === 'settings' ? 'active' : ''}
            onClick={() => setActivePanel('settings')}
          >
            <span>⚙</span>
            Parametres
          </button>
          <button type="button" onClick={onRequestLogout}>
            <span>↪</span>
            Deconnexion
          </button>
        </nav>
      </aside>

      <section className="dashboard-shell admin-main">
        <header className="dashboard-header admin-topbar">
          <a className="brand dark dashboard-brand" href="#dashboard" aria-label="Dashboard M Group">
            <span className="dashboard-logo">
              <img src="/mgroup-logo.svg" alt="" />
            </span>
            <span>Le Boss Molare</span>
          </a>
          <div className="dashboard-actions">
            <time className="time-chip" dateTime={now.toISOString()}>
              {now.toLocaleTimeString('fr-FR')}
            </time>
            <button
              type="button"
              className="secondary-button bordered icon-text-button"
              onClick={toggleSound}
            >
              {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
              Alertes
            </button>
            <button type="button" className="secondary-button bordered" onClick={onGoHome}>
              <Home size={17} aria-hidden="true" />
              Accueil du site
            </button>
            <button type="button" className="danger-button" onClick={onRequestLogout}>
              <LogOut size={17} aria-hidden="true" />
              Deconnexion
            </button>
          </div>
        </header>

        <section className="profile-welcome admin-profile-card" aria-label="Profil connecte">
          <div className="profile-avatar" aria-label={`Photo de ${user.fullName}`}>
            {user.photoUrl ? <img src={user.photoUrl} alt="" /> : <span>{user.initials}</span>}
          </div>
          <div>
            <p className="eyebrow">Bienvenue</p>
            <h2>{user.fullName}</h2>
            <span className="role-badge">{user.role}</span>
            <p className="welcome-message">Ravi de vous revoir. Votre espace de pilotage est pret.</p>
          </div>
          {lastLoginAt && (
            <p className="last-login-inline">Derniere connexion : {formatDateTime(lastLoginAt)}</p>
          )}
        </section>

        {activePanel === 'settings' ? (
          <SettingsPanel
            user={user}
            onAdminEvent={playAdminSound}
            onCompanyUpdate={onCompanyUpdate}
            onProfileUpdate={onProfileUpdate}
            onRequestLogout={onRequestLogout}
          />
        ) : activePanel === 'validation' ? (
          <ValidationPage
            dashboardError={dashboardError}
            isApproving={isApproving}
            isCancelling={isCancelling}
            onApprove={approveUser}
            onCancelRequest={setCancelUser}
            onReview={setReviewUser}
            pendingUsers={pendingUsers}
            selectedRoles={selectedRoles}
            setSelectedRoles={setSelectedRoles}
            successMessage={approvalFeedback}
          />
        ) : activePanel === 'events' ? (
          <EventsPage />
        ) : activePanel === 'finance' ? (
          <FinancePage />
        ) : activePanel === 'team' ? (
          <TeamPage pendingCount={pendingUsers.length} />
        ) : activePanel === 'budget' ? (
          <BudgetPage />
        ) : activePanel === 'alerts' ? (
          <AlertsPage
            onTestSound={() => playAdminSound('Test alerte sonore')}
            onToggleSound={toggleSound}
            soundEnabled={soundEnabled}
          />
        ) : (
          <>
        <div id="dashboard" className="dashboard-hero admin-dashboard-title">
          <p className="eyebrow">Dashboard {user.role}</p>
          <h1>Pilotage global.</h1>
          <p>
            Suivez les indicateurs, les inscriptions et les actions prioritaires de M Group depuis
            un seul espace.
          </p>
        </div>

        <div className="insight-grid" id="events">
          {/* Cartes rapides inspirees du modele fourni : lisibles et colorees. */}
          <article className="insight-card blue">
            <span className="insight-icon">✦</span>
            <strong>12</strong>
            <p>Evenements</p>
          </article>
          <article className="insight-card cyan">
            <span className="insight-icon">●</span>
            <strong>{pendingUsers.length}</strong>
            <p>Inscriptions</p>
          </article>
          <article className="insight-card yellow">
            <span className="insight-icon">▥</span>
            <strong>3</strong>
            <p>Budgets</p>
          </article>
          <article className="insight-card coral">
            <span className="insight-icon">!</span>
            <strong>4</strong>
            <p>Alertes</p>
          </article>
        </div>

        <section className="analytics-grid" aria-label="Statistiques dashboard">
          <article className="chart-panel wide">
            <div className="panel-heading">
              <strong>Activite evenementielle</strong>
              <span>+43% cette saison</span>
            </div>
            <div className="bar-chart" aria-hidden="true">
              {[36, 54, 42, 68, 48, 76, 58, 71, 63, 82, 55, 66].map((height, index) => (
                <span key={index} style={{ '--bar-height': `${height}%` }}></span>
              ))}
            </div>
          </article>
          <article className="chart-panel compact" id="finance">
            <div className="panel-heading">
              <strong>Repartition</strong>
              <span>Operations</span>
            </div>
            <div className="donut-chart" aria-hidden="true"></div>
            <ul className="chart-legend">
              <li>Production</li>
              <li>Finance</li>
              <li>RH</li>
            </ul>
          </article>
        </section>

        <DashboardInsightBoard pendingCount={pendingUsers.length} onOpenPanel={setActivePanel} />

        {isAdmin && (
          <section id="validation" className="approval-panel" aria-label="Demandes d'inscription">
            <div>
              <p className="eyebrow">Validation admin</p>
              <h2>Attribuer un role avant activation.</h2>
            </div>

            {dashboardError && <p className="auth-notice error">{dashboardError}</p>}
            {approvalFeedback && <p className="auth-notice success">{approvalFeedback}</p>}

            {pendingUsers.length === 0 ? (
              <p className="approval-empty">Aucune demande d'inscription en attente.</p>
            ) : (
              pendingUsers.map((pendingUser) => (
                <div className="approval-row" key={pendingUser.id}>
                  <div>
                    <strong>{`${pendingUser.lastName} ${pendingUser.firstName}`}</strong>
                    <span>{pendingUser.email}</span>
                  </div>
                  <select
                    aria-label="Role a attribuer"
                    value={selectedRoles[pendingUser.id] ?? 'SECRETAIRE'}
                    onChange={(event) =>
                      setSelectedRoles((current) => ({
                        ...current,
                        [pendingUser.id]: event.target.value,
                      }))
                    }
                  >
                    {availableRoles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  <div className="approval-actions">
                    <button
                      type="button"
                      className="secondary-button bordered"
                      onClick={() => setReviewUser(pendingUser)}
                    >
                      Voir
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={isApproving}
                      onClick={() => approveUser(pendingUser)}
                    >
                      Confirmer
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={isCancelling}
                      onClick={() => setCancelUser(pendingUser)}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        )}
          </>
        )}
      </section>

      {reviewUser && (
        <RegistrationReviewModal user={reviewUser} onClose={() => setReviewUser(null)} />
      )}

      {cancelUser && (
        <CancelUserModal
          isBusy={isCancelling}
          onCancel={() => setCancelUser(null)}
          onConfirm={() => cancelPendingUser(cancelUser)}
          user={cancelUser}
        />
      )}

      {deliveryInfo && (
        <PasswordDeliveryPanel info={deliveryInfo} onClose={() => setDeliveryInfo(null)} />
      )}

      {soundNotice && (
        <div className="sound-toast" role="status">
          <Bell size={18} aria-hidden="true" />
          <span>{soundNotice}</span>
        </div>
      )}
    </section>
  )
}

function DashboardInsightBoard({ onOpenPanel, pendingCount }) {
  return (
    <section className="dashboard-insights" aria-label="Synthese globale">
      <article className="visual-panel finance-summary">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Budget FCFA</p>
            <strong>{formatFcfa(18500000)}</strong>
          </div>
          <Wallet size={26} aria-hidden="true" />
        </div>
        <div className="stacked-budget" aria-hidden="true">
          {financeRows.map((item) => (
            <span key={item.label} style={{ '--segment': `${item.percent}%` }}></span>
          ))}
        </div>
        <ul className="compact-list">
          {financeRows.slice(0, 3).map((item) => (
            <li key={item.label}>
              <span>{item.label}</span>
              <strong>{formatFcfa(item.value)}</strong>
            </li>
          ))}
        </ul>
      </article>

      <article className="visual-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Operations</p>
            <strong>Vue instantanee</strong>
          </div>
          <Activity size={26} aria-hidden="true" />
        </div>
        <div className="ops-grid">
          <button type="button" onClick={() => onOpenPanel('validation')}>
            <UserPlus size={20} />
            <strong>{pendingCount}</strong>
            <span>inscriptions</span>
          </button>
          <button type="button" onClick={() => onOpenPanel('events')}>
            <CalendarDays size={20} />
            <strong>{eventRows.length}</strong>
            <span>evenements</span>
          </button>
          <button type="button" onClick={() => onOpenPanel('alerts')}>
            <Bell size={20} />
            <strong>{alertRows.length}</strong>
            <span>alertes</span>
          </button>
        </div>
      </article>
    </section>
  )
}

function ValidationPage({
  dashboardError,
  isApproving,
  isCancelling,
  onApprove,
  onCancelRequest,
  onReview,
  pendingUsers,
  selectedRoles,
  setSelectedRoles,
  successMessage,
}) {
  return (
    <section className="module-page" aria-label="Page inscriptions">
      <ModuleHeader
        description="Controlez les demandes, verifiez les informations, choisissez un role et communiquez le mot de passe temporaire."
        icon={ClipboardCheck}
        label="Validation admin"
        title="Inscriptions."
      />

      <section id="validation" className="approval-panel" aria-label="Demandes d'inscription">
        <div>
          <p className="eyebrow">Activation des comptes</p>
          <h2>Attribuer un role avant activation.</h2>
        </div>

        {dashboardError && <p className="auth-notice error">{dashboardError}</p>}
        {successMessage && <p className="auth-notice success">{successMessage}</p>}

        {pendingUsers.length === 0 ? (
          <p className="approval-empty">Aucune demande d'inscription en attente.</p>
        ) : (
          pendingUsers.map((pendingUser) => (
            <div className="approval-row" key={pendingUser.id}>
              <div>
                <strong>{`${pendingUser.lastName} ${pendingUser.firstName}`}</strong>
                <span>{pendingUser.email}</span>
              </div>
              <select
                aria-label="Role a attribuer"
                value={selectedRoles[pendingUser.id] ?? 'SECRETAIRE'}
                onChange={(event) =>
                  setSelectedRoles((current) => ({
                    ...current,
                    [pendingUser.id]: event.target.value,
                  }))
                }
              >
                {availableRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <div className="approval-actions">
                <button
                  type="button"
                  className="secondary-button bordered"
                  onClick={() => onReview(pendingUser)}
                >
                  <Eye size={16} />
                  Voir
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={isApproving}
                  onClick={() => onApprove(pendingUser)}
                >
                  <CheckCircle2 size={16} />
                  Confirmer
                </button>
                <button
                  type="button"
                  className="danger-button"
                  disabled={isCancelling}
                  onClick={() => onCancelRequest(pendingUser)}
                >
                  <XCircle size={16} />
                  Annuler
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </section>
  )
}

function ModuleHeader({ description, icon: Icon, label, title }) {
  return (
    <div className="module-header">
      <div className="module-icon">
        <Icon size={28} aria-hidden="true" />
      </div>
      <div>
        <p className="eyebrow">{label}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  )
}

function EventsPage() {
  return (
    <section className="module-page">
      <ModuleHeader
        description="Planifiez les prestations, suivez les statuts et gardez une lecture rapide des budgets par evenement."
        icon={CalendarDays}
        label="Evenementiel"
        title="Evenements."
      />
      <div className="module-grid">
        {eventRows.map((event) => (
          <article className="module-card" key={event.title}>
            <span className="card-icon"><CalendarDays size={20} /></span>
            <h3>{event.title}</h3>
            <p>{event.date}</p>
            <strong>{formatFcfa(event.budget)}</strong>
            <small>{event.status}</small>
          </article>
        ))}
      </div>
    </section>
  )
}

function FinancePage() {
  return (
    <section className="module-page">
      <ModuleHeader
        description="Suivez les revenus, les depenses et les validations financieres avec une lecture directe en FCFA."
        icon={Wallet}
        label="Controle financier"
        title="Finance."
      />
      <section className="analytics-grid">
        <article className="chart-panel wide">
          <div className="panel-heading">
            <strong>Depenses par poste</strong>
            <span>Total {formatFcfa(21300000)}</span>
          </div>
          <div className="horizontal-bars">
            {financeRows.map((row) => (
              <div key={row.label}>
                <span>{row.label}</span>
                <strong>{formatFcfa(row.value)}</strong>
                <i style={{ '--bar-width': `${row.percent}%` }}></i>
              </div>
            ))}
          </div>
        </article>
        <article className="chart-panel compact">
          <div className="panel-heading">
            <strong>Repartition</strong>
            <span>Budget</span>
          </div>
          <div className="donut-chart budget" aria-hidden="true"></div>
          <ul className="chart-legend">
            <li>Production</li>
            <li>Technique</li>
            <li>Communication</li>
          </ul>
        </article>
      </section>
    </section>
  )
}

function TeamPage({ pendingCount }) {
  return (
    <section className="module-page">
      <ModuleHeader
        description="Controlez la charge des equipes, les roles et les validations RH."
        icon={Users}
        label="Equipe"
        title="Equipe."
      />
      <div className="module-grid">
        {teamRows.map((team) => (
          <article className="module-card" key={team.role}>
            <span className="card-icon"><Users size={20} /></span>
            <h3>{team.role}</h3>
            <p>{team.members} membre(s)</p>
            <div className="progress-line"><span style={{ '--progress': `${team.load}%` }}></span></div>
            <small>Charge {team.load}%</small>
          </article>
        ))}
        <article className="module-card highlight">
          <span className="card-icon"><UserPlus size={20} /></span>
          <h3>Demandes a traiter</h3>
          <strong>{pendingCount}</strong>
          <p>inscription(s) en attente</p>
        </article>
      </div>
    </section>
  )
}

function BudgetPage() {
  return (
    <section className="module-page">
      <ModuleHeader
        description="Visualisez les enveloppes, les engagements et les budgets a valider."
        icon={Banknote}
        label="Budget"
        title="Budget."
      />
      <div className="budget-grid">
        <article className="visual-panel">
          <p className="eyebrow">Enveloppe annuelle</p>
          <strong className="big-money">{formatFcfa(120000000)}</strong>
          <div className="budget-meter"><span style={{ '--progress': '64%' }}></span></div>
          <p>64% consommes sur les operations confirmees.</p>
        </article>
        <article className="visual-panel">
          <p className="eyebrow">A valider</p>
          <strong className="big-money">{formatFcfa(7400000)}</strong>
          <ul className="compact-list">
            <li><span>Technique</span><strong>{formatFcfa(3200000)}</strong></li>
            <li><span>Communication</span><strong>{formatFcfa(2100000)}</strong></li>
            <li><span>Logistique</span><strong>{formatFcfa(2100000)}</strong></li>
          </ul>
        </article>
      </div>
    </section>
  )
}

function AlertsPage({ onTestSound, onToggleSound, soundEnabled }) {
  return (
    <section className="module-page">
      <ModuleHeader
        description="Centralisez les alertes importantes et testez la notification sonore du dashboard Admin."
        icon={Bell}
        label="Alertes"
        title="Alertes."
      />
      <div className="alert-toolbar">
        <button type="button" className="secondary-button bordered" onClick={onToggleSound}>
          {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          {soundEnabled ? 'Desactiver le son' : 'Activer le son'}
        </button>
        <button type="button" className="primary-button" onClick={onTestSound}>
          <Bell size={17} />
          Tester l'alerte
        </button>
      </div>
      <div className="alert-list">
        {alertRows.map((alert) => (
          <article className="alert-card" key={alert.title}>
            <AlertTriangle size={22} aria-hidden="true" />
            <div>
              <strong>{alert.title}</strong>
              <span>{alert.time}</span>
            </div>
            <em>{alert.level}</em>
          </article>
        ))}
      </div>
    </section>
  )
}

function PasswordDeliveryPanel({ info, onClose }) {
  const [copyNotice, setCopyNotice] = useState('')
  const message = buildTemporaryPasswordMessage(info)
  const phone = normalizePhone(info.phone)
  const whatsappUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : ''
  const smsUrl = phone ? `sms:${phone}?&body=${encodeURIComponent(message)}` : ''
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    info.email,
  )}&su=${encodeURIComponent('Votre acces M Group')}&body=${encodeURIComponent(message)}`

  const copyMessage = async () => {
    await navigator.clipboard.writeText(message)
    setCopyNotice('Message copie.')
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-panel delivery-panel" aria-label="Envoi du mot de passe">
        <button type="button" className="close-button" aria-label="Fermer" onClick={onClose}>
          x
        </button>
        <div className="setup-heading success">
          <p className="eyebrow">Compte valide</p>
          <h2>Envoyer le mot de passe temporaire.</h2>
          <p>{info.email}</p>
        </div>
        <div className="temporary-password-box">
          <span>Mot de passe temporaire</span>
          <strong>{info.password}</strong>
        </div>
        <div className="delivery-actions">
          <a className={`secondary-button bordered ${phone ? '' : 'disabled'}`} href={whatsappUrl} target="_blank" rel="noreferrer">
            <MessageCircle size={17} />
            WhatsApp
          </a>
          <a className={`secondary-button bordered ${phone ? '' : 'disabled'}`} href={smsUrl}>
            <Smartphone size={17} />
            SMS
          </a>
          <a className="secondary-button bordered" href={gmailUrl} target="_blank" rel="noreferrer">
            <Mail size={17} />
            Gmail
          </a>
          <button type="button" className="primary-button" onClick={copyMessage}>
            <Copy size={17} />
            Copier
          </button>
        </div>
        {copyNotice && <p className="auth-notice success">{copyNotice}</p>}
        {!phone && <p className="form-note">Aucun contact valide : WhatsApp et SMS sont indisponibles.</p>}
      </section>
    </div>
  )
}

function CancelUserModal({ isBusy, onCancel, onConfirm, user }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-panel" aria-label="Confirmation annulation">
        {/* Confirmation propre pour remplacer window.confirm et garder une UX coherente. */}
        <div className="setup-heading success">
          <p className="eyebrow">Annulation inscription</p>
          <h2>Annuler cette demande ?</h2>
          <p>
            Le compte de {user.email} sera refuse et ne pourra pas se connecter sans nouvelle
            intervention admin.
          </p>
        </div>
        <div className="choice-actions">
          <button type="button" className="secondary-button bordered large" onClick={onCancel}>
            Retour
          </button>
          <button type="button" className="danger-button large" disabled={isBusy} onClick={onConfirm}>
            {isBusy ? 'Annulation...' : 'Confirmer annulation'}
          </button>
        </div>
      </section>
    </div>
  )
}

function RegistrationReviewModal({ onClose, user }) {
  const checklist = getRegistrationChecklist(user)
  const completedCount = checklist.filter((item) => String(item.value ?? '').trim()).length
  const isComplete = completedCount === checklist.length

  const displayValue = (item) => {
    if (!item.value) {
      return 'Manquant'
    }

    if (item.label === 'Photo') {
      return 'Photo ajoutee'
    }

    return item.value
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-panel review-panel" aria-label="Verification inscription">
        {/* Revue rapide avant validation : l'Admin voit les donnees remplies et manquantes. */}
        <button type="button" className="close-button" aria-label="Fermer" onClick={onClose}>
          x
        </button>
        <div className="review-heading">
          <div className="review-avatar">
            {user.photoUrl ? <img src={user.photoUrl} alt="" /> : <span>?</span>}
          </div>
          <div>
            <p className="eyebrow">Verification inscription</p>
            <h2>{`${user.lastName ?? ''} ${user.firstName ?? ''}`.trim() || user.email}</h2>
            <span className={`review-status ${isComplete ? 'success' : 'warning'}`}>
              {completedCount}/{checklist.length} informations remplies
            </span>
          </div>
        </div>

        <ul className="review-list">
          {checklist.map((item) => {
            const hasValue = Boolean(String(item.value ?? '').trim())

            return (
              <li key={item.label} className={hasValue ? 'complete' : 'missing'}>
                <span>{item.label}</span>
                <strong>{displayValue(item)}</strong>
              </li>
            )
          })}
        </ul>

        <div className="settings-actions">
          <button type="button" className="primary-button" onClick={onClose}>
            Fermer
          </button>
        </div>
      </section>
    </div>
  )
}

function SettingsPanel({ onAdminEvent, onCompanyUpdate, onProfileUpdate, onRequestLogout, user }) {
  const [activeTab, setActiveTab] = useState('profile')
  const [notice, setNotice] = useState({ type: '', text: '' })
  const [savingTarget, setSavingTarget] = useState('')
  const [previewUrl, setPreviewUrl] = useState(user.photoUrl ?? '')
  const [company, setCompany] = useState(null)
  const [companyError, setCompanyError] = useState('')
  const [companyPreviewUrl, setCompanyPreviewUrl] = useState('')
  const [sessions, setSessions] = useState([])
  const [loginHistory, setLoginHistory] = useState([])
  const [isSecurityLoading, setIsSecurityLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [activityLog, setActivityLog] = useState([])
  const [selectedUserHistory, setSelectedUserHistory] = useState([])
  const [selectedHistoryUser, setSelectedHistoryUser] = useState(null)
  const [userPasswordDeliveryInfo, setUserPasswordDeliveryInfo] = useState(null)
  const [adminSettings, setAdminSettings] = useState(() => readAdminSettings())
  const [isAdminDataLoading, setIsAdminDataLoading] = useState(false)
  const isAdmin = user.roleValues.includes('ADMIN')

  useEffect(() => {
    if (activeTab !== 'security') {
      return undefined
    }

    let isMounted = true

    // Les sessions et l'historique sont charges uniquement quand l'onglet Securite est ouvert.
    Promise.all([api.getSessions(), api.getLoginHistory()])
      .then(([nextSessions, nextHistory]) => {
        if (isMounted) {
          setSessions(nextSessions)
          setLoginHistory(nextHistory)
        }
      })
      .catch((error) => {
        if (isMounted) {
          setNotice({ type: 'error', text: error.message })
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsSecurityLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'company' || !isAdmin || company) {
      return undefined
    }

    let isMounted = true

    // Les informations entreprise sont reservees a l'Admin et viennent de PostgreSQL.
    api
      .getCompany()
      .then((nextCompany) => {
        if (isMounted) {
          setCompany(nextCompany)
          setCompanyError('')
          setCompanyPreviewUrl(nextCompany.photoUrl ?? '')
          setNotice({ type: '', text: '' })
        }
      })
      .catch((error) => {
        if (isMounted) {
          setCompanyError(error.message)
          setNotice({ type: 'error', text: error.message })
        }
      })

    return () => {
      isMounted = false
    }
  }, [activeTab, company, isAdmin])

  useEffect(() => {
    if (!isAdmin || !['users', 'activity'].includes(activeTab)) {
      return undefined
    }

    let isMounted = true

    const loader = activeTab === 'users' ? api.getUsers() : api.getActivityLog()

    loader
      .then((result) => {
        if (!isMounted) {
          return
        }

        if (activeTab === 'users') {
          setUsers(result)
        } else {
          setActivityLog(result)
        }
      })
      .catch((error) => {
        if (isMounted) {
          setNotice({ type: 'error', text: error.message })
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsAdminDataLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [activeTab, isAdmin])

  const showNotice = (type, text) => {
    setNotice({ type, text })
  }

  const selectSettingsTab = (tab) => {
    if (tab === activeTab) {
      return
    }

    setActiveTab(tab)
    showNotice('', '')

    if (tab === 'security') {
      setIsSecurityLoading(true)
    }

    if (tab === 'company') {
      setCompanyError('')
    }

    if (tab === 'users' || tab === 'activity') {
      setIsAdminDataLoading(true)
    }
  }

  const persistAdminSettings = (nextSettings, message) => {
    setAdminSettings(nextSettings)
    writeAdminSettings(nextSettings)
    showNotice('success', message)
    onAdminEvent?.(message)
  }

  const updateDisplayPreference = (field, value) => {
    persistAdminSettings(
      {
        ...adminSettings,
        display: {
          ...adminSettings.display,
          [field]: value,
        },
      },
      'Preferences d affichage mises a jour',
    )
  }

  const toggleDisplayWidget = (widget) => {
    persistAdminSettings(
      {
        ...adminSettings,
        display: {
          ...adminSettings.display,
          widgets: {
            ...adminSettings.display.widgets,
            [widget]: !adminSettings.display.widgets[widget],
          },
        },
      },
      'Widgets du dashboard mis a jour',
    )
  }

  const toggleNotificationPreference = (field) => {
    persistAdminSettings(
      {
        ...adminSettings,
        notifications: {
          ...adminSettings.notifications,
          [field]: !adminSettings.notifications[field],
        },
      },
      'Notifications mises a jour',
    )
  }

  const updateReminderFrequency = (value) => {
    persistAdminSettings(
      {
        ...adminSettings,
        notifications: {
          ...adminSettings.notifications,
          reminderFrequency: value,
        },
      },
      'Frequence des rappels mise a jour',
    )
  }

  const toggleModule = (moduleKey) => {
    persistAdminSettings(
      {
        ...adminSettings,
        modules: {
          ...adminSettings.modules,
          [moduleKey]: !adminSettings.modules[moduleKey],
        },
      },
      'Modules actives mis a jour',
    )
  }

  const refreshUsers = async () => {
    setIsAdminDataLoading(true)

    try {
      setUsers(await api.getUsers())
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setIsAdminDataLoading(false)
    }
  }

  const refreshActivity = async () => {
    setIsAdminDataLoading(true)

    try {
      setActivityLog(await api.getActivityLog())
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setIsAdminDataLoading(false)
    }
  }

  const updateManagedUser = (updatedUser) => {
    setUsers((current) => current.map((item) => (item.id === updatedUser.id ? updatedUser : item)))
  }

  const changeManagedUserRole = async (managedUser, role) => {
    setSavingTarget(`role-${managedUser.id}`)
    showNotice('', '')

    try {
      const updatedUser = await api.updateUserRole(managedUser.id, { role })
      updateManagedUser(updatedUser)
      showNotice('success', `Role modifie pour ${managedUser.email}.`)
      onAdminEvent?.('Role utilisateur modifie')
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setSavingTarget('')
    }
  }

  const toggleManagedUserStatus = async (managedUser) => {
    setSavingTarget(`status-${managedUser.id}`)
    showNotice('', '')

    try {
      const updatedUser =
        managedUser.status === 'DISABLED'
          ? await api.reactivateUser(managedUser.id)
          : await api.disableUser(managedUser.id)

      updateManagedUser(updatedUser)
      showNotice('success', `Statut mis a jour pour ${managedUser.email}.`)
      onAdminEvent?.('Statut utilisateur modifie')
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setSavingTarget('')
    }
  }

  const resetManagedUserPassword = async (managedUser) => {
    setSavingTarget(`reset-${managedUser.id}`)
    showNotice('', '')

    try {
      const result = await api.resetUserPassword(managedUser.id)
      updateManagedUser(result.user)
      setUserPasswordDeliveryInfo({
        email: result.user.email,
        fullName: `${result.user.lastName ?? ''} ${result.user.firstName ?? ''}`.trim(),
        password: result.temporaryPassword,
        phone: result.user.phone,
        role: result.user.roles?.[0]?.label ?? 'Utilisateur',
      })
      showNotice('success', `Mot de passe temporaire genere pour ${managedUser.email}.`)
      onAdminEvent?.('Mot de passe utilisateur reinitialise')
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setSavingTarget('')
    }
  }

  const viewManagedUserHistory = async (managedUser) => {
    setSavingTarget(`history-${managedUser.id}`)
    showNotice('', '')

    try {
      setSelectedHistoryUser(managedUser)
      setSelectedUserHistory(await api.getUserHistory(managedUser.id))
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setSavingTarget('')
    }
  }

  const retryCompanyLoad = async () => {
    setCompanyError('')
    showNotice('', '')

    try {
      const nextCompany = await api.getCompany()
      setCompany(nextCompany)
      setCompanyPreviewUrl(nextCompany.photoUrl ?? '')
    } catch (error) {
      setCompanyError(error.message)
      showNotice('error', error.message)
    }
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = getFormValue(formData, 'email')
    const confirmEmail = getFormValue(formData, 'confirmEmail')

    if (email !== confirmEmail) {
      showNotice('error', 'La confirmation email ne correspond pas.')
      return
    }

    setSavingTarget('profile')
    showNotice('', '')

    try {
      const photoUrl = await fileToDataUrl(formData.get('photo'))
      const updated = await onProfileUpdate({
        firstName: getFormValue(formData, 'firstName'),
        lastName: getFormValue(formData, 'lastName'),
        address: getFormValue(formData, 'address'),
        email,
        phone: getFormValue(formData, 'phone'),
        photoUrl: photoUrl || user.photoUrl,
      })

      setPreviewUrl(updated.photoUrl ?? '')
      showNotice('success', 'Profil mis a jour avec succes.')
      onAdminEvent?.('Profil admin mis a jour')
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setSavingTarget('')
    }
  }

  const savePassword = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const newPassword = getFormValue(formData, 'newPassword')
    const confirmPassword = getFormValue(formData, 'confirmPassword')

    if (newPassword !== confirmPassword) {
      showNotice('error', 'Les deux nouveaux mots de passe ne correspondent pas.')
      return
    }

    setSavingTarget('password')
    showNotice('', '')

    try {
      await api.changePassword({
        currentPassword: getFormValue(formData, 'currentPassword'),
        newPassword,
      })
      event.currentTarget.reset()
      showNotice('success', 'Mot de passe modifie avec succes.')
      onAdminEvent?.('Mot de passe modifie')
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setSavingTarget('')
    }
  }

  const revokeAllSessions = async () => {
    if (!window.confirm('Revoquer toutes les sessions actives de ce compte ?')) {
      return
    }

    setSavingTarget('sessions')
    showNotice('', '')

    try {
      const result = await api.logoutAllDevices()
      const nextSessions = await api.getSessions()
      setSessions(nextSessions)
      showNotice('success', `${result.revokedSessions} session(s) revoquee(s).`)
      onAdminEvent?.('Sessions revoquees')
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setSavingTarget('')
    }
  }

  const saveCompany = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    setSavingTarget('company')
    showNotice('', '')

    try {
      const photoUrl = await fileToDataUrl(formData.get('photo'))
      const updatedCompany = await onCompanyUpdate({
        name: getFormValue(formData, 'name'),
        legalName: getFormValue(formData, 'legalName'),
        address: getFormValue(formData, 'address'),
        email: getFormValue(formData, 'email'),
        phone: getFormValue(formData, 'phone'),
        photoUrl: photoUrl || company?.photoUrl,
        taxInfo: getFormValue(formData, 'taxInfo'),
        documentFooter: getFormValue(formData, 'documentFooter'),
      })

      setCompany(updatedCompany)
      setCompanyPreviewUrl(updatedCompany.photoUrl ?? '')
      showNotice('success', 'Parametres entreprise mis a jour.')
      onAdminEvent?.('Entreprise mise a jour')
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setSavingTarget('')
    }
  }

  return (
    <section className="settings-panel" aria-label="Parametres du compte">
      {/* En-tete commun des parametres Admin : un onglet controle chaque famille de reglage. */}
      <div className="dashboard-hero admin-dashboard-title">
        <p className="eyebrow">Parametres Admin</p>
        <h1>Compte, securite et entreprise.</h1>
        <p>
          Mettez a jour vos informations, controlez les sessions actives et gardez les donnees
          administratives de M Group a jour.
        </p>
      </div>

      <div className="settings-tabs" role="tablist" aria-label="Categories de parametres">
        <button
          type="button"
          className={activeTab === 'profile' ? 'active' : ''}
          onClick={() => selectSettingsTab('profile')}
        >
          Profil utilisateur
        </button>
        <button
          type="button"
          className={activeTab === 'security' ? 'active' : ''}
          onClick={() => selectSettingsTab('security')}
        >
          Securite du compte
        </button>
        {isAdmin && (
          <button
            type="button"
            className={activeTab === 'company' ? 'active' : ''}
            onClick={() => selectSettingsTab('company')}
          >
            Parametres entreprise
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => selectSettingsTab('users')}
          >
            Utilisateurs
          </button>
        )}
        <button
          type="button"
          className={activeTab === 'display' ? 'active' : ''}
          onClick={() => selectSettingsTab('display')}
        >
          Affichage
        </button>
        <button
          type="button"
          className={activeTab === 'notifications' ? 'active' : ''}
          onClick={() => selectSettingsTab('notifications')}
        >
          Notifications
        </button>
        {isAdmin && (
          <button
            type="button"
            className={activeTab === 'modules' ? 'active' : ''}
            onClick={() => selectSettingsTab('modules')}
          >
            Modules
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            className={activeTab === 'activity' ? 'active' : ''}
            onClick={() => selectSettingsTab('activity')}
          >
            Journal
          </button>
        )}
      </div>

      {notice.text && <p className={`auth-notice ${notice.type}`}>{notice.text}</p>}

      {activeTab === 'profile' && (
        <form className="settings-card" onSubmit={saveProfile}>
          {/* Profil personnel : l'email doit etre confirme avant d'etre envoye au backend. */}
          <div className="settings-profile-row">
            <div className="settings-avatar">
              {previewUrl ? <img src={previewUrl} alt="" /> : <span>{user.initials}</span>}
            </div>
            <label className="settings-photo-field">
              Photo de profil
              <input
                name="photo"
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const nextPreview = await fileToDataUrl(event.target.files?.[0])
                  if (nextPreview) {
                    setPreviewUrl(nextPreview)
                  }
                }}
              />
            </label>
          </div>

          <div className="settings-meta-grid">
            <article>
              <span>Role actuel</span>
              <strong>{user.role}</strong>
            </article>
            <article>
              <span>Derniere connexion</span>
              <strong>
                {user.lastLoginAt ? formatDateTime(new Date(user.lastLoginAt)) : 'Non disponible'}
              </strong>
            </article>
          </div>

          <div className="form-grid">
            <label>
              Nom
              <input name="lastName" type="text" defaultValue={user.lastName ?? ''} required />
            </label>
            <label>
              Prenom(s)
              <input name="firstName" type="text" defaultValue={user.firstName ?? ''} required />
            </label>
            <label>
              Adresse
              <input name="address" type="text" defaultValue={user.address ?? ''} />
            </label>
            <label>
              Contact
              <input name="phone" type="tel" defaultValue={user.phone ?? ''} />
            </label>
            <label>
              Email
              <input name="email" type="email" defaultValue={user.email ?? ''} required />
            </label>
            <label>
              Confirmer l'email
              <input name="confirmEmail" type="email" defaultValue={user.email ?? ''} required />
            </label>
          </div>

          <div className="settings-actions">
            <button type="submit" className="primary-button" disabled={savingTarget === 'profile'}>
              {savingTarget === 'profile' ? 'Enregistrement...' : 'Enregistrer le profil'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'security' && (
        <div className="settings-card">
          {/* Securite : les actions critiques restent separees des champs de profil. */}
          <form className="settings-section" onSubmit={savePassword}>
            <div>
              <p className="eyebrow">Mot de passe</p>
              <h2>Changer le mot de passe.</h2>
            </div>
            <div className="form-grid">
              <label>
                Mot de passe actuel
                <input name="currentPassword" type="password" minLength="8" required />
              </label>
              <label>
                Nouveau mot de passe
                <input name="newPassword" type="password" minLength="10" required />
              </label>
              <label>
                Confirmer le nouveau mot de passe
                <input name="confirmPassword" type="password" minLength="10" required />
              </label>
            </div>
            <div className="settings-actions">
              <button type="submit" className="primary-button" disabled={savingTarget === 'password'}>
                {savingTarget === 'password' ? 'Modification...' : 'Modifier le mot de passe'}
              </button>
            </div>
          </form>

          <div className="settings-section-grid">
            <article className="settings-muted-panel">
              <p className="eyebrow">Sessions actives</p>
              <h3>Gestion des appareils.</h3>
              <p>
                Revoquez les sessions ouvertes sur les autres navigateurs si vous suspectez un
                acces non autorise.
              </p>
              <div className="settings-actions left">
                <button type="button" className="secondary-button bordered" onClick={onRequestLogout}>
                  Deconnecter cette session
                </button>
                <button
                  type="button"
                  className="danger-button"
                  disabled={savingTarget === 'sessions'}
                  onClick={revokeAllSessions}
                >
                  {savingTarget === 'sessions' ? 'Revocation...' : 'Tout deconnecter'}
                </button>
              </div>
            </article>

            <article className="settings-muted-panel">
              <p className="eyebrow">Protection avancee</p>
              <h3>Authentification a deux facteurs.</h3>
              <p>
                Le branchement 2FA sera active plus tard avec un vrai fournisseur OTP ou email.
              </p>
              <label className="settings-toggle disabled">
                <input type="checkbox" disabled />
                Activer la 2FA plus tard
              </label>
              <label className="settings-toggle disabled">
                <input type="checkbox" checked disabled readOnly />
                Notifier les connexions suspectes
              </label>
            </article>
          </div>

          <div className="settings-section-grid">
            <article className="settings-muted-panel">
              <p className="eyebrow">Sessions recentes</p>
              <h3>Etat des tokens.</h3>
              {isSecurityLoading ? (
                <p>Chargement des sessions...</p>
              ) : (
                <ul className="settings-list">
                  {sessions.map((session) => (
                    <li key={session.id}>
                      <span>{formatDateTime(new Date(session.createdAt))}</span>
                      <strong>{session.isActive ? 'Active' : 'Expiree ou fermee'}</strong>
                    </li>
                  ))}
                  {sessions.length === 0 && <li>Aucune session recente.</li>}
                </ul>
              )}
            </article>

            <article className="settings-muted-panel">
              <p className="eyebrow">Historique</p>
              <h3>Dernieres actions securite.</h3>
              {isSecurityLoading ? (
                <p>Chargement de l'historique...</p>
              ) : (
                <ul className="settings-list">
                  {loginHistory.map((event) => (
                    <li key={event.id}>
                      <span>{formatDateTime(new Date(event.createdAt))}</span>
                      <strong>{auditActionLabel(event.action)}</strong>
                    </li>
                  ))}
                  {loginHistory.length === 0 && <li>Aucun historique disponible.</li>}
                </ul>
              )}
            </article>
          </div>
        </div>
      )}

      {activeTab === 'company' && isAdmin && (
        <form className="settings-card" key={company?.id ?? 'company-loading'} onSubmit={saveCompany}>
          {/* Parametres entreprise : cette zone est visible uniquement pour le role Admin. */}
          {!company ? (
            <div className="approval-empty">
              <p>
                {companyError
                  ? "Impossible de charger les informations entreprise."
                  : 'Chargement des informations entreprise...'}
              </p>
              {companyError && (
                <button type="button" className="secondary-button bordered" onClick={retryCompanyLoad}>
                  Reessayer
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="settings-profile-row">
                <div className="company-logo-preview">
                  {companyPreviewUrl ? <img src={companyPreviewUrl} alt="" /> : <span>MG</span>}
                </div>
                <label className="settings-photo-field">
                  Logo de l'entreprise
                  <input
                    name="photo"
                    type="file"
                    accept="image/*"
                    onChange={async (event) => {
                      const nextPreview = await fileToDataUrl(event.target.files?.[0])
                      if (nextPreview) {
                        setCompanyPreviewUrl(nextPreview)
                      }
                    }}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Nom de l'entreprise
                  <input name="name" type="text" defaultValue={company.name ?? ''} required />
                </label>
                <label>
                  Raison sociale
                  <input name="legalName" type="text" defaultValue={company.legalName ?? ''} required />
                </label>
                <label>
                  Adresse
                  <input name="address" type="text" defaultValue={company.address ?? ''} required />
                </label>
                <label>
                  Contacts
                  <input name="phone" type="tel" defaultValue={company.phone ?? ''} required />
                </label>
                <label>
                  Email officiel
                  <input name="email" type="email" defaultValue={company.email ?? ''} required />
                </label>
                <label>
                  Informations fiscales ou administratives
                  <input name="taxInfo" type="text" defaultValue={company.taxInfo ?? ''} />
                </label>
                <label className="wide-field">
                  Signature/footer pour documents
                  <input
                    name="documentFooter"
                    type="text"
                    defaultValue={company.documentFooter ?? ''}
                    placeholder="Ex: M Group - Direction generale - Abidjan"
                  />
                </label>
              </div>

              <div className="settings-actions">
                <button type="submit" className="primary-button" disabled={savingTarget === 'company'}>
                  {savingTarget === 'company' ? 'Enregistrement...' : "Enregistrer l'entreprise"}
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {activeTab === 'users' && isAdmin && (
        <AdminUsersSettings
          isLoading={isAdminDataLoading}
          onChangeRole={changeManagedUserRole}
          onRefresh={refreshUsers}
          onResetPassword={resetManagedUserPassword}
          onToggleStatus={toggleManagedUserStatus}
          onViewHistory={viewManagedUserHistory}
          savingTarget={savingTarget}
          selectedHistoryUser={selectedHistoryUser}
          userHistory={selectedUserHistory}
          users={users}
        />
      )}

      {activeTab === 'display' && (
        <DisplayPreferencesSettings
          preferences={adminSettings.display}
          onChange={updateDisplayPreference}
          onToggleWidget={toggleDisplayWidget}
        />
      )}

      {activeTab === 'notifications' && (
        <NotificationSettings
          notifications={adminSettings.notifications}
          onChangeFrequency={updateReminderFrequency}
          onToggle={toggleNotificationPreference}
        />
      )}

      {activeTab === 'modules' && isAdmin && (
        <ModuleSettings modules={adminSettings.modules} onToggle={toggleModule} />
      )}

      {activeTab === 'activity' && isAdmin && (
        <ActivityLogSettings
          activityLog={activityLog}
          isLoading={isAdminDataLoading}
          onRefresh={refreshActivity}
        />
      )}

      {userPasswordDeliveryInfo && (
        <PasswordDeliveryPanel
          info={userPasswordDeliveryInfo}
          onClose={() => setUserPasswordDeliveryInfo(null)}
        />
      )}
    </section>
  )
}

function getUserDisplayName(managedUser) {
  return `${managedUser.lastName ?? ''} ${managedUser.firstName ?? ''}`.trim() || managedUser.email
}

function userStatusLabel(status) {
  return (
    {
      PENDING: 'En attente',
      ACTIVE: 'Actif',
      DISABLED: 'Desactive',
      FORCE_PASSWORD_CHANGE: 'Mot de passe a changer',
    }[status] ?? status
  )
}

function AdminUsersSettings({
  isLoading,
  onChangeRole,
  onRefresh,
  onResetPassword,
  onToggleStatus,
  onViewHistory,
  savingTarget,
  selectedHistoryUser,
  userHistory,
  users,
}) {
  const pendingCount = users.filter((item) => item.status === 'PENDING').length

  return (
    <div className="settings-card">
      {/* Gestion reservee Admin : comptes, roles, statuts, reset et historique utilisateur. */}
      <div className="settings-panel-heading">
        <div>
          <p className="eyebrow">Gestion des utilisateurs</p>
          <h2>Comptes et droits.</h2>
          <p>{pendingCount} utilisateur(s) en attente de validation.</p>
        </div>
        <button type="button" className="secondary-button bordered" onClick={onRefresh}>
          Actualiser
        </button>
      </div>

      {isLoading ? (
        <p className="approval-empty">Chargement des utilisateurs...</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Statut</th>
                <th>Role</th>
                <th>Derniere connexion</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((managedUser) => (
                <tr key={managedUser.id}>
                  <td>
                    <strong>{getUserDisplayName(managedUser)}</strong>
                    <span>{managedUser.email}</span>
                  </td>
                  <td>
                    <span className={`status-pill ${managedUser.status.toLowerCase()}`}>
                      {userStatusLabel(managedUser.status)}
                    </span>
                  </td>
                  <td>
                    <select
                      aria-label="Modifier le role"
                      value={managedUser.roles?.[0]?.name ?? 'AUTRE'}
                      disabled={savingTarget === `role-${managedUser.id}`}
                      onChange={(event) => onChangeRole(managedUser, event.target.value)}
                    >
                      {availableRoles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {managedUser.lastLoginAt
                      ? formatDateTime(new Date(managedUser.lastLoginAt))
                      : 'Jamais'}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="secondary-button bordered"
                        disabled={savingTarget === `history-${managedUser.id}`}
                        onClick={() => onViewHistory(managedUser)}
                      >
                        Historique
                      </button>
                      <button
                        type="button"
                        className="secondary-button bordered"
                        disabled={savingTarget === `reset-${managedUser.id}`}
                        onClick={() => onResetPassword(managedUser)}
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        className={managedUser.status === 'DISABLED' ? 'primary-button' : 'danger-button'}
                        disabled={savingTarget === `status-${managedUser.id}`}
                        onClick={() => onToggleStatus(managedUser)}
                      >
                        {managedUser.status === 'DISABLED' ? 'Reactiver' : 'Desactiver'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedHistoryUser && (
        <article className="settings-muted-panel">
          <p className="eyebrow">Historique utilisateur</p>
          <h3>{getUserDisplayName(selectedHistoryUser)}</h3>
          <ul className="activity-list">
            {userHistory.map((event) => (
              <li key={event.id}>
                <span>{formatDateTime(new Date(event.createdAt))}</span>
                <strong>{auditActionLabel(event.action)}</strong>
              </li>
            ))}
            {userHistory.length === 0 && <li>Aucun historique disponible.</li>}
          </ul>
        </article>
      )}
    </div>
  )
}

function DisplayPreferencesSettings({ onChange, onToggleWidget, preferences }) {
  const widgetLabels = {
    budget: 'Budget',
    events: 'Evenements',
    alerts: 'Alertes',
    team: 'Equipe',
    finance: 'Finance',
  }

  return (
    <div className="settings-card">
      <div className="settings-panel-heading">
        <div>
          <p className="eyebrow">Preferences d'affichage</p>
          <h2>Adapter le dashboard.</h2>
        </div>
        <MonitorCog size={34} aria-hidden="true" />
      </div>
      <div className="form-grid">
        <label>
          Theme
          <select value={preferences.theme} onChange={(event) => onChange('theme', event.target.value)}>
            <option value="light">Clair</option>
            <option value="dark">Sombre</option>
          </select>
        </label>
        <label>
          Langue
          <select value={preferences.language} onChange={(event) => onChange('language', event.target.value)}>
            <option value="fr">Francais</option>
            <option value="en">Anglais</option>
          </select>
        </label>
        <label>
          Format de date
          <select value={preferences.dateFormat} onChange={(event) => onChange('dateFormat', event.target.value)}>
            <option value="full">Complet</option>
            <option value="short">Court</option>
            <option value="numeric">Numerique</option>
          </select>
        </label>
        <label>
          Fuseau horaire
          <select value={preferences.timezone} onChange={(event) => onChange('timezone', event.target.value)}>
            <option value="Africa/Abidjan">Africa/Abidjan</option>
            <option value="Europe/Paris">Europe/Paris</option>
            <option value="UTC">UTC</option>
          </select>
        </label>
        <label>
          Densite dashboard
          <select value={preferences.density} onChange={(event) => onChange('density', event.target.value)}>
            <option value="comfortable">Confortable</option>
            <option value="compact">Compacte</option>
            <option value="spacious">Aeree</option>
          </select>
        </label>
      </div>
      <div className="settings-section-grid">
        {Object.entries(preferences.widgets).map(([widget, enabled]) => (
          <label className="settings-toggle" key={widget}>
            <input type="checkbox" checked={enabled} onChange={() => onToggleWidget(widget)} />
            Afficher {widgetLabels[widget]}
          </label>
        ))}
      </div>
    </div>
  )
}

function NotificationSettings({ notifications, onChangeFrequency, onToggle }) {
  const items = [
    ['registration', "Notifications d'inscription"],
    ['budget', 'Notifications budget'],
    ['event', 'Notifications evenement'],
    ['email', 'Notifications email'],
    ['inApp', "Notifications dans l'application"],
  ]

  return (
    <div className="settings-card">
      <div className="settings-panel-heading">
        <div>
          <p className="eyebrow">Notifications</p>
          <h2>Regles d'alerte.</h2>
        </div>
        <Bell size={34} aria-hidden="true" />
      </div>
      <div className="settings-section-grid">
        {items.map(([key, label]) => (
          <label className="settings-toggle" key={key}>
            <input type="checkbox" checked={notifications[key]} onChange={() => onToggle(key)} />
            {label}
          </label>
        ))}
      </div>
      <label>
        Frequence des rappels
        <select
          value={notifications.reminderFrequency}
          onChange={(event) => onChangeFrequency(event.target.value)}
        >
          <option value="realtime">Temps reel</option>
          <option value="daily">Quotidienne</option>
          <option value="weekly">Hebdomadaire</option>
          <option value="manual">Manuelle</option>
        </select>
      </label>
    </div>
  )
}

function ModuleSettings({ modules, onToggle }) {
  const items = [
    ['events', 'Evenements'],
    ['finances', 'Finances'],
    ['rh', 'RH'],
    ['commercial', 'Commercial'],
    ['documents', 'Documents'],
    ['prestations', 'Prestations'],
    ['reports', 'Rapports'],
  ]

  return (
    <div className="settings-card">
      <div className="settings-panel-heading">
        <div>
          <p className="eyebrow">Modules actives</p>
          <h2>Preparer l'evolution.</h2>
          <p>Ces interrupteurs preparent l'activation progressive des modules metier.</p>
        </div>
        <Layers size={34} aria-hidden="true" />
      </div>
      <div className="module-toggle-grid">
        {items.map(([key, label]) => (
          <button
            type="button"
            className={`module-toggle ${modules[key] ? 'active' : ''}`}
            key={key}
            onClick={() => onToggle(key)}
          >
            <span>{label}</span>
            <strong>{modules[key] ? 'Actif' : 'Inactif'}</strong>
          </button>
        ))}
      </div>
    </div>
  )
}

function ActivityLogSettings({ activityLog, isLoading, onRefresh }) {
  return (
    <div className="settings-card">
      <div className="settings-panel-heading">
        <div>
          <p className="eyebrow">Journal d'activite</p>
          <h2>Actions sensibles.</h2>
        </div>
        <button type="button" className="secondary-button bordered" onClick={onRefresh}>
          Actualiser
        </button>
      </div>
      {isLoading ? (
        <p className="approval-empty">Chargement du journal...</p>
      ) : (
        <ul className="activity-list detailed">
          {activityLog.map((event) => (
            <li key={event.id}>
              <History size={18} aria-hidden="true" />
              <div>
                <strong>{auditActionLabel(event.action)}</strong>
                <span>
                  {event.user?.email ?? 'Systeme'} - {formatDateTime(new Date(event.createdAt))}
                </span>
              </div>
            </li>
          ))}
          {activityLog.length === 0 && <li>Aucune activite disponible.</li>}
        </ul>
      )}
    </div>
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
          <p>Vous quitterez le dashboard et serez redirige vers la page de connexion.</p>
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
