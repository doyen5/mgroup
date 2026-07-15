import { useEffect, useMemo, useState } from 'react'
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
  { value: 'ADMIN', label: 'Admin' },
]

// Formatage unique pour l'horloge, le toast et la derniere connexion.
const formatDateTime = (date) =>
  new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(date)

// Lecture securisee d'un champ de formulaire HTML.
const getFormValue = (formData, name) => String(formData.get(name) ?? '').trim()

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

        <p className="auth-lead">Sign in with:</p>
        <div className="social-row" aria-label="Connexion sociale">
          <button type="button" onClick={onGmailAccess} aria-label="Gmail">
            G
          </button>
          <button type="button" aria-label="Contact">
            @
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

function DashboardView({ lastLoginAt, onGoHome, onProfileUpdate, onRequestLogout, user }) {
  const [now, setNow] = useState(() => new Date())
  const [activePanel, setActivePanel] = useState('overview')
  const [pendingUsers, setPendingUsers] = useState([])
  const [selectedRoles, setSelectedRoles] = useState({})
  const [approvalFeedback, setApprovalFeedback] = useState('')
  const [dashboardError, setDashboardError] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const roleKey = useMemo(() => user.roleValues.join('|'), [user.roleValues])
  const isAdmin = user.roleValues.includes('ADMIN')

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

  const approveUser = async (pendingUser) => {
    const role = selectedRoles[pendingUser.id] ?? 'SECRETAIRE'
    setIsApproving(true)
    setDashboardError('')
    setApprovalFeedback('')

    try {
      const result = await api.approveUser(pendingUser.id, { role })
      setPendingUsers((current) => current.filter((item) => item.id !== pendingUser.id))
      setApprovalFeedback(
        `Compte valide pour ${pendingUser.email}. Mot de passe temporaire : ${result.temporaryPassword}`,
      )
    } catch (error) {
      setDashboardError(error.message)
    } finally {
      setIsApproving(false)
    }
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
          <a href="#validation" onClick={() => setActivePanel('validation')}>
            <span>●</span>
            Inscriptions
          </a>
          <a href="#events">
            <span>◆</span>
            Evenements
          </a>
          <a href="#finance">
            <span>▥</span>
            Finances
          </a>
          <a href="#team">
            <span>◉</span>
            Equipe
          </a>
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
            <button type="button" className="secondary-button bordered" onClick={onGoHome}>
              Accueil du site
            </button>
            <button type="button" className="danger-button" onClick={onRequestLogout}>
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
          <SettingsPanel user={user} onProfileUpdate={onProfileUpdate} />
        ) : (
          <>
        <div id="dashboard" className="dashboard-hero admin-dashboard-title">
          <p className="eyebrow">Dashboard {user.role}</p>
          <h1>Vue generale de pilotage.</h1>
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
                  <button
                    type="button"
                    className="primary-button"
                    disabled={isApproving}
                    onClick={() => approveUser(pendingUser)}
                  >
                    Confirmer
                  </button>
                </div>
              ))
            )}
          </section>
        )}
          </>
        )}
      </section>
    </section>
  )
}

function SettingsPanel({ onProfileUpdate, user }) {
  const [notice, setNotice] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(user.photoUrl ?? '')

  const saveProfile = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const photoUrl = await fileToDataUrl(formData.get('photo'))

    setIsSaving(true)
    setNotice('')

    try {
      const updated = await onProfileUpdate({
        firstName: getFormValue(formData, 'firstName'),
        lastName: getFormValue(formData, 'lastName'),
        address: getFormValue(formData, 'address'),
        email: getFormValue(formData, 'email'),
        phone: getFormValue(formData, 'phone'),
        photoUrl: photoUrl || user.photoUrl,
      })

      setPreviewUrl(updated.photoUrl ?? '')
      setNotice('Profil mis a jour avec succes.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="settings-panel" aria-label="Parametres du compte">
      {/* Parametres du profil connecte : les changements sont persistants en base. */}
      <div className="dashboard-hero admin-dashboard-title">
        <p className="eyebrow">Parametres</p>
        <h1>Mon profil.</h1>
        <p>
          Mettez a jour vos informations personnelles. Le role reste gere par
          l'administrateur.
        </p>
      </div>

      <form className="settings-card" onSubmit={saveProfile}>
        {notice && (
          <p className={`auth-notice ${notice.includes('succes') ? 'success' : 'error'}`}>
            {notice}
          </p>
        )}

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
            Role
            <input type="text" value={user.role} disabled />
          </label>
        </div>

        <div className="settings-actions">
          <button type="submit" className="primary-button" disabled={isSaving}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
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
