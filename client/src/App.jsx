import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  Banknote,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Eye,
  FileText,
  Gauge,
  Handshake,
  History,
  Home,
  Layers,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  MonitorCog,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Timer,
  Trophy,
  UserPlus,
  UserCheck,
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
    icon: Sparkles,
    metric: 'Concerts, ceremonies, conferences',
    text: 'Organisation complete de concerts, ceremonies, conferences et experiences premium.',
  },
  {
    title: 'Pilotage artistique',
    label: 'Coordination',
    icon: Users,
    metric: 'Equipes, invites, partenaires',
    text: 'Coordination des equipes, invites, partenaires et prestataires autour des projets de Molare.',
  },
  {
    title: 'Gestion administrative',
    label: 'Controle',
    icon: ShieldCheck,
    metric: 'Budgets, documents, validations',
    text: 'Suivi des documents, budgets, validations, inscriptions et workflows internes de M Group.',
  },
  {
    title: 'Relations clients et partenaires',
    label: 'Commercial',
    icon: Handshake,
    metric: 'Prospects, devis, relances',
    text: 'Suivi clair des demandes de prestations, devis commerciaux et echanges avec les partenaires.',
  },
  {
    title: 'Finances et budgets',
    label: 'Budget',
    icon: Banknote,
    metric: 'Depenses, paiements, alertes',
    text: 'Lecture rapide des previsions, depenses reelles, paiements et seuils de depassement.',
  },
  {
    title: 'Ressources humaines',
    label: 'RH',
    icon: UserCheck,
    metric: 'Disponibilites, missions, contrats',
    text: 'Affectation des equipes, suivi des disponibilites et gestion des documents administratifs.',
  },
]

// Chiffres de confiance affiches en haut de la landing page.
const homeStats = [
  { value: '360°', label: 'Pilotage complet', icon: Gauge },
  { value: '7', label: 'Modules metier', icon: Layers },
  { value: '24h', label: 'Alertes et rappels', icon: Timer },
  { value: 'FCFA', label: 'Budgets suivis', icon: Wallet },
]

// Methode de travail presentee au public avant l'acces a la plateforme.
const processSteps = [
  {
    title: 'Cadrer',
    text: 'Identifier le besoin, le lieu, le budget, les prestataires et les responsables.',
    icon: ClipboardCheck,
  },
  {
    title: 'Planifier',
    text: 'Construire le planning, la checklist, les documents et les affectations terrain.',
    icon: CalendarDays,
  },
  {
    title: 'Valider',
    text: 'Faire passer les budgets, inscriptions et workflows par les bons niveaux de decision.',
    icon: CheckCircle2,
  },
  {
    title: 'Mesurer',
    text: "Garder l'historique, les rapports, les depenses et les performances apres evenement.",
    icon: Activity,
  },
]

// Modules internes presentes comme apercu de l'application connectee.
const platformModules = [
  { title: 'Evenements', text: 'Planning, production, checklist et pieces jointes.', icon: CalendarDays },
  { title: 'Finances', text: 'Budgets, paiements, factures, recus et alertes.', icon: Banknote },
  { title: 'RH', text: 'Personnel, contrats, disponibilites et missions.', icon: Users },
  { title: 'Commercial', text: 'Clients, prospects, prestations, devis et relances.', icon: Handshake },
  { title: 'Documents', text: 'Classement par client, evenement ou utilisateur.', icon: FileText },
  { title: 'Rapports', text: 'CA, budgets consommes, performances et exports.', icon: Trophy },
]

const trustItems = [
  { title: 'Acces par role', text: 'Chaque utilisateur voit uniquement les modules utiles a son travail.', icon: ShieldCheck },
  { title: 'Tracabilite', text: "Les actions sensibles sont conservees dans le journal d'activite.", icon: History },
  { title: 'Notifications', text: "L'admin est alerte lors des inscriptions, validations et budgets critiques.", icon: Bell },
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

const eventStatusOptions = [
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'IN_PREPARATION', label: 'En preparation' },
  { value: 'VALIDATED', label: 'Valide' },
  { value: 'COMPLETED', label: 'Termine' },
  { value: 'CANCELLED', label: 'Annule' },
]

const eventAttachmentTypes = [
  { value: 'CONTRACT', label: 'Contrat' },
  { value: 'TECHNICAL_SHEET', label: 'Fiche technique' },
  { value: 'QUOTE', label: 'Devis' },
  { value: 'PHOTO', label: 'Photo' },
  { value: 'OTHER', label: 'Autre' },
]

const budgetStatusOptions = [
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'PENDING_APPROVAL', label: 'En attente' },
  { value: 'APPROVED', label: 'Valide' },
  { value: 'REJECTED', label: 'Rejete' },
]

const paymentStatusOptions = [
  { value: 'PENDING', label: 'En attente' },
  { value: 'PARTIAL', label: 'Partiel' },
  { value: 'PAID', label: 'Paye' },
  { value: 'OVERDUE', label: 'En retard' },
  { value: 'CANCELLED', label: 'Annule' },
]

const financeDocumentTypes = [
  { value: 'QUOTE', label: 'Devis' },
  { value: 'INVOICE', label: 'Facture' },
  { value: 'RECEIPT', label: 'Recu' },
  { value: 'OTHER', label: 'Autre' },
]

const workflowStatusOptions = [
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'PENDING_BUDGET', label: 'Budget attendu' },
  { value: 'PENDING_RH', label: 'Affectation RH' },
  { value: 'PENDING_ADMIN', label: 'Validation Admin' },
  { value: 'APPROVED', label: 'Valide' },
  { value: 'REJECTED', label: 'Refuse' },
  { value: 'CANCELLED', label: 'Annule' },
]

const workflowActionLabels = {
  CREATED: 'Demande creee',
  BUDGET_ADDED: 'Budget ajoute',
  PEOPLE_ASSIGNED: 'Personnes affectees',
  SUBMITTED_TO_ADMIN: 'Soumis a l Admin',
  APPROVED: 'Validation Admin',
  REJECTED: 'Refus Admin',
  COMMENTED: 'Commentaire',
}

const notificationTypeLabels = {
  USER_REGISTERED: 'Inscription',
  BUDGET_PENDING: 'Budget a valider',
  BUDGET_OVER_LIMIT: 'Depassement budget',
  EVENT_REMINDER: 'Rappel evenement',
  WORKFLOW_UPDATED: 'Workflow',
  EVENT_UPCOMING: 'Evenement proche',
}

const staffAvailabilityOptions = [
  { value: 'AVAILABLE', label: 'Disponible' },
  { value: 'BUSY', label: 'Occupe' },
  { value: 'UNAVAILABLE', label: 'Indisponible' },
  { value: 'ON_LEAVE', label: 'En conge' },
]

const staffContractTypes = [
  { value: 'CDI', label: 'CDI' },
  { value: 'CDD', label: 'CDD' },
  { value: 'FREELANCE', label: 'Freelance' },
  { value: 'STAGE', label: 'Stage' },
  { value: 'PRESTATAIRE', label: 'Prestataire' },
  { value: 'AUTRE', label: 'Autre' },
]

const staffContractStatuses = [
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'EXPIRED', label: 'Expire' },
  { value: 'TERMINATED', label: 'Termine' },
]

const staffDocumentTypes = [
  { value: 'ID_CARD', label: 'Piece identite' },
  { value: 'CONTRACT', label: 'Contrat' },
  { value: 'CV', label: 'CV' },
  { value: 'CERTIFICATE', label: 'Attestation' },
  { value: 'ADMINISTRATIVE', label: 'Administratif' },
  { value: 'OTHER', label: 'Autre' },
]

const staffMissionStatuses = [
  { value: 'PLANNED', label: 'Planifiee' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'COMPLETED', label: 'Terminee' },
  { value: 'CANCELLED', label: 'Annulee' },
]

const commercialStatusOptions = [
  { value: 'NEW', label: 'Nouveau' },
  { value: 'IN_DISCUSSION', label: 'En discussion' },
  { value: 'WON', label: 'Gagne' },
  { value: 'LOST', label: 'Perdu' },
]

const serviceRequestStatusOptions = [
  { value: 'NEW', label: 'Nouvelle' },
  { value: 'IN_DISCUSSION', label: 'En discussion' },
  { value: 'QUOTED', label: 'Devis envoye' },
  { value: 'WON', label: 'Gagnee' },
  { value: 'LOST', label: 'Perdue' },
  { value: 'CANCELLED', label: 'Annulee' },
]

const quoteStatusOptions = [
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'SENT', label: 'Envoye' },
  { value: 'ACCEPTED', label: 'Accepte' },
  { value: 'REJECTED', label: 'Rejete' },
  { value: 'EXPIRED', label: 'Expire' },
]

const documentScopeOptions = [
  { value: 'COMPANY', label: 'Entreprise' },
  { value: 'EVENT', label: 'Evenement' },
  { value: 'CLIENT', label: 'Client' },
  { value: 'USER', label: 'Utilisateur' },
]

const businessDocumentTypes = [
  { value: 'QUOTE', label: 'Devis' },
  { value: 'INVOICE', label: 'Facture' },
  { value: 'RECEIPT', label: 'Recu' },
  { value: 'CONTRACT', label: 'Contrat' },
  { value: 'TECHNICAL_SHEET', label: 'Fiche technique' },
  { value: 'PHOTO', label: 'Photo' },
  { value: 'ADMINISTRATIVE', label: 'Administratif' },
  { value: 'REPORT', label: 'Rapport' },
  { value: 'OTHER', label: 'Autre' },
]

const businessDocumentStatuses = [
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'PENDING_VALIDATION', label: 'A valider' },
  { value: 'APPROVED', label: 'Valide' },
  { value: 'REJECTED', label: 'Rejete' },
  { value: 'SIGNED', label: 'Signe' },
  { value: 'ARCHIVED', label: 'Archive' },
]

const dashboardPanelCatalog = {
  overview: { label: 'Vue generale', icon: Activity },
  validation: { label: 'Inscriptions', icon: ClipboardCheck },
  workflows: { label: 'Workflows', icon: Layers },
  events: { label: 'Evenements', icon: CalendarDays },
  commercial: { label: 'Commercial', icon: UserPlus },
  finance: { label: 'Tresorerie', icon: Wallet },
  team: { label: 'Equipe / RH', icon: Users },
  budget: { label: 'Budgets', icon: Banknote },
  documents: { label: 'Documents', icon: FileText },
  reports: { label: 'Rapports', icon: Activity },
  alerts: { label: 'Alertes', icon: Bell },
  settings: { label: 'Parametres', icon: MonitorCog },
}

const getDashboardPanelIds = (roleValues) => {
  if (roleValues.includes('ADMIN')) {
    return [
      'overview',
      'validation',
      'workflows',
      'events',
      'commercial',
      'team',
      'finance',
      'budget',
      'documents',
      'reports',
      'alerts',
      'settings',
    ]
  }

  if (roleValues.includes('RH')) {
    return ['overview', 'team', 'workflows', 'events', 'documents', 'alerts', 'settings']
  }

  if (roleValues.includes('COMPTABLE')) {
    return ['overview', 'finance', 'budget', 'documents', 'reports', 'workflows', 'events', 'alerts', 'settings']
  }

  if (roleValues.includes('COMMERCIAL')) {
    return ['overview', 'commercial', 'workflows', 'events', 'documents', 'reports', 'alerts', 'settings']
  }

  if (roleValues.includes('SECRETAIRE')) {
    return ['overview', 'events', 'alerts', 'settings']
  }

  return ['overview', 'alerts', 'settings']
}

// Formatage unique pour l'horloge, le toast et la derniere connexion.
const formatDateTime = (date) =>
  new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(date)

const formatFcfa = (value) => `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`

const formatDateInput = (value) => {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 16)
}

const eventStatusLabel = (status) =>
  eventStatusOptions.find((option) => option.value === status)?.label ?? status

const eventAttachmentLabel = (type) =>
  eventAttachmentTypes.find((option) => option.value === type)?.label ?? type

const budgetStatusLabel = (status) =>
  budgetStatusOptions.find((option) => option.value === status)?.label ?? status

const paymentStatusLabel = (status) =>
  paymentStatusOptions.find((option) => option.value === status)?.label ?? status

const financeDocumentLabel = (type) =>
  financeDocumentTypes.find((option) => option.value === type)?.label ?? type

const workflowStatusLabel = (status) =>
  workflowStatusOptions.find((option) => option.value === status)?.label ?? status

const workflowActionLabel = (action) => workflowActionLabels[action] ?? action

const notificationTypeLabel = (type) => notificationTypeLabels[type] ?? type

const staffAvailabilityLabel = (availability) =>
  staffAvailabilityOptions.find((option) => option.value === availability)?.label ?? availability

const staffContractTypeLabel = (type) =>
  staffContractTypes.find((option) => option.value === type)?.label ?? type

const staffContractStatusLabel = (status) =>
  staffContractStatuses.find((option) => option.value === status)?.label ?? status

const staffDocumentTypeLabel = (type) =>
  staffDocumentTypes.find((option) => option.value === type)?.label ?? type

const staffMissionStatusLabel = (status) =>
  staffMissionStatuses.find((option) => option.value === status)?.label ?? status

const commercialStatusLabel = (status) =>
  commercialStatusOptions.find((option) => option.value === status)?.label ?? status

const quoteStatusLabel = (status) => quoteStatusOptions.find((option) => option.value === status)?.label ?? status

const documentScopeLabel = (scope) => documentScopeOptions.find((option) => option.value === scope)?.label ?? scope

const businessDocumentTypeLabel = (type) =>
  businessDocumentTypes.find((option) => option.value === type)?.label ?? type

const businessDocumentStatusLabel = (status) =>
  businessDocumentStatuses.find((option) => option.value === status)?.label ?? status

const userDisplayName = (user) =>
  `${user?.lastName ?? ''} ${user?.firstName ?? ''}`.trim() || user?.email || 'Utilisateur'

const openBlobInNewTab = (blob) => {
  const blobUrl = URL.createObjectURL(blob)
  const openedWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer')

  if (!openedWindow) {
    URL.revokeObjectURL(blobUrl)
    throw new Error("Le navigateur a bloque l'ouverture du document.")
  }

  // Le delai laisse au lecteur PDF du navigateur le temps de charger le fichier temporaire.
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
}

const dataUrlToBlob = (dataUrl) => {
  const [metadata, encodedContent = ''] = dataUrl.split(',')
  const mimeType = metadata.match(/^data:([^;,]+)/)?.[1] ?? 'application/octet-stream'
  const isBase64 = metadata.includes(';base64')
  const binaryContent = isBase64 ? window.atob(encodedContent) : decodeURIComponent(encodedContent)
  const bytes = new Uint8Array(binaryContent.length)

  for (let index = 0; index < binaryContent.length; index += 1) {
    bytes[index] = binaryContent.charCodeAt(index)
  }

  return new Blob([bytes], { type: mimeType })
}

const toPdfSafeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const escapePdfText = (value) => toPdfSafeText(value).replace(/[()\\]/g, '\\$&')

const toPdfLines = (content) =>
  content
    .split(/\r?\n/)
    .flatMap((line) => {
      const safeLine = toPdfSafeText(line)

      if (safeLine.length <= 88) {
        return [safeLine || ' ']
      }

      const chunks = []
      for (let index = 0; index < safeLine.length; index += 88) {
        chunks.push(safeLine.slice(index, index + 88))
      }

      return chunks
    })
    .slice(0, 42)

const buildPdfBlob = (content) => {
  // PDF prototype complet : table xref et startxref pour que Edge/Chrome ouvrent le fichier sans page blanche.
  const textCommands = toPdfLines(content)
    .map((line, index) => `${index === 0 ? '' : 'T* '}(${escapePdfText(line)}) Tj`)
    .join('\n')
  const stream = `BT
/F1 12 Tf
40 780 Td
16 TL
${textCommands}
ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>
stream
${stream}
endstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const objectOffsets = []

  objects.forEach((body, index) => {
    objectOffsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
  })

  const xrefOffset = pdf.length
  const xrefEntries = objectOffsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')
  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f 
${xrefEntries}
trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF
`

  return new Blob([pdf], { type: 'application/pdf' })
}

const buildBusinessDocumentPdfBlob = (document) => {
  const content = [
    document.company?.name ?? 'M Group',
    `Document : ${document.label}`,
    `Type : ${businessDocumentTypeLabel(document.type)}`,
    `Statut : ${businessDocumentStatusLabel(document.status)}`,
    `Cible : ${documentScopeLabel(document.scope)}`,
    `Modele : ${document.templateName ?? 'Modele M Group avec logo'}`,
    document.client ? `Client : ${document.client.name}` : '',
    document.event ? `Evenement : ${document.event.title}` : '',
    document.subjectUser ? `Utilisateur : ${userDisplayName(document.subjectUser)}` : '',
    document.notes ? `Notes : ${document.notes}` : '',
    document.company?.documentFooter ?? 'Document genere par M Group.',
  ]
    .filter(Boolean)
    .join('\n')

  return buildPdfBlob(content)
}

// Lecture securisee d'un champ de formulaire HTML.
const getFormValue = (formData, name) => String(formData.get(name) ?? '').trim()

const buildStructuredNotes = (formData, baseFieldName, fields) => {
  const baseText = getFormValue(formData, baseFieldName)
  const details = fields
    .map(({ label, name, suffix = '' }) => {
      const value = getFormValue(formData, name)
      return value ? `${label} : ${value}${suffix}` : ''
    })
    .filter(Boolean)

  return [baseText, details.length ? `Details metier\n${details.join('\n')}` : ''].filter(Boolean).join('\n\n')
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

const loadGoogleIdentityScript = () =>
  new Promise((resolve, reject) => {
    // Google Identity Services est charge a la demande pour eviter d'alourdir le premier rendu.
    if (window.google?.accounts?.id) {
      resolve()
      return
    }

    const existingScript = document.getElementById('google-identity-script')

    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true })
      existingScript.addEventListener('error', reject, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = 'google-identity-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })

const requestGoogleAuthCode = async () => {
  await loadGoogleIdentityScript()

  return new Promise((resolve, reject) => {
    let settled = false

    // Le mode code ouvre un popup Google et confie l'echange securise au backend.
    const codeClient = window.google.accounts.oauth2.initCodeClient({
      client_id: googleClientId,
      scope: 'openid email profile',
      ux_mode: 'popup',
      callback(response) {
        if (settled) {
          return
        }

        settled = true

        if (response?.code) {
          resolve(response.code)
          return
        }

        reject(new Error(response?.error || "Google n'a pas renvoye de code d'autorisation."))
      },
      error_callback() {
        if (!settled) {
          settled = true
          reject(new Error('Le popup Google a ete ferme ou bloque par le navigateur.'))
        }
      },
    })

    codeClient.requestCode()
  })
}

const settingsStorageKey = 'mgroup.admin.preferences'

const defaultInterfacePreferences = {
  theme: 'light',
  language: 'fr',
  primaryColor: '#159bd3',
  accentColor: '#ff8a2a',
  sidebarStyle: 'dark',
  density: 'comfortable',
  dateFormat: 'full',
  timezone: 'Africa/Abidjan',
  widgets: {
    alerts: true,
    budget: true,
    clients: true,
    documents: true,
    events: true,
    finance: true,
    hr: true,
    reports: true,
    workflows: true,
  },
  navigation: {
    compactSidebar: false,
    showIcons: true,
    stickyHeader: true,
  },
}

const normalizeInterfacePreferences = (preferences) => ({
  ...defaultInterfacePreferences,
  ...(preferences ?? {}),
  widgets: {
    ...defaultInterfacePreferences.widgets,
    ...(preferences?.widgets ?? {}),
  },
  navigation: {
    ...defaultInterfacePreferences.navigation,
    ...(preferences?.navigation ?? {}),
  },
})

const interfaceLabels = {
  fr: {
    alerts: 'Alertes',
    budget: 'Budgets',
    commercial: 'Commercial',
    overview: 'Vue generale',
    dashboard: 'Vue generale',
    documents: 'Documents',
    events: 'Evenements',
    finance: 'Tresorerie',
    home: 'Accueil du site',
    logout: 'Deconnexion',
    reports: 'Rapports',
    settings: 'Parametres',
    sound: 'Alertes',
    team: 'Equipe / RH',
    validation: 'Inscriptions',
    welcome: 'Ravi de vous revoir. Votre espace de pilotage est pret.',
    workflows: 'Workflows',
  },
  en: {
    alerts: 'Alerts',
    budget: 'Budgets',
    commercial: 'Sales',
    overview: 'Overview',
    dashboard: 'Overview',
    documents: 'Documents',
    events: 'Events',
    finance: 'Treasury',
    home: 'Public site',
    logout: 'Logout',
    reports: 'Reports',
    settings: 'Settings',
    sound: 'Alerts',
    team: 'Team / HR',
    validation: 'Registrations',
    welcome: 'Welcome back. Your workspace is ready.',
    workflows: 'Workflows',
  },
}

const interfaceText = (preferences, key) =>
  interfaceLabels[preferences.language]?.[key] ?? interfaceLabels.fr[key] ?? key

const formatDashboardDateTime = (date, preferences = defaultInterfacePreferences) =>
  new Intl.DateTimeFormat(preferences.language === 'en' ? 'en-US' : 'fr-FR', {
    dateStyle: preferences.dateFormat === 'short' ? 'short' : 'full',
    timeStyle: 'medium',
    timeZone: preferences.timezone,
  }).format(date)

const formatDashboardDate = (date, preferences = defaultInterfacePreferences) =>
  new Intl.DateTimeFormat(preferences.language === 'en' ? 'en-US' : 'fr-FR', {
    day: '2-digit',
    month: 'short',
    timeZone: preferences.timezone,
  }).format(date)

const clampPercent = (value) => Math.max(0, Math.min(100, Math.round(value)))

const dateFromValue = (value) => (value ? new Date(value) : null)

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
    LOGIN_FAILED: 'Connexion refusee',
    LOGOUT: 'Deconnexion',
    PASSWORD_CHANGED: 'Mot de passe modifie',
    PASSWORD_RESET_REQUESTED: 'Reset demande',
    EMAIL_VERIFICATION_SENT: 'Verification email envoyee',
    EMAIL_VERIFIED: 'Email verifie',
    PHONE_OTP_SENT: 'Code telephone envoye',
    PHONE_LOGIN_SUCCESS: 'Connexion telephone',
    GOOGLE_LOGIN_SUCCESS: 'Connexion Google',
    TWO_FACTOR_CHALLENGE: 'Controle 2FA demande',
    TWO_FACTOR_ENABLED: '2FA activee',
    TWO_FACTOR_DISABLED: '2FA desactivee',
    ACCOUNT_LOCKED: 'Compte verrouille',
    PROFILE_UPDATED: 'Profil modifie',
    USER_APPROVED: 'Inscription validee',
    USER_DISABLED: 'Compte desactive',
    USER_REACTIVATED: 'Compte reactive',
    USER_PASSWORD_RESET: 'Mot de passe reinitialise',
    ROLE_CHANGED: 'Role modifie',
    COMPANY_UPDATED: 'Entreprise modifiee',
    INTERFACE_PREFERENCES_UPDATED: 'Preferences interface modifiees',
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
    interfacePreference: normalizeInterfacePreferences(user?.interfacePreference),
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
  const [initialResetToken, setInitialResetToken] = useState('')
  const [createdAdminEmail, setCreatedAdminEmail] = useState('')
  const [activeUser, setActiveUser] = useState(null)
  const [twoFactorChallenge, setTwoFactorChallenge] = useState(null)
  const [isAuthBusy, setIsAuthBusy] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [interfacePreferences, setInterfacePreferences] = useState(defaultInterfacePreferences)
  const [lastLoginAt, setLastLoginAt] = useState(null)
  const [showLoginToast, setShowLoginToast] = useState(false)

  const buildDashboardUser = useCallback(async (profile) => {
    try {
      const preferences = await api.getInterfacePreferences()
      return toDashboardUser({
        ...profile,
        interfacePreference: preferences,
      })
    } catch {
      return toDashboardUser(profile)
    }
  }, [])

  // Au lancement, le frontend verifie le setup puis restaure la session si un cookie valide existe.
  useEffect(() => {
    let isMounted = true

    api
      .getSetupStatus()
      .then(async (status) => {
        if (!isMounted) {
          return
        }

        setSetupStatus(status)
        const urlParams = new URLSearchParams(window.location.search)
        const verifyEmailToken = urlParams.get('verifyEmailToken')
        const resetToken = urlParams.get('resetToken')

        if (verifyEmailToken) {
          try {
            await api.verifyEmail({ token: verifyEmailToken })
            setAuthNotice('Votre email est verifie. Vous pouvez vous connecter.')
          } catch (error) {
            setAuthNotice(error.message)
          }

          window.history.replaceState({}, '', window.location.pathname)
          setAuthMode('login')
          setCurrentView('auth')
          return
        }

        if (resetToken) {
          setInitialResetToken(resetToken)
          setAuthNotice('Token de reinitialisation detecte. Definissez votre nouveau mot de passe.')
          window.history.replaceState({}, '', window.location.pathname)
          setAuthMode('login')
          setCurrentView('auth')
          return
        }

        if (status.requiresSetup) {
          setCurrentView('gateway')
          return
        }

        try {
          const profile = await api.getUserProfile()

          if (!isMounted) {
            return
          }

          const dashboardUser = await buildDashboardUser(profile)
          setActiveUser(dashboardUser)
          setInterfacePreferences(dashboardUser.interfacePreference)
          setLastLoginAt(profile.lastLoginAt ? new Date(profile.lastLoginAt) : null)

          if (profile.status === 'FORCE_PASSWORD_CHANGE') {
            setPasswordNotice('Votre compte exige une modification du mot de passe avant le dashboard.')
            setCurrentView('passwordChange')
            return
          }

          setCurrentView('dashboard')
        } catch {
          if (!isMounted) {
            return
          }

          setAuthMode('login')
          setAuthNotice('Connectez-vous pour acceder a votre espace.')
          setCurrentView('auth')
        }
      })
      .catch((error) => {
        if (!isMounted) {
          return
        }

        setAuthNotice(`API indisponible : ${error.message}`)
        setAuthMode('login')
        setCurrentView('auth')
      })

    return () => {
      isMounted = false
    }
  }, [buildDashboardUser])

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

  const handleAuthenticatedResult = async (result) => {
    // Tous les flux d'auth reutilisent cette sortie : mot de passe, Google, telephone et 2FA.
    if (result.requiresApproval) {
      showView('pendingApproval')
      return
    }

    if (result.requiresTwoFactor) {
      setTwoFactorChallenge({
        challengeId: result.challengeId,
        message: result.message,
      })
      setPasswordNotice('Saisissez le code 2FA de votre application d authentification.')
      showView('twoFactorLogin')
      return
    }

    const dashboardUser = await buildDashboardUser(result.user)

    setActiveUser(dashboardUser)
    setInterfacePreferences(dashboardUser.interfacePreference)
    setLastLoginAt(result.user?.lastLoginAt ? new Date(result.user.lastLoginAt) : new Date())
    setShowLoginToast(true)

    if (result.forcePasswordChange) {
      setPasswordNotice('Votre compte exige une modification du mot de passe avant le dashboard.')
      showView('passwordChange')
      return
    }

    showView('dashboard')
  }

  const handleGoogleAccess = async () => {
    if (!googleClientId) {
      setAuthNotice('Google OAuth n est pas configure. Ajoutez VITE_GOOGLE_CLIENT_ID cote client et GOOGLE_CLIENT_ID cote serveur.')
      return
    }

    setIsAuthBusy(true)
    setAuthNotice('')

    try {
      const code = await requestGoogleAuthCode()
      const result = await api.googleCodeLogin({ code, redirectUri: window.location.origin })
      await handleAuthenticatedResult(result)
    } catch (error) {
      setAuthNotice(
        `${error.message} Verifiez aussi les origines autorisees Google Cloud et les utilisateurs de test OAuth.`,
      )
    } finally {
      setIsAuthBusy(false)
    }
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

      // Remember me garde uniquement l'email localement ; les tokens restent en cookies HttpOnly.
      if (formData.get('rememberMe') === 'on') {
        window.localStorage.setItem('mgroup.rememberedEmail', getFormValue(formData, 'email'))
      } else {
        window.localStorage.removeItem('mgroup.rememberedEmail')
      }

      await handleAuthenticatedResult(result)
    } catch (error) {
      setAuthNotice(error.message)
    } finally {
      setIsAuthBusy(false)
    }
  }

  const handleTwoFactorLogin = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    if (!twoFactorChallenge?.challengeId) {
      setPasswordNotice('Challenge 2FA introuvable. Recommencez la connexion.')
      return
    }

    setIsAuthBusy(true)
    setPasswordNotice('')

    try {
      const result = await api.verifyTwoFactorLogin({
        challengeId: twoFactorChallenge.challengeId,
        code: getFormValue(formData, 'code'),
        rememberMe: formData.get('rememberMe') === 'on',
      })
      setTwoFactorChallenge(null)
      await handleAuthenticatedResult(result)
    } catch (error) {
      setPasswordNotice(error.message)
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
      const dashboardUser = await buildDashboardUser(profile)

      setActiveUser(dashboardUser)
      setInterfacePreferences(dashboardUser.interfacePreference)
      showView('dashboard')
    } catch (error) {
      setPasswordNotice(error.message)
    } finally {
      setIsAuthBusy(false)
    }
  }

  const handleProfileUpdate = async (payload) => {
    const updated = await api.updateUserProfile(payload)
    const dashboardUser = toDashboardUser({
      ...updated,
      interfacePreference: interfacePreferences,
    })

    setActiveUser(dashboardUser)
    return dashboardUser
  }

  const handleInterfacePreferencesUpdate = async (payload) => {
    const updatedPreferences = normalizeInterfacePreferences(await api.updateInterfacePreferences(payload))
    setInterfacePreferences(updatedPreferences)
    setActiveUser((current) =>
      current
        ? {
            ...current,
            interfacePreference: updatedPreferences,
          }
        : current,
    )
    return updatedPreferences
  }

  const handleCompanyUpdate = async (payload) => {
    // Sauvegarde centralisee pour les parametres entreprise reserves a l'Admin.
    return api.updateCompany(payload)
  }

  const confirmLogout = async () => {
    setIsLogoutConfirmOpen(false)
    setShowLoginToast(false)
    setActiveUser(null)
    setTwoFactorChallenge(null)
    setInterfacePreferences(defaultInterfacePreferences)
    goLogin('Vous avez ete deconnecte. Reconnectez-vous pour acceder a votre espace.')

    // La deconnexion est optimiste cote interface : le formulaire s'affiche tout de suite,
    // puis le backend nettoie les cookies et le refresh token sans bloquer l'utilisateur.
    api.logout().catch(() => {
      // Meme si le token est deja expire, la session locale est deja fermee.
    })
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
          initialResetToken={initialResetToken}
          isBusy={isAuthBusy}
          notice={authNotice}
          onAuthSuccess={handleAuthenticatedResult}
          onGmailAccess={handleGoogleAccess}
          onPhoneAccess={() => setAuthNotice('')}
          onModeChange={(mode) => {
            setAuthMode(mode)
            setAuthNotice('')
            setInitialResetToken('')
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

      {currentView === 'twoFactorLogin' && (
        <TwoFactorLoginPage
          isBusy={isAuthBusy}
          notice={passwordNotice}
          onBack={() => goLogin('Reconnectez-vous pour relancer le controle 2FA.')}
          onSubmit={handleTwoFactorLogin}
        />
      )}

      {currentView === 'pendingApproval' && <PendingApprovalPage onGoLogin={goLogin} />}

      {currentView === 'home' && <HomeView onOpenAuth={() => goLogin()} />}

      {currentView === 'dashboard' && activeUser && (
        <DashboardView
          lastLoginAt={lastLoginAt}
          onCompanyUpdate={handleCompanyUpdate}
          onGoHome={goHome}
          onInterfacePreferencesUpdate={handleInterfacePreferencesUpdate}
          onProfileUpdate={handleProfileUpdate}
          onRequestLogout={() => setIsLogoutConfirmOpen(true)}
          preferences={interfacePreferences}
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
  const whatsappNumber = '2250749676767'
  const whatsappDisplay = '+225 07 49 67 67 67'
  const whatsappMessage = encodeURIComponent(
    "Bonjour M Group, je souhaite echanger avec vous pour une prestation evenementielle.",
  )
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`
  const publicStats = homeStats.map((stat, index) => {
    const refinedStats = [
      { value: '200+', label: 'Projets suivis' },
      { value: '15 ans', label: "D'experience terrain" },
      { value: '50+', label: 'Clients accompagnes' },
      { value: '8 pays', label: 'Rayonnement regional' },
    ]

    return { ...stat, ...refinedStats[index] }
  })
  const methodSteps = [
    ...processSteps,
    {
      title: 'Capitaliser',
      text: 'Transformer chaque projet en rapports, preuves, budget final et apprentissages.',
      icon: Trophy,
    },
  ]

  const openQuoteWhatsApp = (event) => {
    event.preventDefault()
    window.open(whatsappHref, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="public-home">
      {/* Page d'accueil finale accessible quand le setup initial n'est plus requis. */}
      <section className="hero-section public-hero" aria-label="Accueil M Group">
        <img className="hero-bg" src={heroImage} alt="" />
        <div className="hero-overlay"></div>
        <div className="home-grid-surface" aria-hidden="true"></div>

        <header className="topbar public-topbar" aria-label="Navigation principale">
          <a className="brand" href="#accueil" aria-label="Retour a l'accueil">
            <span className="brand-mark">M</span>
            <span>M Group</span>
          </a>
          <nav className="home-nav" aria-label="Navigation accueil">
            <a href="#apropos">A propos</a>
            <a href="#prestations">Expertises</a>
            <a href="#realisations">Realisations</a>
            <a href="#methode">Methode</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="nav-actions">
            <a className="dark-ghost-button" href={whatsappHref} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            <button type="button" className="quote-button" onClick={onOpenAuth}>
              Mon Espace
            </button>
          </div>
        </header>

        <div id="accueil" className="hero-content public-hero-content">
          <p className="eyebrow hero-kicker">Agence de strategie, production et impact culturel</p>
          <h1>
            Strategie.
            <br />
            Creativite.
            <br />
            <span>Impact.</span>
          </h1>
          <p className="hero-copy">
            M Group transforme les projets de Molare et de ses partenaires en experiences
            structurees : idees, equipes, budgets, documents, validations et resultats restent sous
            controle.
          </p>
          <div className="hero-actions">
            <a className="quote-button large" href="#contact">
              Demander un devis
            </a>
            <a className="dark-ghost-button large" href="#prestations">
              Nos expertises
            </a>
          </div>
          <div className="hero-stat-strip" aria-label="Indicateurs M Group">
            {publicStats.map((stat) => {
              const Icon = stat.icon

              return (
                <article key={stat.label}>
                  <Icon size={20} aria-hidden="true" />
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </article>
              )
            })}
          </div>
        </div>

        <aside className="hero-impact-card" aria-label="Synthese M Group">
          <span className="impact-tag">M Group OS</span>
          <h2>Idee claire. Equipe alignee. Execution maitrisee.</h2>
          <p>
            Une vitrine publique et un espace interne pour coordonner les decisions, les budgets et
            les livrables sensibles.
          </p>
          <div className="impact-tags">
            <span>Culture</span>
            <span>Corporate</span>
            <span>Activation</span>
          </div>
        </aside>
      </section>

      <section id="apropos" className="about-section public-about">
        <div className="about-media enhanced-media public-media-card">
          <img src={heroImage} alt="Equipe M Group en preparation evenementielle" />
          <div className="media-badge">
            <Sparkles size={18} aria-hidden="true" />
            <span>Premium execution</span>
          </div>
        </div>
        <div className="about-content">
          <p className="eyebrow">Qui sommes-nous ?</p>
          <h2>
            Un groupe concu <span>pour l'impact</span>.
          </h2>
          <p>
            M Group accompagne les projets qui demandent autant de creativite que de rigueur :
            evenements, relations partenaires, production terrain, suivi financier et memoire
            operationnelle.
          </p>
          <p>
            L'approche est directe : clarifier le besoin, mobiliser les bonnes ressources, securiser
            les validations et mesurer ce qui compte apres chaque action.
          </p>
          <p className="statement-line">Penser haut. Faire juste. Executer fort.</p>
        </div>
      </section>

      <section className="experience-band why-section" aria-label="Experience evenementielle">
        <div>
          <p className="eyebrow">Pourquoi M Group ?</p>
          <h2>Une organisation lisible avant, pendant et apres chaque projet.</h2>
        </div>
        <div className="experience-grid">
          <article>
            <Building2 size={24} aria-hidden="true" />
            <strong>Coordination centrale</strong>
            <span>Un point de pilotage pour les equipes, prestataires et validations.</span>
          </article>
          <article>
            <MapPin size={24} aria-hidden="true" />
            <strong>Suivi terrain</strong>
            <span>Planning, lieux, responsables et checklist consultables rapidement.</span>
          </article>
          <article>
            <MonitorCog size={24} aria-hidden="true" />
            <strong>Tableaux de bord</strong>
            <span>Des vues differentes pour Admin, RH, Commercial, Comptable et futurs profils.</span>
          </article>
        </div>
      </section>

      <section id="prestations" className="content-section public-section">
        <div className="section-heading public-heading">
          <p className="eyebrow">Nos expertises</p>
          <h2>
            4 poles. <span>1 force.</span>
          </h2>
          <p>
            Chaque pole repond a un besoin concret du secteur evenementiel : produire, coordonner,
            vendre, suivre et prouver.
          </p>
        </div>

        <div className="feature-grid public-feature-grid">
          {features.slice(0, 4).map((feature, index) => (
            <article className="feature-card" key={feature.title}>
              <span className="feature-index">{String(index + 1).padStart(2, '0')}</span>
              <div className="feature-media">
                <img src={heroImage} alt="" />
              </div>
              <div className="feature-body">
                <feature.icon size={24} aria-hidden="true" />
                <span>{feature.label}</span>
                <h3>{feature.title}</h3>
                <strong>{feature.metric}</strong>
                <p>{feature.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="trust-section" aria-label="Pourquoi M Group">
        <div className="trust-list">
          {trustItems.map((item) => {
            const Icon = item.icon

            return (
              <article key={item.title}>
                <Icon size={20} aria-hidden="true" />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              </article>
            )
          })}
        </div>
        <div className="mission-card">
          <p className="eyebrow">Notre mission</p>
          <h2>
            Votre ambition.
            <br />
            <span>Notre mission.</span>
          </h2>
          <p>
            Combiner vision artistique, discipline operationnelle et outils digitaux pour garder
            chaque projet lisible jusqu'a la validation finale.
          </p>
          <a className="quote-button" href="#contact">
            Demander un projet
          </a>
        </div>
      </section>

      <section className="numbers-section" aria-label="L'excellence en chiffres">
        <p className="eyebrow">L'excellence en chiffres</p>
        <div className="numbers-grid">
          {publicStats.map((stat) => (
            <article key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section id="methode" className="process-section public-process">
        <div className="section-heading left public-heading">
          <p className="eyebrow">Notre methodologie</p>
          <h2>
            Une execution claire, du brief <span>au rapport final</span>.
          </h2>
          <p>
            Chaque action importante est preparee, attribuee, validee puis historisee pour garder
            un niveau d'execution professionnel.
          </p>
        </div>
        <div className="process-grid public-process-grid">
          {methodSteps.map((step, index) => {
            const Icon = step.icon

            return (
              <article key={step.title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <Icon size={26} aria-hidden="true" />
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section id="plateforme" className="platform-section">
        <div className="platform-copy">
          <p className="eyebrow">Plateforme interne</p>
          <h2>
            Les dashboards gardent chaque metier <span>dans son role</span>.
          </h2>
          <p>
            L'application est pensee pour que chaque profil travaille vite : l'Admin controle,
            la RH affecte, le Commercial suit les clients, le Comptable pilote les budgets.
          </p>
          <button type="button" className="quote-button large" onClick={onOpenAuth}>
            Acceder a Mon Espace
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="platform-module-grid">
          {platformModules.map((module) => {
            const Icon = module.icon

            return (
              <article key={module.title}>
                <Icon size={22} aria-hidden="true" />
                <strong>{module.title}</strong>
                <span>{module.text}</span>
              </article>
            )
          })}
        </div>
      </section>

      <section id="realisations" className="realisations-section">
        <div className="section-heading left public-heading">
          <p className="eyebrow">Realisations phares</p>
          <h2>
            Des missions qui combinent terrain, image <span>et resultats</span>.
          </h2>
        </div>
        <div className="achievement-grid">
          {[
            ['Production', 'Show live et activation de marque', 'Coordination artistique, technique et protocolaire pour une experience premium.'],
            ['Corporate', 'Ceremonie institutionnelle', 'Pilotage des invites, documents, prestataires et validations sensibles.'],
            ['Business', 'Campagne partenaire', 'Suivi des prospects, devis, relances et reporting de performance.'],
            ['RH', 'Equipe terrain', 'Affectations, disponibilites, contrats et historique des missions.'],
            ['Finance', 'Budget evenement', 'Previsionnel, depenses reelles, paiements et alertes de depassement.'],
          ].map(([category, title, text], index) => (
            <article key={title} className={index === 0 ? 'featured' : undefined}>
              <div className="achievement-visual">
                <img src={heroImage} alt="" />
                <span>{category}</span>
              </div>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="gallery-section" aria-label="Moments evenementiels">
        <article className="gallery-large">
          <img src={heroImage} alt="Scene evenementielle M Group" />
        </article>
        <article className="gallery-copy">
          <p className="eyebrow">Experience terrain</p>
          <h2>Le bon niveau d'information au bon moment.</h2>
          <p>
            Preparation technique, validation budgetaire, coordination artistique, suivi client et
            reporting : tout est rassemble pour reduire les oublis et accelerer les decisions.
          </p>
          <a className="secondary-button bordered large" href="#contact">
            Nous contacter
          </a>
        </article>
      </section>

      <section className="partners-section" aria-label="Partenaires">
        <p className="eyebrow">Avec qui nous travaillons</p>
        <h2>
          Nos <span>partenaires</span>
        </h2>
        <div>
          <span>Marques</span>
          <span>Artistes</span>
          <span>Institutions</span>
          <span>Medias</span>
          <span>Prestataires</span>
          <span>Communautes</span>
        </div>
      </section>

      <section className="public-cta">
        <h2>
          Construisons quelque chose
          <br />
          <span>de grand.</span>
        </h2>
        <p>
          Votre projet merite une preparation a la hauteur de votre ambition. Parlons-nous des
          objectifs, des contraintes et du resultat attendu.
        </p>
        <div>
          <a className="quote-button large" href="#contact">
            Demander un devis
          </a>
          <a className="dark-ghost-button large" href={whatsappHref} target="_blank" rel="noreferrer">
            Nous appeler
          </a>
        </div>
      </section>

      <section id="contact" className="split-section access-section contact-section">
        <div className="contact-copy">
          <p className="eyebrow">Demande de devis</p>
          <h2>Parlez-nous de votre projet.</h2>
          <p>
            Une demande claire permet de preparer le bon cadrage : date, lieu, public, budget,
            besoins techniques et niveau d'accompagnement attendu.
          </p>
          <div className="contact-list">
            <a href={whatsappHref} target="_blank" rel="noreferrer">
              <MessageCircle size={20} aria-hidden="true" />
              {whatsappDisplay}
            </a>
            <a href="mailto:contact@mgroup.ci">
              <Mail size={20} aria-hidden="true" />
              contact@mgroup.ci
            </a>
            <span>
              <MapPin size={20} aria-hidden="true" />
              Abidjan, Cote d'Ivoire
            </span>
          </div>
        </div>
        <form className="quote-request-card" onSubmit={openQuoteWhatsApp}>
          <div className="form-grid">
            <label>
              Nom / structure
              <input type="text" placeholder="Votre nom ou entreprise" />
            </label>
            <label>
              Telephone
              <input type="tel" placeholder={whatsappDisplay} />
            </label>
          </div>
          <label>
            Type de prestation
            <select defaultValue="">
              <option value="" disabled>
                Selectionner votre besoin
              </option>
              <option>Production evenementielle</option>
              <option>Pilotage artistique</option>
              <option>Communication / activation</option>
              <option>Gestion complete de projet</option>
            </select>
          </label>
          <label>
            Date souhaitee
            <input type="date" />
          </label>
          <label>
            Details du projet
            <textarea placeholder="Decrivez le lieu, le public, le budget estime et les attentes." />
          </label>
          <button type="submit" className="quote-button full">
            Envoyer sur WhatsApp
          </button>
        </form>
      </section>

      <footer className="footer public-footer">
        <div className="footer-brand-block">
          <strong>M Group</strong>
          <span>Strategie, production, coordination et pilotage interne pour projets a fort impact.</span>
        </div>
        <div className="footer-links">
          <a href="#apropos">A propos</a>
          <a href="#prestations">Expertises</a>
          <a href="#realisations">Realisations</a>
          <a href="#contact">Contact</a>
          <a href={whatsappHref} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          <button type="button" onClick={onOpenAuth}>
            Mon Espace
          </button>
        </div>
        <div className="footer-bottom">
          <span>Copyright © 2026 mgroup</span>
          <span>Desire Kouame AHOU CONCEPTION</span>
        </div>
      </footer>
      <a className="whatsapp-float" href={whatsappHref} target="_blank" rel="noreferrer">
        <MessageCircle size={22} aria-hidden="true" />
        <span className="sr-only">Contacter M Group sur WhatsApp</span>
      </a>
      <a className="back-to-top" href="#accueil" title="Retour en haut">
        <ArrowUp size={20} aria-hidden="true" />
        <span className="sr-only">Retour en haut de la page</span>
      </a>
    </div>
  )
}

function GoogleIdentityButton({ disabled, onClick }) {
  return (
    <button
      type="button"
      className="google-identity-button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Connexion Google"
    >
      G
    </button>
  )
}

function AuthPage({
  authMode,
  initialResetToken,
  isBusy,
  notice,
  onAuthSuccess,
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
  const [passwordFlow, setPasswordFlow] = useState(() => (initialResetToken ? 'reset' : 'login'))
  const [resetNotice, setResetNotice] = useState(() =>
    initialResetToken ? 'Token recu par email. Choisissez votre nouveau mot de passe.' : '',
  )
  const [resetToken, setResetToken] = useState(() => initialResetToken ?? '')
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
          {googleClientId ? (
            <GoogleIdentityButton
              disabled={isBusy}
              onClick={onGmailAccess}
            />
          ) : (
            <button type="button" onClick={onGmailAccess} aria-label="Google">
              G
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onPhoneAccess()
              setPasswordFlow('phone')
              setResetNotice('')
            }}
            aria-label="Telephone"
          >
            <Smartphone size={17} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
        <p className="auth-separator">or:</p>

        {passwordFlow === 'phone' ? (
          <PhoneOtpPanel
            isBusy={isBusy}
            onBack={() => setPasswordFlow('login')}
            onSuccess={onAuthSuccess}
          />
        ) : authMode === 'login' && passwordFlow !== 'login' ? (
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

function PhoneOtpPanel({ isBusy, onBack, onSuccess }) {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [notice, setNotice] = useState('')
  const [developmentOtp, setDevelopmentOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isPhoneBusy, setIsPhoneBusy] = useState(false)

  const requestOtp = async (event) => {
    event.preventDefault()
    setIsPhoneBusy(true)
    setNotice('')
    setDevelopmentOtp('')

    try {
      const result = await api.requestPhoneOtp({ phone })
      setOtpSent(true)
      setDevelopmentOtp(result.developmentOtp ?? '')
      setNotice(
        result.smsDelivered
          ? 'Code envoye par SMS.'
          : `Code genere. SMS non envoye : ${result.smsReason ?? 'verifiez Twilio, le numero destinataire et les permissions pays.'}`,
      )
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsPhoneBusy(false)
    }
  }

  const verifyOtp = async (event) => {
    event.preventDefault()
    setIsPhoneBusy(true)
    setNotice('')

    try {
      const result = await api.verifyPhoneOtp({ phone, code, rememberMe })
      onSuccess(result)
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsPhoneBusy(false)
    }
  }

  return (
    <form className="auth-form clean" onSubmit={otpSent ? verifyOtp : requestOtp}>
      {/* Connexion par telephone : l'OTP est valide cote backend avant de creer la session. */}
      {notice && <p className="auth-notice">{notice}</p>}
      <label>
        Telephone
        <input
          name="phone"
          type="tel"
          placeholder="+225 00 00 00 00 00"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </label>
      {otpSent && (
        <label>
          Code OTP
          <input
            name="code"
            type="text"
            inputMode="numeric"
            placeholder="123456"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </label>
      )}
      {developmentOtp && <p className="auth-dev-token">Code test : {developmentOtp}</p>}
      {otpSent && (
        <label className="check-row">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          Remember me
        </label>
      )}
      <div className="setup-actions">
        <button type="button" className="secondary-button bordered" onClick={onBack}>
          Retour
        </button>
        <button type="submit" className="primary-button" disabled={isBusy || isPhoneBusy}>
          {otpSent ? 'Verifier le code' : 'Recevoir le code'}
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
              <p className="eyebrow">Administrateur</p>
              <h2>Renseigner les informations du patron.</h2>
              <p>
                Ce compte deviendra le premier Admin et devra changer son mot de passe apres
                connexion.
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
                    <input name="adminLastName" type="text" placeholder="Nom" required />
                  </label>
                  <label>
                    Prenom(s)
                    <input name="adminFirstName" type="text" placeholder="Prenom(s)" required />
                  </label>
                  <label>
                    Adresse
                    <input name="adminAddress" type="text" placeholder="Adresse" required />
                  </label>
                  <label>
                    Contact
                    <input name="adminPhone" type="tel" placeholder="+225 00 00 00 00 00" required />
                  </label>
                  <label>
                    Email
                    <input name="adminEmail" type="email" placeholder="admin@mgroup.ci" required />
                  </label>
                  <label>
                    Mot de passe
                    <input name="adminPassword" type="password" minLength="10" required />
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
                  {isSubmitting ? 'Enregistrement...' : 'Terminer la configuration'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  )
}

function TwoFactorLoginPage({ isBusy, notice, onBack, onSubmit }) {
  return (
    <section className="auth-page" aria-label="Verification 2FA">
      {/* Challenge 2FA : aucun cookie de session n'est pose tant que le code n'est pas valide. */}
      <form className="auth-card auth-form clean" onSubmit={onSubmit}>
        <div className="auth-logo-frame">
          <img src="/mgroup-logo.svg" alt="Logo M Group" />
        </div>
        <p className="eyebrow">Securite Admin</p>
        <h1>Code de verification.</h1>
        <p className="auth-lead">
          Ouvrez votre application d'authentification et saisissez le code a 6 chiffres.
        </p>
        {notice && <p className="auth-notice">{notice}</p>}
        <label>
          Code 2FA
          <input name="code" type="text" inputMode="numeric" minLength="6" required />
        </label>
        <label className="check-row">
          <input name="rememberMe" type="checkbox" />
          Remember me
        </label>
        <div className="setup-actions">
          <button type="button" className="secondary-button bordered" onClick={onBack}>
            Retour
          </button>
          <button type="submit" className="primary-button" disabled={isBusy}>
            {isBusy ? 'Verification...' : 'Valider'}
          </button>
        </div>
      </form>
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
  onInterfacePreferencesUpdate,
  onProfileUpdate,
  onRequestLogout,
  preferences,
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
  const [notificationCount, setNotificationCount] = useState(0)
  const audioContextRef = useRef(null)
  const soundTimeoutRef = useRef(null)
  const didLoadPendingRef = useRef(false)
  const previousPendingCountRef = useRef(0)
  const didLoadNotificationsRef = useRef(false)
  const previousNotificationCountRef = useRef(0)
  const roleKey = useMemo(() => user.roleValues.join('|'), [user.roleValues])
  const isAdmin = user.roleValues.includes('ADMIN')
  const activePreferences = normalizeInterfacePreferences(preferences ?? user.interfacePreference)
  const panelIds = useMemo(() => getDashboardPanelIds(user.roleValues), [user.roleValues])
  const activePanelId = panelIds.includes(activePanel) ? activePanel : panelIds[0]
  const dashboardStyle = {
    '--primary-color': activePreferences.primaryColor,
    '--accent-color': activePreferences.accentColor,
  }
  const dashboardClassName = [
    'admin-layout',
    `dashboard-theme-${activePreferences.theme}`,
    `dashboard-density-${activePreferences.density}`,
    `dashboard-sidebar-${activePreferences.sidebarStyle}`,
    activePreferences.navigation.compactSidebar ? 'dashboard-sidebar-compact' : '',
    activePreferences.navigation.showIcons ? '' : 'dashboard-icons-hidden',
    activePreferences.navigation.stickyHeader ? 'dashboard-sticky-header' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const dashboardIdentity = useMemo(() => {
    if (isAdmin) {
      return {
        ariaLabel: 'Dashboard Admin M Group',
        brand: 'Le Boss Molare',
        sidebarLabel: 'Le Boss',
        sidebarName: 'Molare',
      }
    }

    if (user.roleValues.includes('RH')) {
      return {
        ariaLabel: 'Dashboard RH M Group',
        brand: 'M Group RH',
        sidebarLabel: 'Espace',
        sidebarName: 'RH',
      }
    }

    return {
      ariaLabel: `Dashboard ${user.role}`,
      brand: `M Group ${user.role}`,
      sidebarLabel: 'M Group',
      sidebarName: user.role,
    }
  }, [isAdmin, user.role, user.roleValues])

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

  // Le compteur de notifications est rafraichi regulierement pour declencher la cloche sonore.
  useEffect(() => {
    let isMounted = true

    const loadNotificationCount = async () => {
      try {
        const result = await api.getNotificationCount()

        if (!isMounted) {
          return
        }

        const nextCount = result.count ?? 0
        setNotificationCount(nextCount)

        if (!didLoadNotificationsRef.current) {
          didLoadNotificationsRef.current = true
          previousNotificationCountRef.current = nextCount
          return
        }

        if (nextCount > previousNotificationCountRef.current) {
          playAdminSound('Nouvelle notification')
        }

        previousNotificationCountRef.current = nextCount
      } catch {
        if (isMounted) {
          setNotificationCount(0)
        }
      }
    }

    loadNotificationCount()
    const intervalId = window.setInterval(loadNotificationCount, 30000)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [playAdminSound, roleKey])

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
    <section className={dashboardClassName} style={dashboardStyle} aria-label={dashboardIdentity.ariaLabel}>
      {/* Sidebar dashboard : navigation principale toujours visible a gauche. */}
      <aside className="admin-sidebar" aria-label="Menu dashboard">
        <div className="sidebar-logo">
          <img src="/mgroup-logo.svg" alt="Logo M Group" />
        </div>
        <div className="sidebar-project">
          <span>{dashboardIdentity.sidebarLabel}</span>
          <strong>{dashboardIdentity.sidebarName}</strong>
        </div>
        <nav className="sidebar-menu">
          {panelIds.map((panelId) => {
            const panel = dashboardPanelCatalog[panelId]
            const Icon = panel.icon

            return (
              <button
                type="button"
                className={activePanelId === panelId ? 'active' : ''}
                key={panelId}
                onClick={() => setActivePanel(panelId)}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{interfaceText(activePreferences, panelId) ?? panel.label}</span>
              </button>
            )
          })}
          <button type="button" onClick={onRequestLogout}>
            <LogOut size={17} aria-hidden="true" />
            <span>{interfaceText(activePreferences, 'logout')}</span>
          </button>
        </nav>
      </aside>

      <section className="dashboard-shell admin-main">
        <header className="dashboard-header admin-topbar">
          <a className="brand dark dashboard-brand" href="#dashboard" aria-label={dashboardIdentity.ariaLabel}>
            <span className="dashboard-logo">
              <img src="/mgroup-logo.svg" alt="" />
            </span>
            <span>{dashboardIdentity.brand}</span>
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
              {interfaceText(activePreferences, 'sound')}
            </button>
            <button type="button" className="secondary-button bordered" onClick={onGoHome}>
              <Home size={17} aria-hidden="true" />
              {interfaceText(activePreferences, 'home')}
            </button>
            <button type="button" className="danger-button" onClick={onRequestLogout}>
              <LogOut size={17} aria-hidden="true" />
              {interfaceText(activePreferences, 'logout')}
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
            <p className="welcome-message">{interfaceText(activePreferences, 'welcome')}</p>
          </div>
          {lastLoginAt && (
            <p className="last-login-inline">
              Derniere connexion : {formatDashboardDateTime(lastLoginAt, activePreferences)}
            </p>
          )}
        </section>

        {activePanelId === 'settings' ? (
          <SettingsPanel
            user={user}
            onAdminEvent={playAdminSound}
            onCompanyUpdate={onCompanyUpdate}
            onInterfacePreferencesUpdate={onInterfacePreferencesUpdate}
            onProfileUpdate={onProfileUpdate}
            onRequestLogout={onRequestLogout}
            preferences={activePreferences}
          />
        ) : activePanelId === 'validation' ? (
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
        ) : activePanelId === 'workflows' ? (
          <WorkflowPage onWorkflowEvent={playAdminSound} user={user} />
        ) : activePanelId === 'events' ? (
          <EventsPage user={user} />
        ) : activePanelId === 'commercial' ? (
          <CommercialPage user={user} />
        ) : activePanelId === 'finance' ? (
          <FinancePage isAdmin={isAdmin} />
        ) : activePanelId === 'team' ? (
          <TeamPage onHrEvent={playAdminSound} pendingCount={pendingUsers.length} user={user} />
        ) : activePanelId === 'budget' ? (
          <BudgetPage />
        ) : activePanelId === 'documents' ? (
          <DocumentsPage isAdmin={isAdmin} />
        ) : activePanelId === 'reports' ? (
          <ReportsPage />
        ) : activePanelId === 'alerts' ? (
          <AlertsPage
            notificationCount={notificationCount}
            onNotificationsChanged={setNotificationCount}
            onTestSound={() => playAdminSound('Test alerte sonore')}
            onToggleSound={toggleSound}
            soundEnabled={soundEnabled}
          />
        ) : (
          <RoleOverviewPage
            dashboardError={dashboardError}
            isAdmin={isAdmin}
            notificationCount={notificationCount}
            onOpenPanel={setActivePanel}
            pendingUsers={pendingUsers}
            preferences={activePreferences}
            user={user}
          />
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

function RoleOverviewPage({
  dashboardError,
  isAdmin,
  notificationCount,
  onOpenPanel,
  pendingUsers,
  preferences,
  user,
}) {
  const [overview, setOverview] = useState({
    commercial: null,
    documents: null,
    events: [],
    finance: null,
    hr: null,
    reports: null,
    workflows: [],
  })
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const activePreferences = normalizeInterfacePreferences(preferences)
  const visibleWidgets = activePreferences.widgets
  const isRh = user.roleValues.includes('RH')
  const isCommercial = user.roleValues.includes('COMMERCIAL')
  const isComptable = user.roleValues.includes('COMPTABLE')
  const isSecretaire = user.roleValues.includes('SECRETAIRE')
  const canEvents = isAdmin || isRh || isCommercial || isComptable || isSecretaire
  const canWorkflows = isAdmin || isRh || isCommercial || isComptable
  const canCommercial = isAdmin || user.roleValues.includes('COMMERCIAL') || user.roleValues.includes('COMPTABLE')
  const canFinance = isAdmin || isComptable
  const canDocuments =
    isAdmin ||
    user.roleValues.includes('RH') ||
    user.roleValues.includes('COMMERCIAL') ||
    user.roleValues.includes('COMPTABLE')
  const canReports = isAdmin || user.roleValues.includes('COMMERCIAL') || user.roleValues.includes('COMPTABLE')

  useEffect(() => {
    let isMounted = true
    const requests = [
      canEvents ? api.getEvents().catch(() => []) : Promise.resolve([]),
      canWorkflows ? api.getWorkflows().catch(() => []) : Promise.resolve([]),
      canFinance ? api.getFinanceSummary().catch(() => null) : Promise.resolve(null),
      isAdmin || isRh ? api.getHrOverview().catch(() => null) : Promise.resolve(null),
      canCommercial ? api.getCommercialOverview().catch(() => null) : Promise.resolve(null),
      canDocuments ? api.getDocumentsOverview().catch(() => null) : Promise.resolve(null),
      canReports ? api.getReportsSummary().catch(() => null) : Promise.resolve(null),
    ]

    Promise.all(requests)
      .then(([events, workflows, finance, hr, commercial, documents, reports]) => {
        if (!isMounted) {
          return
        }

        setOverview({ commercial, documents, events, finance, hr, reports, workflows })
      })
      .catch((error) => {
        if (isMounted) {
          setNotice(error.message)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [canCommercial, canDocuments, canEvents, canFinance, canReports, canWorkflows, isAdmin, isRh, user.roleValues])

  const pendingAdminWorkflows = overview.workflows.filter(
    (workflow) => workflow.status === 'PENDING_ADMIN',
  )
  const pendingBudgetWorkflows = overview.workflows.filter((workflow) => workflow.status === 'PENDING_BUDGET')
  const pendingRhWorkflows = overview.workflows.filter((workflow) => workflow.status === 'PENDING_RH')
  const activeWorkflowStatuses = ['PENDING_BUDGET', 'PENDING_RH', 'PENDING_ADMIN']
  const activeCommercialWorkflows = overview.workflows.filter((workflow) =>
    activeWorkflowStatuses.includes(workflow.status),
  )
  const commercialPipeline = overview.commercial?.pipeline ?? []
  const maxPipelineCount = Math.max(...commercialPipeline.map((stage) => stage.count), 1)
  const pendingQuotes = (overview.commercial?.quotes ?? []).filter((quote) =>
    ['DRAFT', 'SENT'].includes(quote.status),
  )
  const eventBars = overview.events.length
    ? overview.events.slice(0, 12).map((event, index) => 30 + ((index + event.title.length) % 9) * 7)
    : [36, 54, 42, 68, 48, 76, 58, 71]
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcomingEvents = overview.events
    .filter((event) => {
      const startDate = dateFromValue(event.startsAt)
      return startDate && !Number.isNaN(startDate.getTime()) && startDate >= today
    })
    .sort((firstEvent, secondEvent) => new Date(firstEvent.startsAt) - new Date(secondEvent.startsAt))
    .slice(0, 5)
  const activeEventsCount = overview.events.filter(
    (event) => !['COMPLETED', 'CANCELLED'].includes(event.status),
  ).length
  const financeTotals = overview.finance?.totals ?? {}
  const plannedBudgetFcfa = financeTotals.plannedBudgetFcfa ?? 0
  const approvedBudgetFcfa = financeTotals.approvedBudgetFcfa ?? 0
  const actualExpensesFcfa = financeTotals.actualExpensesFcfa ?? 0
  const pendingPaymentsFcfa = financeTotals.pendingPaymentsFcfa ?? 0
  const overBudgetFcfa = financeTotals.overBudgetFcfa ?? 0
  const budgetReferenceFcfa = approvedBudgetFcfa || plannedBudgetFcfa
  const budgetConsumptionRate = budgetReferenceFcfa
    ? clampPercent((actualExpensesFcfa / budgetReferenceFcfa) * 100)
    : 0
  const remainingBudgetFcfa = Math.max(budgetReferenceFcfa - actualExpensesFcfa, 0)
  const completedEventsCount =
    overview.reports?.totals.completedEvents ??
    overview.events.filter((event) => event.status === 'COMPLETED').length
  const pendingDocumentsCount = overview.documents?.totals.pendingValidation ?? 0
  const activeUsersCount = overview.reports?.totals.activeUsers ?? overview.hr?.totals.personnel ?? 0
  const securityScore = [
    user.twoFactorEnabled,
    Boolean(user.emailVerifiedAt),
    Boolean(user.lastPasswordChangedAt),
  ].filter(Boolean).length
  const adminPriorityItems = [
    {
      title: 'Inscriptions a valider',
      count: pendingUsers.length,
      detail: `${pendingUsers.length} demande(s) en attente`,
      icon: ClipboardCheck,
      panel: 'validation',
      tone: pendingUsers.length ? 'urgent' : 'ok',
      visible: true,
    },
    {
      title: 'Workflows Admin',
      count: pendingAdminWorkflows.length,
      detail: `${pendingAdminWorkflows.length} decision(s) a prendre`,
      icon: Layers,
      panel: 'workflows',
      tone: pendingAdminWorkflows.length ? 'warning' : 'ok',
      visible: visibleWidgets.workflows,
    },
    {
      title: 'Budgets sensibles',
      count: overview.finance?.alerts.length ?? 0,
      detail: `${formatFcfa(overBudgetFcfa)} de depassement`,
      icon: AlertTriangle,
      panel: 'budget',
      tone: overview.finance?.alerts.length ? 'danger' : 'ok',
      visible: visibleWidgets.budget,
    },
    {
      title: 'Documents a valider',
      count: pendingDocumentsCount,
      detail: `${pendingDocumentsCount} document(s) en attente`,
      icon: FileText,
      panel: 'documents',
      tone: pendingDocumentsCount ? 'warning' : 'ok',
      visible: visibleWidgets.documents,
    },
  ]
  const eventStatusSummary = eventStatusOptions.map((statusOption) => ({
    ...statusOption,
    count: overview.events.filter((event) => event.status === statusOption.value).length,
  }))
  const maxEventStatusCount = Math.max(...eventStatusSummary.map((status) => status.count), 1)
  // Flux d'activite agrege pour que l'Admin voie les prochaines decisions sans changer de page.
  const adminActivityItems = [
    ...pendingUsers.slice(0, 2).map((pendingUser) => ({
      title: userDisplayName(pendingUser),
      meta: 'Nouvelle inscription',
      panel: 'validation',
    })),
    ...pendingAdminWorkflows.slice(0, 2).map((workflow) => ({
      title: workflow.title ?? workflow.event?.title ?? 'Workflow a valider',
      meta: workflowStatusLabel(workflow.status),
      panel: 'workflows',
    })),
    ...(overview.finance?.alerts ?? []).slice(0, 2).map((alert) => ({
      title: alert.title,
      meta: `Depassement : ${formatFcfa(Math.max((alert.actualExpensesFcfa ?? 0) - (alert.limitFcfa ?? 0), 0))}`,
      panel: 'budget',
    })),
    ...(overview.documents?.documents ?? [])
      .filter((document) => document.status === 'PENDING_VALIDATION')
      .slice(0, 2)
      .map((document) => ({
        title: document.label,
        meta: businessDocumentStatusLabel(document.status),
        panel: 'documents',
      })),
  ].slice(0, 6)
  const passwordChangedAt = dateFromValue(user.lastPasswordChangedAt)
  const formattedPasswordChangedAt =
    passwordChangedAt && !Number.isNaN(passwordChangedAt.getTime())
      ? formatDashboardDate(passwordChangedAt, activePreferences)
      : 'A definir'
  const lastLoginDate = dateFromValue(user.lastLoginAt)
  const formattedLastLogin =
    lastLoginDate && !Number.isNaN(lastLoginDate.getTime())
      ? formatDashboardDateTime(lastLoginDate, activePreferences)
      : 'Non disponible'
  const rhPriorityItems = [
    {
      title: 'Personnel disponible',
      count: overview.hr?.totals.available ?? 0,
      detail: `${overview.hr?.totals.personnel ?? 0} profil(s) RH suivis`,
      icon: UserCheck,
      panel: 'team',
      tone: 'ok',
      visible: visibleWidgets.hr,
    },
    {
      title: 'Affectations RH',
      count: pendingRhWorkflows.length,
      detail: 'Demandes qui attendent une affectation',
      icon: Layers,
      panel: 'workflows',
      tone: pendingRhWorkflows.length ? 'warning' : 'ok',
      visible: visibleWidgets.workflows,
    },
    {
      title: 'Missions a venir',
      count: overview.hr?.totals.missionsUpcoming ?? 0,
      detail: 'Planning equipe et terrain',
      icon: CalendarDays,
      panel: 'team',
      tone: 'urgent',
      visible: visibleWidgets.hr,
    },
    {
      title: 'Documents RH',
      count: overview.documents?.totals.pendingValidation ?? 0,
      detail: 'Pieces administratives a surveiller',
      icon: FileText,
      panel: 'documents',
      tone: pendingDocumentsCount ? 'warning' : 'ok',
      visible: visibleWidgets.documents,
    },
  ]
  const commercialPriorityItems = [
    {
      title: 'Prospects ouverts',
      count: overview.commercial?.totals.prospects ?? 0,
      detail: 'Clients en discussion ou nouveaux',
      icon: UserPlus,
      panel: 'commercial',
      tone: 'urgent',
      visible: visibleWidgets.clients,
    },
    {
      title: 'Demandes actives',
      count: overview.commercial?.totals.openRequests ?? 0,
      detail: 'Prestations a qualifier',
      icon: ClipboardCheck,
      panel: 'commercial',
      tone: overview.commercial?.totals.openRequests ? 'warning' : 'ok',
      visible: visibleWidgets.clients,
    },
    {
      title: 'Devis en cours',
      count: pendingQuotes.length,
      detail: 'Brouillons ou devis envoyes',
      icon: FileText,
      panel: 'commercial',
      tone: pendingQuotes.length ? 'warning' : 'ok',
      visible: visibleWidgets.clients,
    },
    {
      title: 'CA gagne',
      count: formatFcfa(overview.commercial?.totals.revenueFcfa ?? 0),
      detail: `${overview.commercial?.totals.acceptedQuotes ?? 0} devis accepte(s)`,
      icon: Trophy,
      panel: 'reports',
      tone: 'ok',
      visible: visibleWidgets.reports,
    },
  ]
  const comptablePriorityItems = [
    {
      title: 'Budgets a chiffrer',
      count: pendingBudgetWorkflows.length,
      detail: 'Workflows qui attendent le Comptable',
      icon: Layers,
      panel: 'workflows',
      tone: pendingBudgetWorkflows.length ? 'urgent' : 'ok',
      visible: visibleWidgets.workflows,
    },
    {
      title: 'Budget valide',
      count: formatFcfa(approvedBudgetFcfa),
      detail: `${budgetConsumptionRate}% deja consomme`,
      icon: Banknote,
      panel: 'budget',
      tone: 'ok',
      visible: visibleWidgets.budget,
    },
    {
      title: 'Paiements a suivre',
      count: formatFcfa(pendingPaymentsFcfa),
      detail: 'Echeances et references',
      icon: Wallet,
      panel: 'finance',
      tone: pendingPaymentsFcfa ? 'warning' : 'ok',
      visible: visibleWidgets.finance,
    },
    {
      title: 'Depassements',
      count: overview.finance?.alerts.length ?? 0,
      detail: `${formatFcfa(overBudgetFcfa)} hors limite`,
      icon: AlertTriangle,
      panel: 'budget',
      tone: overview.finance?.alerts.length ? 'danger' : 'ok',
      visible: visibleWidgets.budget,
    },
  ]

  if (isRh && !isAdmin) {
    return (
      <section className="role-overview">
        <OverviewHero
          eyebrow="Dashboard RH"
          title="Pilotage RH operationnel."
          description="Suivez les disponibilites, dossiers du personnel, affectations et workflows RH depuis une vue claire."
        />
        {notice && <p className="auth-notice">{notice}</p>}
        <section className="admin-command-strip role-priority-strip" aria-label="Priorites RH">
          {rhPriorityItems
            .filter((item) => item.visible !== false)
            .map((item) => (
              <AdminPriorityCard item={item} key={item.title} onClick={() => onOpenPanel(item.panel)} />
            ))}
        </section>
      <OverviewKpis
        cards={[
            { label: 'Personnel actif', value: overview.hr?.totals.personnel ?? 0, icon: Users, tone: 'blue', visible: visibleWidgets.hr },
            { label: 'Disponibles', value: overview.hr?.totals.available ?? 0, icon: UserCheck, tone: 'cyan', visible: visibleWidgets.hr },
            {
              label: 'Workflows RH',
              value: pendingRhWorkflows.length,
              icon: Layers,
              tone: 'yellow',
              visible: visibleWidgets.workflows,
            },
            { label: 'Alertes', value: notificationCount, icon: Bell, tone: 'coral', visible: visibleWidgets.alerts },
          ]}
        />
        <section className="role-action-grid" aria-label="Actions rapides RH">
          <RoleActionCard
            icon={Users}
            visible={visibleWidgets.hr}
            title="Dossiers du personnel"
            text="Disponibilites, contrats, documents administratifs et missions."
            onClick={() => onOpenPanel('team')}
          />
          <RoleActionCard
            icon={Layers}
            visible={visibleWidgets.workflows}
            title="Affectations a traiter"
            text={`${pendingRhWorkflows.length} demande(s) attendent une affectation RH.`}
            onClick={() => onOpenPanel('workflows')}
          />
          <RoleActionCard
            icon={CalendarDays}
            visible={visibleWidgets.events}
            title="Evenements"
            text={`${overview.events.length} evenement(s) visibles pour organiser les equipes.`}
            onClick={() => onOpenPanel('events')}
          />
          <RoleActionCard
            icon={FileText}
            visible={visibleWidgets.documents}
            title="Documents RH"
            text={`${overview.documents?.totals.pendingValidation ?? 0} document(s) attendent une validation.`}
            onClick={() => onOpenPanel('documents')}
          />
        </section>
        {visibleWidgets.hr && (
          <section className="analytics-grid" aria-label="Synthese RH">
            <article className="chart-panel wide">
              <div className="panel-heading">
                <strong>Disponibilite du personnel</strong>
                <span>{isLoading ? 'Chargement...' : 'Vue temps reel'}</span>
              </div>
              <div className="availability-strip" aria-hidden="true">
                {(overview.hr?.staff ?? []).slice(0, 10).map((staff) => (
                  <span
                    className={(staff.profile?.availability ?? 'AVAILABLE').toLowerCase()}
                    key={staff.id}
                    title={userDisplayName(staff)}
                  ></span>
                ))}
              </div>
              <ul className="compact-list">
                {(overview.hr?.staff ?? []).slice(0, 5).map((staff) => (
                  <li key={staff.id}>
                    <span>{userDisplayName(staff)}</span>
                    <strong>{staffAvailabilityLabel(staff.profile?.availability ?? 'AVAILABLE')}</strong>
                  </li>
                ))}
                {!overview.hr?.staff?.length && <li>Aucun personnel charge.</li>}
              </ul>
            </article>
            <article className="chart-panel compact">
              <div className="panel-heading">
                <strong>Missions</strong>
                <span>A venir</span>
              </div>
              <div className="donut-chart rh" aria-hidden="true"></div>
              <strong className="overview-big-number">{overview.hr?.totals.missionsUpcoming ?? 0}</strong>
            </article>
          </section>
        )}
      </section>
    )
  }

  if (isCommercial && !isAdmin) {
    return (
      <section className="role-overview">
        <OverviewHero
          eyebrow="Dashboard Commercial"
          title="Clients, prestations et devis."
          description="Pilotez vos prospects, demandes de prestations, devis et relances commerciales sans les outils reserves a l'Admin."
        />
        {notice && <p className="auth-notice">{notice}</p>}
        <section className="admin-command-strip role-priority-strip" aria-label="Priorites Commercial">
          {commercialPriorityItems
            .filter((item) => item.visible !== false)
            .map((item) => (
              <AdminPriorityCard item={item} key={item.title} onClick={() => onOpenPanel(item.panel)} />
            ))}
        </section>
      <OverviewKpis
        cards={[
            { label: 'Clients', value: overview.commercial?.totals.clients ?? 0, icon: Users, tone: 'blue', visible: visibleWidgets.clients },
            { label: 'Prospects ouverts', value: overview.commercial?.totals.prospects ?? 0, icon: UserPlus, tone: 'cyan', visible: visibleWidgets.clients },
            {
              label: 'Demandes actives',
              value: overview.commercial?.totals.openRequests ?? 0,
              icon: ClipboardCheck,
              tone: 'yellow',
              visible: visibleWidgets.workflows,
            },
            {
              label: 'CA gagne',
              value: formatFcfa(overview.commercial?.totals.revenueFcfa ?? 0),
              icon: Wallet,
              tone: 'coral',
              visible: visibleWidgets.reports,
            },
          ]}
        />

        {(visibleWidgets.clients || visibleWidgets.reports) && (
          <section className="analytics-grid" aria-label="Pilotage commercial">
            {visibleWidgets.clients && (
              <article className="chart-panel wide">
                <div className="panel-heading">
                  <strong>Pipeline commercial</strong>
                  <span>
                    {isLoading ? 'Chargement...' : `${overview.commercial?.totals.prospects ?? 0} prospect(s)`}
                  </span>
                </div>
                <div className="report-bars commercial-pipeline-bars">
                  {commercialPipeline.map((stage) => (
                    <article key={stage.status}>
                      <span>{commercialStatusLabel(stage.status)}</span>
                      <div>
                        <i style={{ '--bar-width': `${Math.max((stage.count / maxPipelineCount) * 100, 8)}%` }}></i>
                      </div>
                      <strong>{stage.count}</strong>
                      <small>{stage.status}</small>
                    </article>
                  ))}
                  {commercialPipeline.length === 0 && <p>Aucun pipeline charge.</p>}
                </div>
              </article>
            )}
            {visibleWidgets.reports && (
              <article className="chart-panel compact">
                <div className="panel-heading">
                  <strong>Devis</strong>
                  <span>Performance</span>
                </div>
                <div className="donut-chart commercial" aria-hidden="true"></div>
                <ul className="compact-list">
                  <li>
                    <span>Acceptes</span>
                    <strong>{overview.commercial?.totals.acceptedQuotes ?? 0}</strong>
                  </li>
                  <li>
                    <span>En cours</span>
                    <strong>{pendingQuotes.length}</strong>
                  </li>
                  <li>
                    <span>Alertes</span>
                    <strong>{notificationCount}</strong>
                  </li>
                </ul>
              </article>
            )}
          </section>
        )}

        {visibleWidgets.clients && <section className="business-dashboard-grid" aria-label="Suivi commercial recent">
          <article className="settings-card">
            <div className="settings-panel-heading">
              <div>
                <p className="eyebrow">Demandes de prestations</p>
                <h2>A suivre.</h2>
              </div>
            </div>
            <ul className="compact-list">
              {(overview.commercial?.requests ?? []).slice(0, 5).map((request) => (
                <li key={request.id}>
                  <span>{request.client?.name ?? 'Client'}</span>
                  <strong>{request.title}</strong>
                </li>
              ))}
              {!overview.commercial?.requests?.length && <li>Aucune demande de prestation.</li>}
            </ul>
          </article>
          <article className="settings-card">
            <div className="settings-panel-heading">
              <div>
                <p className="eyebrow">Devis recents</p>
                <h2>Montants et statuts.</h2>
              </div>
            </div>
            <ul className="compact-list">
              {(overview.commercial?.quotes ?? []).slice(0, 5).map((quote) => (
                <li key={quote.id}>
                  <span>{quoteStatusLabel(quote.status)} - {quote.client?.name ?? 'Client'}</span>
                  <strong>{formatFcfa(quote.amountFcfa)}</strong>
                </li>
              ))}
              {!overview.commercial?.quotes?.length && <li>Aucun devis commercial.</li>}
            </ul>
          </article>
        </section>}

        <section className="role-action-grid" aria-label="Actions rapides Commercial">
          <RoleActionCard
            icon={UserPlus}
            visible={visibleWidgets.clients}
            title="Ajouter un client"
            text="Creez un prospect, renseignez ses contacts et suivez son statut commercial."
            onClick={() => onOpenPanel('commercial')}
          />
          <RoleActionCard
            icon={ClipboardCheck}
            visible={visibleWidgets.clients}
            title="Creer une prestation"
            text={`${overview.commercial?.totals.openRequests ?? 0} demande(s) active(s) dans le pipeline.`}
            onClick={() => onOpenPanel('commercial')}
          />
          <RoleActionCard
            icon={Layers}
            visible={visibleWidgets.workflows}
            title="Suivre les workflows"
            text={`${activeCommercialWorkflows.length} workflow(s) en cours de budget, RH ou validation.`}
            onClick={() => onOpenPanel('workflows')}
          />
          <RoleActionCard
            icon={FileText}
            visible={visibleWidgets.documents}
            title="Documents commerciaux"
            text={`${overview.documents?.totals.documents ?? 0} document(s), devis, contrats ou factures classes.`}
            onClick={() => onOpenPanel('documents')}
          />
          <RoleActionCard
            icon={Activity}
            visible={visibleWidgets.reports}
            title="Rapports"
            text={`${overview.reports?.commercialPerformance.acceptedQuotes ?? 0} devis accepte(s) sur la periode.`}
            onClick={() => onOpenPanel('reports')}
          />
          <RoleActionCard
            icon={Bell}
            visible={visibleWidgets.alerts}
            title="Alertes"
            text={`${notificationCount} notification(s) a consulter pour vos actions commerciales.`}
            onClick={() => onOpenPanel('alerts')}
          />
        </section>
      </section>
    )
  }

  if (isComptable && !isAdmin) {
    return (
      <section className="role-overview">
        <OverviewHero
          eyebrow="Dashboard Comptable"
          title="Tresorerie et budgets."
          description="Suivez les budgets a chiffrer, les depenses reelles, les paiements et les documents financiers."
        />
        {notice && <p className="auth-notice">{notice}</p>}
        <section className="admin-command-strip role-priority-strip" aria-label="Priorites Comptable">
          {comptablePriorityItems
            .filter((item) => item.visible !== false)
            .map((item) => (
              <AdminPriorityCard item={item} key={item.title} onClick={() => onOpenPanel(item.panel)} />
            ))}
        </section>
        <OverviewKpis
          cards={[
            {
              label: 'Budget previsionnel',
              value: formatFcfa(plannedBudgetFcfa),
              icon: Banknote,
              tone: 'blue',
              visible: visibleWidgets.budget,
            },
            {
              label: 'Budget valide',
              value: formatFcfa(approvedBudgetFcfa),
              icon: CheckCircle2,
              tone: 'cyan',
              visible: visibleWidgets.budget,
            },
            {
              label: 'Paiements en attente',
              value: formatFcfa(pendingPaymentsFcfa),
              icon: Wallet,
              tone: 'yellow',
              visible: visibleWidgets.finance,
            },
            {
              label: 'Alertes budget',
              value: overview.finance?.alerts.length ?? 0,
              icon: AlertTriangle,
              tone: 'coral',
              visible: visibleWidgets.alerts,
            },
          ]}
        />

        {(visibleWidgets.finance || visibleWidgets.budget) && (
          <section className="analytics-grid" aria-label="Pilotage comptable">
            <article className="chart-panel wide">
              <div className="panel-heading">
                <div>
                  <strong>Consommation budgetaire</strong>
                  <span>{budgetConsumptionRate}% du budget valide consomme</span>
                </div>
                <button type="button" className="panel-link-button" onClick={() => onOpenPanel('finance')}>
                  Tresorerie
                </button>
              </div>
              <div className="budget-progress finance-large-progress" aria-hidden="true">
                <span style={{ '--progress': `${budgetConsumptionRate}%` }}></span>
              </div>
              <ul className="compact-list budget-health-list">
                <li>
                  <span>Depenses reelles</span>
                  <strong>{formatFcfa(actualExpensesFcfa)}</strong>
                </li>
                <li>
                  <span>Reste disponible</span>
                  <strong>{formatFcfa(remainingBudgetFcfa)}</strong>
                </li>
                <li>
                  <span>Depassement</span>
                  <strong>{formatFcfa(overBudgetFcfa)}</strong>
                </li>
              </ul>
            </article>
            <article className="chart-panel compact">
              <div className="panel-heading">
                <div>
                  <strong>Workflows budget</strong>
                  <span>Actions Comptable</span>
                </div>
              </div>
              <div className="donut-chart budget" aria-hidden="true"></div>
              <strong className="overview-big-number">{pendingBudgetWorkflows.length}</strong>
              <p className="budget-health-label">demande(s) attendent un chiffrage</p>
            </article>
          </section>
        )}

        <section className="role-action-grid" aria-label="Actions rapides Comptable">
          <RoleActionCard
            icon={Wallet}
            visible={visibleWidgets.finance}
            title="Saisir depenses et paiements"
            text={`${formatFcfa(pendingPaymentsFcfa)} en paiements a suivre.`}
            onClick={() => onOpenPanel('finance')}
          />
          <RoleActionCard
            icon={Banknote}
            visible={visibleWidgets.budget}
            title="Surveiller les budgets"
            text={`${overview.finance?.alerts.length ?? 0} budget(s) au-dessus de la limite.`}
            onClick={() => onOpenPanel('budget')}
          />
          <RoleActionCard
            icon={Layers}
            visible={visibleWidgets.workflows}
            title="Chiffrer les workflows"
            text={`${pendingBudgetWorkflows.length} workflow(s) attendent un budget.`}
            onClick={() => onOpenPanel('workflows')}
          />
          <RoleActionCard
            icon={FileText}
            visible={visibleWidgets.documents}
            title="Documents financiers"
            text={`${overview.documents?.totals.documents ?? 0} devis, factures ou recus classes.`}
            onClick={() => onOpenPanel('documents')}
          />
          <RoleActionCard
            icon={Activity}
            visible={visibleWidgets.reports}
            title="Rapports financiers"
            text={`${formatFcfa(overview.reports?.totals.consumedBudgetFcfa ?? 0)} de budget consomme.`}
            onClick={() => onOpenPanel('reports')}
          />
        </section>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <section className="role-overview">
        <OverviewHero
          eyebrow={`Dashboard ${user.role}`}
          title="Espace operationnel."
          description="Votre profil affiche uniquement les modules autorises pour travailler sans surcharge."
        />
        {notice && <p className="auth-notice">{notice}</p>}
        <OverviewKpis
          cards={[
            { label: 'Evenements visibles', value: overview.events.length, icon: CalendarDays, tone: 'blue', visible: visibleWidgets.events && canEvents },
            { label: 'Documents', value: overview.documents?.totals.documents ?? 0, icon: FileText, tone: 'cyan', visible: visibleWidgets.documents },
            { label: 'Workflows', value: activeCommercialWorkflows.length, icon: Layers, tone: 'yellow', visible: visibleWidgets.workflows },
            { label: 'Alertes', value: notificationCount, icon: Bell, tone: 'coral', visible: visibleWidgets.alerts },
          ]}
        />
        <section className="role-action-grid" aria-label="Actions rapides">
          <RoleActionCard
            icon={CalendarDays}
            visible={visibleWidgets.events && canEvents}
            title="Consulter les evenements"
            text="Suivez les dates, statuts, documents et informations utiles."
            onClick={() => onOpenPanel('events')}
          />
          <RoleActionCard
            icon={Bell}
            visible={visibleWidgets.alerts}
            title="Voir les alertes"
            text={`${notificationCount} notification(s) dans votre espace.`}
            onClick={() => onOpenPanel('alerts')}
          />
          <RoleActionCard
            icon={MonitorCog}
            visible
            title="Adapter l'interface"
            text="Theme, langue, densite et widgets visibles."
            onClick={() => onOpenPanel('settings')}
          />
        </section>
      </section>
    )
  }

  return (
    <section className="role-overview admin-overview">
      <OverviewHero
        eyebrow="Dashboard Admin"
        title="Pilotage Admin."
        description="Une vue courte pour arbitrer les acces, les workflows, les budgets et les operations sensibles."
      />
      {(notice || dashboardError) && <p className="auth-notice">{notice || dashboardError}</p>}

      <section className="admin-command-strip" aria-label="Priorites Admin">
        {adminPriorityItems
          .filter((item) => item.visible !== false)
          .map((item) => (
            <AdminPriorityCard item={item} key={item.title} onClick={() => onOpenPanel(item.panel)} />
          ))}
      </section>

      <OverviewKpis
        cards={[
          { label: 'Acces a valider', value: pendingUsers.length, icon: UserPlus, tone: 'blue', visible: true },
          {
            label: 'Evenements actifs',
            value: activeEventsCount,
            icon: CalendarDays,
            tone: 'cyan',
            visible: visibleWidgets.events,
          },
          {
            label: 'Budget consomme',
            value: `${budgetConsumptionRate}%`,
            icon: Banknote,
            tone: 'yellow',
            visible: visibleWidgets.budget,
          },
          { label: 'Alertes critiques', value: notificationCount, icon: Bell, tone: 'coral', visible: visibleWidgets.alerts },
        ]}
      />

      {(visibleWidgets.events || visibleWidgets.budget) && (
        <section className="analytics-grid admin-analytics-grid" aria-label="Pilotage admin">
          {visibleWidgets.events && (
            <article className="chart-panel wide admin-status-panel">
              <div className="panel-heading">
                <div>
                  <strong>Production evenementielle</strong>
                  <span>{isLoading ? 'Chargement...' : `${overview.events.length} evenement(s) suivis`}</span>
                </div>
                <button type="button" className="panel-link-button" onClick={() => onOpenPanel('events')}>
                  Voir
                </button>
              </div>
              {overview.events.length ? (
                <div className="status-bar-list" aria-label="Repartition des statuts evenementiels">
                  {eventStatusSummary.map((status) => (
                    <article key={status.value}>
                      <span>{status.label}</span>
                      <div>
                        <i style={{ '--bar-width': `${Math.max((status.count / maxEventStatusCount) * 100, 8)}%` }}></i>
                      </div>
                      <strong>{status.count}</strong>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="bar-chart admin-empty-chart" aria-hidden="true">
                  {eventBars.map((height, index) => (
                    <span key={index} style={{ '--bar-height': `${height}%` }}></span>
                  ))}
                </div>
              )}
              <div className="admin-panel-footer">
                <strong>{completedEventsCount}</strong>
                <span>evenement(s) termines sur la periode.</span>
              </div>
            </article>
          )}

          {visibleWidgets.budget && (
            <article className="chart-panel compact budget-health-card">
              <div className="panel-heading">
                <div>
                  <strong>Budget & tresorerie</strong>
                  <span>Consommation globale</span>
                </div>
              </div>
              <div
                className="donut-chart budget"
                style={{
                  background: `conic-gradient(var(--primary-color) 0 ${budgetConsumptionRate}%, var(--accent-color) ${budgetConsumptionRate}% 100%)`,
                }}
                aria-hidden="true"
              ></div>
              <strong className="overview-big-number">{formatFcfa(actualExpensesFcfa)}</strong>
              <p className="budget-health-label">{budgetConsumptionRate}% du budget valide consomme</p>
              <div className="budget-progress" aria-hidden="true">
                <span style={{ '--progress': `${budgetConsumptionRate}%` }}></span>
              </div>
              <ul className="compact-list budget-health-list">
                <li>
                  <span>Budget valide</span>
                  <strong>{formatFcfa(budgetReferenceFcfa)}</strong>
                </li>
                <li>
                  <span>Reste disponible</span>
                  <strong>{formatFcfa(remainingBudgetFcfa)}</strong>
                </li>
                <li>
                  <span>Paiements a suivre</span>
                  <strong>{formatFcfa(pendingPaymentsFcfa)}</strong>
                </li>
              </ul>
            </article>
          )}
        </section>
      )}

      <section className="admin-decision-grid" aria-label="Informations decisives Admin">
        <article className="chart-panel admin-activity-card">
          <div className="panel-heading">
            <div>
              <strong>Activite recente</strong>
              <span>Actions qui meritent une lecture rapide</span>
            </div>
          </div>
          {adminActivityItems.length ? (
            <ul className="admin-activity-list">
              {adminActivityItems.map((item, index) => (
                <li key={`${item.panel}-${index}`}>
                  <button type="button" onClick={() => onOpenPanel(item.panel)}>
                    <span>{item.meta}</span>
                    <strong>{item.title}</strong>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <DashboardEmptyState
              title="Aucune action urgente."
              text="Les inscriptions, workflows, budgets et documents sont sous controle."
            />
          )}
        </article>

        <article className="chart-panel admin-calendar-card">
          <div className="panel-heading">
            <div>
              <strong>Prochains evenements</strong>
              <span>Calendrier operationnel</span>
            </div>
            <button type="button" className="panel-link-button" onClick={() => onOpenPanel('events')}>
              Planning
            </button>
          </div>
          {upcomingEvents.length ? (
            <ul className="compact-list admin-event-list">
              {upcomingEvents.map((event) => {
                const startDate = dateFromValue(event.startsAt)
                const dateLabel =
                  startDate && !Number.isNaN(startDate.getTime())
                    ? formatDashboardDate(startDate, activePreferences)
                    : 'Date a definir'

                return (
                  <li key={event.id}>
                    <span>{dateLabel}</span>
                    <strong>{event.title}</strong>
                    <small>{eventStatusLabel(event.status)}</small>
                  </li>
                )
              })}
            </ul>
          ) : (
            <DashboardEmptyState
              title="Aucun evenement planifie."
              text="Creez le prochain evenement depuis le module Evenements."
            />
          )}
        </article>

        <article className="chart-panel admin-security-card">
          <div className="panel-heading">
            <div>
              <strong>Securite Admin</strong>
              <span>{securityScore}/3 controles actifs</span>
            </div>
            <ShieldCheck size={24} aria-hidden="true" />
          </div>
          <div className="security-score-ring" style={{ '--score': `${(securityScore / 3) * 100}%` }} aria-hidden="true">
            <strong>{securityScore}/3</strong>
          </div>
          <ul className="compact-list security-check-list">
            <li>
              <span>Double authentification</span>
              <strong className={user.twoFactorEnabled ? 'good' : 'warning'}>
                {user.twoFactorEnabled ? 'Activee' : 'A activer'}
              </strong>
            </li>
            <li>
              <span>Email</span>
              <strong className={user.emailVerifiedAt ? 'good' : 'warning'}>
                {user.emailVerifiedAt ? 'Verifie' : 'A confirmer'}
              </strong>
            </li>
            <li>
              <span>Mot de passe</span>
              <strong>{formattedPasswordChangedAt}</strong>
            </li>
            <li>
              <span>Derniere connexion</span>
              <strong>{formattedLastLogin}</strong>
            </li>
            <li>
              <span>Utilisateurs actifs</span>
              <strong>{activeUsersCount}</strong>
            </li>
          </ul>
        </article>
      </section>

      <section className="role-action-grid admin-action-grid" aria-label="Actions rapides Admin">
        <RoleActionCard
          icon={ClipboardCheck}
          visible
          title="Valider les inscriptions"
          text={`${pendingUsers.length} demande(s) attendent une decision Admin.`}
          onClick={() => onOpenPanel('validation')}
        />
        <RoleActionCard
          icon={Layers}
          visible={visibleWidgets.workflows}
          title="Arbitrer les workflows"
          text={`${pendingAdminWorkflows.length} workflow(s) attendent validation ou refus.`}
          onClick={() => onOpenPanel('workflows')}
        />
        <RoleActionCard
          icon={Handshake}
          visible={visibleWidgets.clients}
          title="Suivre le commercial"
          text={`${overview.commercial?.totals.prospects ?? 0} prospect(s), ${formatFcfa(
            overview.commercial?.totals.revenueFcfa ?? 0,
          )} gagne(s).`}
          onClick={() => onOpenPanel('commercial')}
        />
        <RoleActionCard
          icon={Wallet}
          visible={visibleWidgets.finance}
          title="Controler la tresorerie"
          text={`${formatFcfa(pendingPaymentsFcfa)} en paiements a suivre.`}
          onClick={() => onOpenPanel('finance')}
        />
        <RoleActionCard
          icon={Users}
          visible={visibleWidgets.hr}
          title="Superviser l'equipe"
          text={`${overview.hr?.totals.personnel ?? 0} profil(s) actifs dans le personnel.`}
          onClick={() => onOpenPanel('team')}
        />
        <RoleActionCard
          icon={FileText}
          visible={visibleWidgets.documents || visibleWidgets.reports}
          title="Documents et rapports"
          text={`${pendingDocumentsCount} validation(s), ${completedEventsCount} evenement(s) realises.`}
          onClick={() => onOpenPanel('documents')}
        />
      </section>
    </section>
  )
}

function OverviewHero({ description, eyebrow, title }) {
  return (
    <div id="dashboard" className="dashboard-hero admin-dashboard-title role-hero">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  )
}

function OverviewKpis({ cards }) {
  return (
    <div className="insight-grid role-kpi-grid">
      {cards.filter((card) => card.visible !== false).map((card) => {
        const Icon = card.icon

        return (
          <article className={`insight-card ${card.tone}`} key={card.label}>
            <span className="insight-icon">
              <Icon size={21} aria-hidden="true" />
            </span>
            <strong>{card.value}</strong>
            <p>{card.label}</p>
          </article>
        )
      })}
    </div>
  )
}

function RoleActionCard({ icon: Icon, onClick, text, title, visible = true }) {
  if (!visible) {
    return null
  }

  return (
    <button type="button" className="role-action-card" onClick={onClick}>
      <span>
        <Icon size={22} aria-hidden="true" />
      </span>
      <strong>{title}</strong>
      <small>{text}</small>
    </button>
  )
}

function AdminPriorityCard({ item, onClick }) {
  const Icon = item.icon

  return (
    <button type="button" className={`admin-priority-card ${item.tone}`} onClick={onClick}>
      <span className="admin-priority-icon">
        <Icon size={22} aria-hidden="true" />
      </span>
      <strong>{item.count}</strong>
      <p>{item.title}</p>
      <small>{item.detail}</small>
    </button>
  )
}

function DashboardEmptyState({ text, title }) {
  return (
    <div className="dashboard-empty-state">
      <CheckCircle2 size={22} aria-hidden="true" />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
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

function CommercialPage({ user }) {
  const [overview, setOverview] = useState(null)
  const [events, setEvents] = useState([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const refreshCommercial = useCallback(async () => {
    setNotice('')
    const [nextOverview, nextEvents] = await Promise.all([
      api.getCommercialOverview(),
      api.getEvents().catch(() => []),
    ])

    setOverview(nextOverview)
    setEvents(nextEvents)
    setSelectedClientId((current) => current || nextOverview.clients[0]?.id || '')
  }, [])

  useEffect(() => {
    let isMounted = true

    Promise.all([api.getCommercialOverview(), api.getEvents().catch(() => [])])
      .then(([nextOverview, nextEvents]) => {
        if (!isMounted) {
          return
        }

        setOverview(nextOverview)
        setEvents(nextEvents)
        setSelectedClientId((current) => current || nextOverview.clients[0]?.id || '')
      })
      .catch((error) => {
        if (isMounted) {
          setNotice(error.message)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [refreshCommercial])

  const selectedClient = overview?.clients.find((client) => client.id === selectedClientId)

  const submitClient = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setNotice('')

    try {
      const formData = new FormData(event.currentTarget)
      await api.createCommercialClient({
        name: getFormValue(formData, 'name'),
        contactName: getFormValue(formData, 'contactName'),
        email: getFormValue(formData, 'email'),
        phone: getFormValue(formData, 'phone'),
        address: getFormValue(formData, 'address'),
        source: getFormValue(formData, 'source'),
        status: getFormValue(formData, 'status') || 'NEW',
        notes: buildStructuredNotes(formData, 'notes', [
          { label: 'Type client', name: 'clientType' },
          { label: 'Secteur', name: 'sector' },
          { label: 'Email facturation', name: 'billingEmail' },
          { label: 'Numero fiscal / RCCM', name: 'taxInfo' },
          { label: 'Canal prioritaire', name: 'preferredChannel' },
        ]),
      })
      event.currentTarget.reset()
      await refreshCommercial()
      setNotice('Client ajoute au pipeline commercial.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const updateClientStatus = async (client, status) => {
    setIsSaving(true)
    setNotice('')

    try {
      await api.updateCommercialClient(client.id, { status })
      await refreshCommercial()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const submitRequest = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setNotice('')

    try {
      const formData = new FormData(event.currentTarget)
      const nextOverview = await api.createServiceRequest({
        clientId: getFormValue(formData, 'clientId'),
        eventId: getFormValue(formData, 'eventId'),
        title: getFormValue(formData, 'title'),
        description: buildStructuredNotes(formData, 'description', [
          { label: 'Type de prestation', name: 'prestationType' },
          { label: 'Lieu souhaite', name: 'eventLocation' },
          { label: 'Nombre invite(s)', name: 'guestCount' },
          { label: 'Niveau priorite', name: 'priority' },
          { label: 'Decisionnaire client', name: 'decisionMaker' },
          { label: 'Contraintes techniques', name: 'technicalConstraints' },
        ]),
        expectedBudgetFcfa: Number(getFormValue(formData, 'expectedBudgetFcfa') || 0),
        status: getFormValue(formData, 'status') || 'NEW',
        dueAt: getFormValue(formData, 'dueAt'),
      })
      setOverview(nextOverview)
      event.currentTarget.reset()
      setNotice('Demande de prestation creee.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const submitQuote = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setNotice('')

    try {
      const formData = new FormData(event.currentTarget)
      const nextOverview = await api.createCommercialQuote({
        clientId: getFormValue(formData, 'clientId'),
        requestId: getFormValue(formData, 'requestId'),
        eventId: getFormValue(formData, 'eventId'),
        title: getFormValue(formData, 'title'),
        amountFcfa: Number(getFormValue(formData, 'amountFcfa') || 0),
        status: getFormValue(formData, 'status') || 'DRAFT',
        validUntil: getFormValue(formData, 'validUntil'),
        notes: buildStructuredNotes(formData, 'notes', [
          { label: 'Contact client pour le devis', name: 'quoteContact' },
          { label: 'Reference client / appel d offre', name: 'clientReference' },
          { label: 'Type de prestation', name: 'prestationType' },
          { label: 'Date evenement', name: 'eventDate' },
          { label: 'Lieu / site', name: 'venue' },
          { label: 'Jauge estimee', name: 'audienceSize' },
          { label: 'Production evenementielle', name: 'productionLineFcfa', suffix: ' FCFA' },
          { label: 'Technique son / lumiere', name: 'technicalLineFcfa', suffix: ' FCFA' },
          { label: 'Artistes / booking', name: 'artistLineFcfa', suffix: ' FCFA' },
          { label: 'Logistique terrain', name: 'logisticsLineFcfa', suffix: ' FCFA' },
          { label: 'Administration / coordination', name: 'adminLineFcfa', suffix: ' FCFA' },
          { label: 'Taux TVA', name: 'taxRate', suffix: '%' },
          { label: 'TVA incluse', name: 'taxIncluded' },
          { label: 'Livrables inclus', name: 'deliverables' },
          { label: 'Logistique incluse', name: 'logistics' },
          { label: 'Exclusions', name: 'exclusions' },
          { label: 'Remise', name: 'discountFcfa', suffix: ' FCFA' },
          { label: 'Acompte demande', name: 'depositFcfa', suffix: ' FCFA' },
          { label: 'Conditions de paiement', name: 'paymentTerms' },
          { label: 'Validite commerciale', name: 'commercialValidity' },
        ]),
      })
      setOverview(nextOverview)
      event.currentTarget.reset()
      setNotice('Devis commercial cree.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const submitExchange = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setNotice('')

    try {
      const formData = new FormData(event.currentTarget)
      const nextOverview = await api.createClientExchange({
        clientId: getFormValue(formData, 'clientId'),
        channel: getFormValue(formData, 'channel'),
        subject: getFormValue(formData, 'subject'),
        notes: buildStructuredNotes(formData, 'notes', [
          { label: 'Prochaine action', name: 'nextAction' },
          { label: 'Date de relance', name: 'followUpAt' },
          { label: 'Niveau de chaleur', name: 'leadTemperature' },
        ]),
      })
      setOverview(nextOverview)
      event.currentTarget.reset()
      setNotice('Echange client ajoute a l historique.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="module-page" aria-label="Module commercial">
      <ModuleHeader
        description={`Pipeline clients, demandes de prestations, devis et historique d'echanges pour ${user.role}.`}
        icon={UserPlus}
        label="Commercial / Clients"
        title="Pipeline commercial."
      />
      {notice && <p className="auth-notice">{notice}</p>}

      <section className="finance-kpi-grid">
        <article className="visual-panel">
          <span>Clients</span>
          <strong>{overview?.totals.clients ?? 0}</strong>
        </article>
        <article className="visual-panel">
          <span>Prospects ouverts</span>
          <strong>{overview?.totals.prospects ?? 0}</strong>
        </article>
        <article className="visual-panel">
          <span>Demandes actives</span>
          <strong>{overview?.totals.openRequests ?? 0}</strong>
        </article>
        <article className="visual-panel">
          <span>CA gagne</span>
          <strong>{formatFcfa(overview?.totals.revenueFcfa ?? 0)}</strong>
        </article>
      </section>

      <section className="business-dashboard-grid">
        <form className="settings-card business-form" onSubmit={submitClient}>
          <div className="settings-panel-heading">
            <div>
              <p className="eyebrow">Client</p>
              <h2>Ajouter un prospect.</h2>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Nom client
              <input name="name" type="text" placeholder="Entreprise ou particulier" required />
            </label>
            <label>
              Contact
              <input name="contactName" type="text" placeholder="Interlocuteur" />
            </label>
            <label>
              Email
              <input name="email" type="email" placeholder="client@example.com" />
            </label>
            <label>
              Telephone
              <input name="phone" type="text" placeholder="+225..." />
            </label>
            <label>
              Adresse
              <input name="address" type="text" placeholder="Adresse du client" />
            </label>
            <label>
              Source
              <input name="source" type="text" placeholder="Recommandation, reseaux, appel..." />
            </label>
            <label>
              Type client
              <select name="clientType" defaultValue="Entreprise">
                <option value="Entreprise">Entreprise</option>
                <option value="Particulier">Particulier</option>
                <option value="Institution">Institution</option>
                <option value="Sponsor">Sponsor</option>
                <option value="Agence">Agence</option>
              </select>
            </label>
            <label>
              Secteur
              <input name="sector" type="text" placeholder="Musique, corporate, institutionnel..." />
            </label>
            <label>
              Email facturation
              <input name="billingEmail" type="email" placeholder="facturation@example.com" />
            </label>
            <label>
              Infos fiscales
              <input name="taxInfo" type="text" placeholder="RCCM, contribuable, TVA..." />
            </label>
            <label>
              Canal prioritaire
              <select name="preferredChannel" defaultValue="WhatsApp">
                <option value="WhatsApp">WhatsApp</option>
                <option value="Telephone">Telephone</option>
                <option value="Email">Email</option>
                <option value="Rendez-vous">Rendez-vous</option>
              </select>
            </label>
            <label>
              Statut
              <select name="status" defaultValue="NEW">
                {commercialStatusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="wide-field">
              Notes
              <textarea name="notes" placeholder="Besoin, contexte, prochain contact"></textarea>
            </label>
          </div>
          <button type="submit" className="primary-button" disabled={isSaving}>
            Ajouter
          </button>
        </form>

        <section className="settings-card">
          <div className="settings-panel-heading">
            <div>
              <p className="eyebrow">Pipeline</p>
              <h2>Suivi des prospects.</h2>
            </div>
            <button type="button" className="secondary-button bordered" onClick={refreshCommercial}>
              Actualiser
            </button>
          </div>
          <div className="pipeline-stage-grid">
            {(overview?.pipeline ?? []).map((stage) => (
              <article key={stage.status}>
                <span>{commercialStatusLabel(stage.status)}</span>
                <strong>{stage.count}</strong>
              </article>
            ))}
          </div>
          <div className="business-list">
            {(overview?.clients ?? []).map((client) => (
              <button
                type="button"
                className={selectedClientId === client.id ? 'active' : ''}
                key={client.id}
                onClick={() => setSelectedClientId(client.id)}
              >
                <span>{commercialStatusLabel(client.status)}</span>
                <strong>{client.name}</strong>
                <small>{client.email || client.phone || 'Contact a completer'}</small>
              </button>
            ))}
            {!overview?.clients?.length && (
              <p className="approval-empty">{isLoading ? 'Chargement...' : 'Aucun client commercial.'}</p>
            )}
          </div>
        </section>
      </section>

      <section className="business-dashboard-grid">
        <form className="settings-card business-form" onSubmit={submitRequest}>
          <div className="settings-panel-heading">
            <div>
              <p className="eyebrow">Prestation</p>
              <h2>Creer une demande.</h2>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Client
              <select name="clientId" defaultValue={selectedClientId} required>
                <option value="">Choisir</option>
                {(overview?.clients ?? []).map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Evenement lie
              <select name="eventId" defaultValue="">
                <option value="">Sans evenement</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Objet
              <input name="title" type="text" placeholder="Concert, prestation, sponsoring..." required />
            </label>
            <label>
              Type de prestation
              <select name="prestationType" defaultValue="Production evenementielle">
                <option value="Production evenementielle">Production evenementielle</option>
                <option value="Booking artiste">Booking artiste</option>
                <option value="Coordination artistique">Coordination artistique</option>
                <option value="Sponsoring / partenariat">Sponsoring / partenariat</option>
                <option value="Gestion administrative">Gestion administrative</option>
              </select>
            </label>
            <label>
              Lieu souhaite
              <input name="eventLocation" type="text" placeholder="Salle, ville, pays..." />
            </label>
            <label>
              Nombre invite(s)
              <input name="guestCount" type="number" min="0" placeholder="500" />
            </label>
            <label>
              Budget attendu
              <input name="expectedBudgetFcfa" type="number" min="0" placeholder="FCFA" />
            </label>
            <label>
              Priorite
              <select name="priority" defaultValue="Normale">
                <option value="Basse">Basse</option>
                <option value="Normale">Normale</option>
                <option value="Haute">Haute</option>
                <option value="Urgente">Urgente</option>
              </select>
            </label>
            <label>
              Decisionnaire
              <input name="decisionMaker" type="text" placeholder="Nom du valideur cote client" />
            </label>
            <label>
              Statut
              <select name="status" defaultValue="NEW">
                {serviceRequestStatusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Echeance
              <input name="dueAt" type="datetime-local" />
            </label>
            <label className="wide-field">
              Description
              <textarea name="description" placeholder="Besoin client et informations importantes"></textarea>
            </label>
            <label className="wide-field">
              Contraintes techniques
              <textarea name="technicalConstraints" placeholder="Son, lumiere, scene, securite, horaires, acces..."></textarea>
            </label>
          </div>
          <button type="submit" className="primary-button" disabled={isSaving}>
            Creer la demande
          </button>
        </form>

        <article className="settings-card business-detail">
          {selectedClient ? (
            <>
              <div className="settings-panel-heading">
                <div>
                  <p className="eyebrow">{commercialStatusLabel(selectedClient.status)}</p>
                  <h2>{selectedClient.name}</h2>
                  <p>{selectedClient.notes || 'Aucune note commerciale.'}</p>
                </div>
              </div>
              <div className="settings-meta-grid">
                <article>
                  <span>Contact</span>
                  <strong>{selectedClient.contactName || 'Non renseigne'}</strong>
                </article>
                <article>
                  <span>Email</span>
                  <strong>{selectedClient.email || 'Non renseigne'}</strong>
                </article>
                <article>
                  <span>Demandes</span>
                  <strong>{selectedClient.serviceRequests.length}</strong>
                </article>
                <article>
                  <span>Devis</span>
                  <strong>{selectedClient.quotes.length}</strong>
                </article>
              </div>
              <div className="approval-actions">
                {commercialStatusOptions.map((status) => (
                  <button
                    type="button"
                    className="secondary-button bordered"
                    disabled={isSaving || selectedClient.status === status.value}
                    key={status.value}
                    onClick={() => updateClientStatus(selectedClient, status.value)}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="approval-empty">Selectionnez un client pour voir son detail.</p>
          )}
        </article>
      </section>

      <section className="business-dashboard-grid">
        <form className="settings-card business-form" onSubmit={submitQuote}>
          <div className="settings-panel-heading">
            <div>
              <p className="eyebrow">Devis</p>
              <h2>Creer un devis.</h2>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Client
              <select name="clientId" defaultValue={selectedClientId} required>
                <option value="">Choisir</option>
                {(overview?.clients ?? []).map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Demande
              <select name="requestId" defaultValue="">
                <option value="">Sans demande</option>
                {(overview?.requests ?? []).map((request) => (
                  <option key={request.id} value={request.id}>
                    {request.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Evenement lie
              <select name="eventId" defaultValue="">
                <option value="">Sans evenement</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Titre
              <input name="title" type="text" placeholder="Devis production..." required />
            </label>
            <label>
              Contact devis
              <input name="quoteContact" type="text" placeholder="Nom, fonction, telephone" />
            </label>
            <label>
              Reference client
              <input name="clientReference" type="text" placeholder="AO, brief, bon de commande..." />
            </label>
            <label>
              Type de prestation
              <select name="prestationType" defaultValue="Production evenementielle">
                <option value="Production evenementielle">Production evenementielle</option>
                <option value="Booking artiste">Booking artiste</option>
                <option value="Coordination artistique">Coordination artistique</option>
                <option value="Sponsoring / partenariat">Sponsoring / partenariat</option>
                <option value="Autre">Autre</option>
              </select>
            </label>
            <label>
              Date evenement
              <input name="eventDate" type="datetime-local" />
            </label>
            <label>
              Lieu / site
              <input name="venue" type="text" placeholder="Lieu de la prestation" />
            </label>
            <label>
              Jauge estimee
              <input name="audienceSize" type="number" min="0" placeholder="Nombre de personnes" />
            </label>
            <label>
              Montant
              <input name="amountFcfa" type="number" min="0" placeholder="FCFA" required />
            </label>
            <label>
              Production evenementielle
              <input name="productionLineFcfa" type="number" min="0" placeholder="FCFA" />
            </label>
            <label>
              Technique son / lumiere
              <input name="technicalLineFcfa" type="number" min="0" placeholder="FCFA" />
            </label>
            <label>
              Artistes / booking
              <input name="artistLineFcfa" type="number" min="0" placeholder="FCFA" />
            </label>
            <label>
              Logistique terrain
              <input name="logisticsLineFcfa" type="number" min="0" placeholder="FCFA" />
            </label>
            <label>
              Administration / coordination
              <input name="adminLineFcfa" type="number" min="0" placeholder="FCFA" />
            </label>
            <label>
              Remise
              <input name="discountFcfa" type="number" min="0" placeholder="FCFA" />
            </label>
            <label>
              Acompte demande
              <input name="depositFcfa" type="number" min="0" placeholder="FCFA" />
            </label>
            <label>
              TVA
              <input name="taxRate" type="number" min="0" max="100" placeholder="18" />
            </label>
            <label>
              TVA incluse
              <select name="taxIncluded" defaultValue="Oui">
                <option value="Oui">Oui</option>
                <option value="Non">Non</option>
                <option value="Non applicable">Non applicable</option>
              </select>
            </label>
            <label>
              Statut
              <select name="status" defaultValue="DRAFT">
                {quoteStatusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Valide jusqu'au
              <input name="validUntil" type="datetime-local" />
            </label>
            <label>
              Validite commerciale
              <input name="commercialValidity" type="text" placeholder="15 jours, 30 jours..." />
            </label>
            <label className="wide-field">
              Livrables inclus
              <textarea name="deliverables" placeholder="Production, coordination, personnel, logistique, documents..."></textarea>
            </label>
            <label className="wide-field">
              Logistique incluse
              <textarea name="logistics" placeholder="Transport, hebergement, restauration, securite, technique..."></textarea>
            </label>
            <label className="wide-field">
              Exclusions
              <textarea name="exclusions" placeholder="Elements non compris, frais variables, obligations client..."></textarea>
            </label>
            <label className="wide-field">
              Conditions de paiement
              <textarea name="paymentTerms" placeholder="Acompte, solde, delai de paiement, mode de paiement..."></textarea>
            </label>
            <label className="wide-field">
              Notes
              <textarea name="notes" placeholder="Conditions, delais, options"></textarea>
            </label>
          </div>
          <button type="submit" className="primary-button" disabled={isSaving}>
            Enregistrer le devis
          </button>
        </form>

        <form className="settings-card business-form" onSubmit={submitExchange}>
          <div className="settings-panel-heading">
            <div>
              <p className="eyebrow">Historique</p>
              <h2>Ajouter un echange.</h2>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Client
              <select name="clientId" defaultValue={selectedClientId} required>
                <option value="">Choisir</option>
                {(overview?.clients ?? []).map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Canal
              <input name="channel" type="text" placeholder="WhatsApp, appel, email..." required />
            </label>
            <label>
              Sujet
              <input name="subject" type="text" placeholder="Relance, validation, negociation..." />
            </label>
            <label>
              Niveau de chaleur
              <select name="leadTemperature" defaultValue="Tiede">
                <option value="Froid">Froid</option>
                <option value="Tiede">Tiede</option>
                <option value="Chaud">Chaud</option>
                <option value="Pret a signer">Pret a signer</option>
              </select>
            </label>
            <label>
              Date de relance
              <input name="followUpAt" type="datetime-local" />
            </label>
            <label className="wide-field">
              Prochaine action
              <input name="nextAction" type="text" placeholder="Envoyer devis, appeler, rendez-vous..." />
            </label>
            <label className="wide-field">
              Compte rendu
              <textarea name="notes" placeholder="Resume de l'echange" required></textarea>
            </label>
          </div>
          <button type="submit" className="primary-button" disabled={isSaving}>
            Ajouter l'echange
          </button>
        </form>
      </section>

      <section className="settings-card">
        <div className="settings-panel-heading">
          <div>
            <p className="eyebrow">Devis et demandes</p>
            <h2>Suivi operationnel.</h2>
          </div>
        </div>
        <div className="finance-table business-table">
          {(overview?.quotes ?? []).slice(0, 8).map((quote) => (
            <div key={quote.id}>
              <span>{quote.quoteNumber}</span>
              <em>{quote.client.name}</em>
              <strong>{formatFcfa(quote.amountFcfa)}</strong>
              <small>{quoteStatusLabel(quote.status)}</small>
            </div>
          ))}
          {!overview?.quotes?.length && <p>Aucun devis commercial.</p>}
        </div>
      </section>
    </section>
  )
}

function DocumentsPage({ isAdmin }) {
  const [overview, setOverview] = useState(null)
  const [events, setEvents] = useState([])
  const [clients, setClients] = useState([])
  const [users, setUsers] = useState([])
  const [scope, setScope] = useState('COMPANY')
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const refreshDocuments = useCallback(async () => {
    setNotice('')
    const [nextOverview, nextEvents, nextClients, nextUsers] = await Promise.all([
      api.getDocumentsOverview(),
      api.getEvents().catch(() => []),
      api.getCommercialClients().catch(() => []),
      api.getUsers().catch(() => []),
    ])

    setOverview(nextOverview)
    setEvents(nextEvents)
    setClients(nextClients)
    setUsers(nextUsers)
  }, [])

  useEffect(() => {
    let isMounted = true

    Promise.all([
      api.getDocumentsOverview(),
      api.getEvents().catch(() => []),
      api.getCommercialClients().catch(() => []),
      api.getUsers().catch(() => []),
    ])
      .then(([nextOverview, nextEvents, nextClients, nextUsers]) => {
        if (!isMounted) {
          return
        }

        setOverview(nextOverview)
        setEvents(nextEvents)
        setClients(nextClients)
        setUsers(nextUsers)
      })
      .catch((error) => {
        if (isMounted) {
          setNotice(error.message)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [refreshDocuments])

  const targetPayload = (formData) => ({
    eventId: scope === 'EVENT' ? getFormValue(formData, 'eventId') : '',
    clientId: scope === 'CLIENT' ? getFormValue(formData, 'clientId') : '',
    userId: scope === 'USER' ? getFormValue(formData, 'userId') : '',
  })

  const submitDocument = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setNotice('')

    try {
      const formData = new FormData(event.currentTarget)
      const file = formData.get('file')
      const fileUrl = await fileToDataUrl(file)
      await api.createBusinessDocument({
        scope,
        ...targetPayload(formData),
        label: getFormValue(formData, 'label'),
        type: getFormValue(formData, 'type') || 'OTHER',
        status: getFormValue(formData, 'status') || 'PENDING_VALIDATION',
        url: fileUrl || getFormValue(formData, 'url'),
        fileName: file?.name,
        mimeType: file?.type,
        sizeBytes: file?.size,
        notes: buildStructuredNotes(formData, 'notes', [
          { label: 'Niveau confidentialite', name: 'confidentiality' },
          { label: 'Version', name: 'version' },
          { label: 'Responsable document', name: 'documentOwner' },
          { label: 'Validation attendue', name: 'validationNeed' },
        ]),
      })
      event.currentTarget.reset()
      await refreshDocuments()
      setNotice('Document ajoute et classe.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const generateDocument = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setNotice('')

    try {
      const formData = new FormData(event.currentTarget)
      await api.generateBusinessDocument({
        scope,
        ...targetPayload(formData),
        label: getFormValue(formData, 'label'),
        type: getFormValue(formData, 'type') || 'QUOTE',
        templateName: getFormValue(formData, 'templateName') || 'Modele M Group',
        amountFcfa: Number(getFormValue(formData, 'amountFcfa') || 0),
        notes: buildStructuredNotes(formData, 'notes', [
          { label: 'Objet commercial', name: 'businessPurpose' },
          { label: 'Conditions de paiement', name: 'paymentTerms' },
          { label: 'Delai validite', name: 'validityDelay' },
          { label: 'Signataire attendu', name: 'expectedSigner' },
        ]),
      })
      event.currentTarget.reset()
      await refreshDocuments()
      setNotice('Document PDF genere avec le modele M Group.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const validateDocument = async (document, status) => {
    setIsSaving(true)
    setNotice('')

    try {
      await api.validateBusinessDocument(document.id, { status })
      await refreshDocuments()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const openDocument = (document) => {
    setNotice('')

    try {
      if (document.mimeType === 'application/pdf' && document.templateName) {
        openBlobInNewTab(buildBusinessDocumentPdfBlob(document))
        return
      }

      if (document.url?.startsWith('data:')) {
        openBlobInNewTab(dataUrlToBlob(document.url))
        return
      }

      if (document.url) {
        const openedWindow = window.open(document.url, '_blank', 'noopener,noreferrer')

        if (!openedWindow) {
          throw new Error("Le navigateur a bloque l'ouverture du document.")
        }

        return
      }

      throw new Error("Ce document n'a pas encore de fichier ou d'URL.")
    } catch (error) {
      setNotice(error.message)
    }
  }

  const targetSelect = (
    <>
      {scope === 'EVENT' && (
        <label>
          Evenement
          <select name="eventId" required>
            <option value="">Choisir</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {scope === 'CLIENT' && (
        <label>
          Client
          <select name="clientId" required>
            <option value="">Choisir</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {scope === 'USER' && (
        <label>
          Utilisateur
          <select name="userId" required>
            <option value="">Choisir</option>
            {users.map((item) => (
              <option key={item.id} value={item.id}>
                {userDisplayName(item)}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  )

  return (
    <section className="module-page" aria-label="Module documents">
      <ModuleHeader
        description="Classez les fichiers par evenement, client, utilisateur ou entreprise, puis faites valider les documents sensibles."
        icon={FileText}
        label="Documents"
        title="Centre documentaire."
      />
      {notice && <p className="auth-notice">{notice}</p>}

      <section className="finance-kpi-grid">
        <article className="visual-panel">
          <span>Documents</span>
          <strong>{overview?.totals.documents ?? 0}</strong>
        </article>
        <article className="visual-panel">
          <span>A valider</span>
          <strong>{overview?.totals.pendingValidation ?? 0}</strong>
        </article>
        <article className="visual-panel">
          <span>Valides</span>
          <strong>{overview?.totals.approved ?? 0}</strong>
        </article>
        <article className="visual-panel">
          <span>Archives</span>
          <strong>{overview?.totals.archived ?? 0}</strong>
        </article>
      </section>

      <section className="business-dashboard-grid">
        <form className="settings-card business-form" onSubmit={submitDocument}>
          <div className="settings-panel-heading">
            <div>
              <p className="eyebrow">Upload securise</p>
              <h2>Classer un fichier.</h2>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Cible
              <select value={scope} onChange={(event) => setScope(event.target.value)}>
                {documentScopeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {targetSelect}
            <label>
              Type
              <select name="type" defaultValue="OTHER">
                {businessDocumentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Statut
              <select name="status" defaultValue="PENDING_VALIDATION">
                {businessDocumentStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Libelle
              <input name="label" type="text" placeholder="Contrat, facture, fiche..." required />
            </label>
            <label>
              Fichier
              <input name="file" type="file" />
            </label>
            <label className="wide-field">
              URL externe
              <input name="url" type="text" placeholder="Lien prive si le fichier est deja stocke" />
            </label>
            <label>
              Confidentialite
              <select name="confidentiality" defaultValue="Interne">
                <option value="Public">Public</option>
                <option value="Interne">Interne</option>
                <option value="Confidentiel">Confidentiel</option>
                <option value="Direction uniquement">Direction uniquement</option>
              </select>
            </label>
            <label>
              Version
              <input name="version" type="text" placeholder="v1, v2, signe..." />
            </label>
            <label>
              Responsable
              <input name="documentOwner" type="text" placeholder="Nom du responsable" />
            </label>
            <label>
              Validation attendue
              <input name="validationNeed" type="text" placeholder="Admin, Comptable, RH..." />
            </label>
            <label className="wide-field">
              Notes
              <textarea name="notes" placeholder="Contexte, validation, version"></textarea>
            </label>
          </div>
          <button type="submit" className="primary-button" disabled={isSaving}>
            Enregistrer
          </button>
        </form>

        <form className="settings-card business-form" onSubmit={generateDocument}>
          <div className="settings-panel-heading">
            <div>
              <p className="eyebrow">Modele M Group</p>
              <h2>Generer un PDF.</h2>
            </div>
          </div>
          <div className="form-grid">
            {targetSelect}
            <label>
              Type
              <select name="type" defaultValue="QUOTE">
                {businessDocumentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Libelle
              <input name="label" type="text" placeholder="Devis M Group..." required />
            </label>
            <label>
              Modele
              <input name="templateName" type="text" placeholder="Modele M Group" />
            </label>
            <label>
              Montant
              <input name="amountFcfa" type="number" min="0" placeholder="FCFA" />
            </label>
            <label>
              Objet commercial
              <input name="businessPurpose" type="text" placeholder="Prestation, facture, contrat..." />
            </label>
            <label>
              Delai validite
              <input name="validityDelay" type="text" placeholder="15 jours, 30 jours..." />
            </label>
            <label>
              Signataire attendu
              <input name="expectedSigner" type="text" placeholder="Direction, client, partenaire..." />
            </label>
            <label className="wide-field">
              Conditions de paiement
              <textarea name="paymentTerms" placeholder="Acompte, solde, delai et mode de paiement"></textarea>
            </label>
            <label className="wide-field">
              Notes
              <textarea name="notes" placeholder="Elements a faire apparaitre"></textarea>
            </label>
          </div>
          <button type="submit" className="primary-button" disabled={isSaving}>
            Generer
          </button>
        </form>
      </section>

      <section className="settings-card">
        <div className="settings-panel-heading">
          <div>
            <p className="eyebrow">Documents classes</p>
            <h2>Validation interne.</h2>
          </div>
          <button type="button" className="secondary-button bordered" onClick={refreshDocuments}>
            Actualiser
          </button>
        </div>
        <div className="document-list">
          {(overview?.documents ?? []).map((document) => (
            <article key={document.id}>
              <div>
                <span>{businessDocumentTypeLabel(document.type)} - {documentScopeLabel(document.scope)}</span>
                <strong>{document.label}</strong>
                <small>{businessDocumentStatusLabel(document.status)}</small>
              </div>
              <div className="approval-actions">
                <button
                  type="button"
                  className="secondary-button bordered"
                  onClick={() => openDocument(document)}
                >
                  Ouvrir
                </button>
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={isSaving}
                      onClick={() => validateDocument(document, 'APPROVED')}
                    >
                      Valider
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={isSaving}
                      onClick={() => validateDocument(document, 'REJECTED')}
                    >
                      Refuser
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
          {!overview?.documents?.length && (
            <p className="approval-empty">{isLoading ? 'Chargement...' : 'Aucun document.'}</p>
          )}
        </div>
      </section>
    </section>
  )
}

function ReportsPage() {
  const [summary, setSummary] = useState(null)
  const [filters, setFilters] = useState({ periodStart: '', periodEnd: '' })
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const refreshReports = useCallback(async (nextFilters = filters) => {
    setNotice('')
    const result = await api.getReportsSummary(nextFilters)
    setSummary(result)
  }, [filters])

  useEffect(() => {
    let isMounted = true

    api
      .getReportsSummary()
      .then((result) => {
        if (!isMounted) {
          return
        }

        setSummary(result)
      })
      .catch((error) => {
        if (isMounted) {
          setNotice(error.message)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [refreshReports])

  const submitFilters = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const nextFilters = {
      periodStart: getFormValue(formData, 'periodStart'),
      periodEnd: getFormValue(formData, 'periodEnd'),
    }
    setFilters(nextFilters)
    await refreshReports(nextFilters)
  }

  const exportReport = async (format) => {
    setIsSaving(true)
    setNotice('')

    try {
      const exportLog = await api.exportReport({
        ...filters,
        format,
        title: `Rapport M Group ${format}`,
      })
      setSummary((current) =>
        current
          ? {
              ...current,
              exports: [exportLog, ...(current.exports ?? [])],
            }
          : current,
      )
      window.open(exportLog.fileUrl, '_blank', 'noopener,noreferrer')
      setNotice(`Rapport ${format} genere.`)
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="module-page" aria-label="Module rapports">
      <ModuleHeader
        description="Analysez le chiffre d'affaires, les evenements, les budgets, les depenses et les performances commerciales."
        icon={Activity}
        label="Rapports"
        title="Analyse de performance."
      />
      {notice && <p className="auth-notice">{notice}</p>}

      <form className="settings-card report-filter-form" onSubmit={submitFilters}>
        <label>
          Debut
          <input name="periodStart" type="datetime-local" defaultValue={filters.periodStart} />
        </label>
        <label>
          Fin
          <input name="periodEnd" type="datetime-local" defaultValue={filters.periodEnd} />
        </label>
        <button type="submit" className="primary-button">
          Filtrer
        </button>
        <button type="button" className="secondary-button bordered" disabled={isSaving} onClick={() => exportReport('PDF')}>
          Export PDF
        </button>
        <button type="button" className="secondary-button bordered" disabled={isSaving} onClick={() => exportReport('EXCEL')}>
          Export Excel
        </button>
      </form>

      <section className="finance-kpi-grid">
        <article className="visual-panel">
          <span>Chiffre d'affaires</span>
          <strong>{formatFcfa(summary?.totals.revenueFcfa ?? 0)}</strong>
        </article>
        <article className="visual-panel">
          <span>Evenements realises</span>
          <strong>{summary?.totals.completedEvents ?? 0}</strong>
        </article>
        <article className="visual-panel">
          <span>Budget consomme</span>
          <strong>{formatFcfa(summary?.totals.consumedBudgetFcfa ?? 0)}</strong>
        </article>
        <article className="visual-panel">
          <span>Utilisateurs actifs</span>
          <strong>{summary?.totals.activeUsers ?? 0}</strong>
        </article>
      </section>

      <section className="analytics-grid">
        <article className="chart-panel wide">
          <div className="panel-heading">
            <strong>Depenses par categorie</strong>
            <span>{summary?.totals.budgetConsumptionRate ?? 0}% du budget prevu</span>
          </div>
          <div className="report-bars">
            {(summary?.expensesByCategory ?? []).slice(0, 6).map((item, index) => {
              const max = Math.max(...(summary?.expensesByCategory ?? [{ amountFcfa: 1 }]).map((entry) => entry.amountFcfa), 1)
              return (
                <article key={item.category}>
                  <span>{item.category}</span>
                  <div>
                    <i style={{ '--bar-width': `${Math.max((item.amountFcfa / max) * 100, 8)}%` }}></i>
                  </div>
                  <strong>{formatFcfa(item.amountFcfa)}</strong>
                  <small>{index + 1}</small>
                </article>
              )
            })}
            {!summary?.expensesByCategory?.length && <p>{isLoading ? 'Chargement...' : 'Aucune depense.'}</p>}
          </div>
        </article>
        <article className="chart-panel compact">
          <div className="panel-heading">
            <strong>Performance commerciale</strong>
            <span>Devis</span>
          </div>
          <div className="donut-chart budget" aria-hidden="true"></div>
          <ul className="compact-list">
            <li>
              <span>Acceptes</span>
              <strong>{summary?.commercialPerformance.acceptedQuotes ?? 0}</strong>
            </li>
            <li>
              <span>En cours</span>
              <strong>{summary?.commercialPerformance.pendingQuotes ?? 0}</strong>
            </li>
            <li>
              <span>Rejetes</span>
              <strong>{summary?.commercialPerformance.rejectedQuotes ?? 0}</strong>
            </li>
          </ul>
        </article>
      </section>

      <section className="business-dashboard-grid">
        <article className="settings-card">
          <div className="settings-panel-heading">
            <div>
              <p className="eyebrow">Top clients</p>
              <h2>Revenus gagnes.</h2>
            </div>
          </div>
          <ul className="compact-list">
            {(summary?.topClients ?? []).map((client) => (
              <li key={client.id}>
                <span>{client.name}</span>
                <strong>{formatFcfa(client.revenueFcfa)}</strong>
              </li>
            ))}
            {!summary?.topClients?.length && <li>Aucun client gagne.</li>}
          </ul>
        </article>
        <article className="settings-card">
          <div className="settings-panel-heading">
            <div>
              <p className="eyebrow">Exports</p>
              <h2>Historique.</h2>
            </div>
          </div>
          <ul className="compact-list">
            {(summary?.exports ?? []).slice(0, 8).map((item) => (
              <li key={item.id}>
                <span>{item.title}</span>
                <strong>{item.format}</strong>
              </li>
            ))}
            {!summary?.exports?.length && <li>Aucun export.</li>}
          </ul>
        </article>
      </section>
    </section>
  )
}

function FinanceWorkspacePage({ isAdmin = false }) {
  const [summary, setSummary] = useState(null)
  const [eventFinance, setEventFinance] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState('')
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isMounted = true

    api
      .getFinanceSummary()
      .then((result) => {
        if (!isMounted) {
          return
        }

        setSummary(result)
        setSelectedEventId(result.events[0]?.eventId ?? '')
      })
      .catch((error) => {
        if (isMounted) {
          setNotice(error.message)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedEventId) {
      return undefined
    }

    let isMounted = true

    api
      .getEventFinance(selectedEventId)
      .then((result) => {
        if (isMounted) {
          setEventFinance(result)
        }
      })
      .catch((error) => {
        if (isMounted) {
          setNotice(error.message)
        }
      })

    return () => {
      isMounted = false
    }
  }, [selectedEventId])

  const refreshFinance = async () => {
    setIsLoading(true)
    setNotice('')

    try {
      const result = await api.getFinanceSummary()
      setSummary(result)
      if (selectedEventId) {
        setEventFinance(await api.getEventFinance(selectedEventId))
      } else {
        setSelectedEventId(result.events[0]?.eventId ?? '')
      }
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const syncFinance = async (updatedEventFinance) => {
    setEventFinance(updatedEventFinance)
    setSummary(await api.getFinanceSummary())
  }

  const submitBudget = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    if (!selectedEventId) {
      return
    }

    setIsSaving(true)
    setNotice('')

    try {
      await syncFinance(
        await api.createEventBudget(selectedEventId, {
          label: getFormValue(formData, 'label'),
          plannedAmountFcfa: Number(getFormValue(formData, 'plannedAmountFcfa') || 0),
          status: getFormValue(formData, 'status') || 'PENDING_APPROVAL',
          notes: buildStructuredNotes(formData, 'notes', [
            { label: 'Categorie budget', name: 'budgetCategory' },
            { label: 'Centre de cout', name: 'costCenter' },
            { label: 'Justification', name: 'justification' },
            { label: 'Marge de securite', name: 'safetyMarginFcfa', suffix: ' FCFA' },
          ]),
        }),
      )
      event.currentTarget.reset()
      setNotice('Budget previsionnel ajoute.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const validateBudget = async (budget, action) => {
    // La decision budgetaire finale est une action sensible reservee a l'Admin.
    if (!isAdmin) {
      setNotice("Seul l'Admin peut valider ou rejeter un budget.")
      return
    }

    setIsSaving(true)
    setNotice('')

    try {
      const updated =
        action === 'approve'
          ? await api.approveEventBudget(budget.id, {
              approvedAmountFcfa: budget.plannedAmountFcfa,
            })
          : await api.rejectEventBudget(budget.id, { notes: 'Budget rejete par Admin' })
      await syncFinance(updated)
      setNotice(action === 'approve' ? 'Budget valide.' : 'Budget rejete.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const submitExpense = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    if (!selectedEventId) {
      return
    }

    setIsSaving(true)
    setNotice('')

    try {
      await syncFinance(
        await api.createEventExpense(selectedEventId, {
          label: getFormValue(formData, 'label'),
          amountFcfa: Number(getFormValue(formData, 'amountFcfa') || 0),
          category: getFormValue(formData, 'category'),
          vendor: getFormValue(formData, 'vendor'),
          spentAt: getFormValue(formData, 'spentAt'),
          notes: buildStructuredNotes(formData, 'notes', [
            { label: 'Reference piece', name: 'receiptReference' },
            { label: 'Mode de paiement', name: 'paymentMethod' },
            { label: 'Responsable validation', name: 'validatorName' },
          ]),
        }),
      )
      event.currentTarget.reset()
      setNotice('Depense reelle ajoutee.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const submitPayment = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    if (!selectedEventId) {
      return
    }

    setIsSaving(true)
    setNotice('')

    try {
      await syncFinance(
        await api.createEventPayment(selectedEventId, {
          label: getFormValue(formData, 'label'),
          amountFcfa: Number(getFormValue(formData, 'amountFcfa') || 0),
          status: getFormValue(formData, 'status') || 'PENDING',
          dueAt: getFormValue(formData, 'dueAt'),
          paidAt: getFormValue(formData, 'paidAt'),
          method: getFormValue(formData, 'method'),
          reference: getFormValue(formData, 'reference'),
          notes: buildStructuredNotes(formData, 'notes', [
            { label: 'Beneficiaire', name: 'beneficiary' },
            { label: 'Compte / numero', name: 'paymentAccount' },
            { label: 'Condition', name: 'paymentCondition' },
          ]),
        }),
      )
      event.currentTarget.reset()
      setNotice('Paiement ajoute.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const submitDocument = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    if (!selectedEventId) {
      return
    }

    setIsSaving(true)
    setNotice('')

    try {
      const file = formData.get('file')
      const fileUrl = await fileToDataUrl(file)
      await syncFinance(
        await api.createFinanceDocument(selectedEventId, {
          label: getFormValue(formData, 'label'),
          type: getFormValue(formData, 'type') || 'QUOTE',
          amountFcfa: Number(getFormValue(formData, 'amountFcfa') || 0),
          url: fileUrl || getFormValue(formData, 'url'),
          fileName: file instanceof File ? file.name : undefined,
          mimeType: file instanceof File ? file.type : undefined,
        }),
      )
      event.currentTarget.reset()
      setNotice('Document financier ajoute.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const finance = eventFinance?.finance

  return (
    <>
      {notice && <p className="auth-notice">{notice}</p>}

      <section className="finance-kpi-grid">
        <article className="visual-panel">
          <span>Budget previsionnel</span>
          <strong>{formatFcfa(summary?.totals.plannedBudgetFcfa ?? 0)}</strong>
        </article>
        <article className="visual-panel">
          <span>Budget valide</span>
          <strong>{formatFcfa(summary?.totals.approvedBudgetFcfa ?? 0)}</strong>
        </article>
        <article className="visual-panel">
          <span>Depenses reelles</span>
          <strong>{formatFcfa(summary?.totals.actualExpensesFcfa ?? 0)}</strong>
        </article>
        <article className="visual-panel warning">
          <span>Depassement</span>
          <strong>{formatFcfa(summary?.totals.overBudgetFcfa ?? 0)}</strong>
        </article>
      </section>

      <section className="settings-card">
        <div className="settings-panel-heading">
          <div>
            <p className="eyebrow">Evenement</p>
            <h2>Suivi financier par evenement.</h2>
          </div>
          <button type="button" className="secondary-button bordered" onClick={refreshFinance}>
            Actualiser
          </button>
        </div>
        <select
          value={selectedEventId}
          onChange={(event) => {
            setSelectedEventId(event.target.value)
            if (!event.target.value) {
              setEventFinance(null)
            }
          }}
          disabled={isLoading || !summary?.events.length}
        >
          <option value="">Choisir un evenement</option>
          {summary?.events.map((event) => (
            <option key={event.eventId} value={event.eventId}>
              {event.title}
            </option>
          ))}
        </select>
      </section>

      {summary?.alerts.length > 0 && (
        <section className="alert-list">
          {summary.alerts.map((alert) => (
            <article className="alert-card" key={alert.eventId}>
              <AlertTriangle size={22} aria-hidden="true" />
              <div>
                <strong>{alert.title}</strong>
                <span>
                  Depenses {formatFcfa(alert.actualExpensesFcfa)} / Limite {formatFcfa(alert.limitFcfa)}
                </span>
              </div>
              <em>Depassement</em>
            </article>
          ))}
        </section>
      )}

      {selectedEventId && eventFinance ? (
        <section className="finance-workspace">
          <article className="settings-card event-summary-card">
            <div className="settings-meta-grid">
              <article>
                <span>Previsionnel</span>
                <strong>{formatFcfa(finance?.plannedBudgetFcfa ?? 0)}</strong>
              </article>
              <article>
                <span>Valide</span>
                <strong>{formatFcfa(finance?.approvedBudgetFcfa ?? 0)}</strong>
              </article>
              <article>
                <span>Reel</span>
                <strong>{formatFcfa(finance?.actualExpensesFcfa ?? 0)}</strong>
              </article>
              <article>
                <span>Paiements en attente</span>
                <strong>{formatFcfa(finance?.pendingPaymentsFcfa ?? 0)}</strong>
              </article>
            </div>
          </article>

          <article className="settings-card">
            <p className="eyebrow">Budget previsionnel</p>
            <form className="compact-event-form" onSubmit={submitBudget}>
              <input name="label" type="text" placeholder="Technique, communication..." required />
              <select name="budgetCategory" defaultValue="Production">
                <option value="Production">Production</option>
                <option value="Technique">Technique</option>
                <option value="Communication">Communication</option>
                <option value="Logistique">Logistique</option>
                <option value="RH / Personnel">RH / Personnel</option>
                <option value="Administratif">Administratif</option>
              </select>
              <input name="plannedAmountFcfa" type="number" min="0" placeholder="3000000" required />
              <select name="status" defaultValue="PENDING_APPROVAL">
                {budgetStatusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <input name="costCenter" type="text" placeholder="Centre de cout" />
              <input name="safetyMarginFcfa" type="number" min="0" placeholder="Marge securite FCFA" />
              <input name="justification" type="text" placeholder="Justification budgetaire" />
              <input name="notes" type="text" placeholder="Notes" />
              <button type="submit" className="primary-button" disabled={isSaving}>
                Ajouter
              </button>
            </form>
            <div className="finance-table">
              {eventFinance.budgets.map((budget) => (
                <div key={budget.id}>
                  <span>{budget.label}</span>
                  <strong>{formatFcfa(budget.plannedAmountFcfa)}</strong>
                  <em>{budgetStatusLabel(budget.status)}</em>
                  {isAdmin ? (
                    <div className="table-actions">
                      <button
                        type="button"
                        className="secondary-button bordered"
                        disabled={isSaving}
                        onClick={() => validateBudget(budget, 'approve')}
                      >
                        Valider
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        disabled={isSaving}
                        onClick={() => validateBudget(budget, 'reject')}
                      >
                        Rejeter
                      </button>
                    </div>
                  ) : (
                    <small>Validation Admin requise</small>
                  )}
                </div>
              ))}
              {eventFinance.budgets.length === 0 && <p>Aucun budget previsionnel.</p>}
            </div>
          </article>

          <article className="settings-card">
            <p className="eyebrow">Depenses reelles</p>
            <form className="compact-event-form" onSubmit={submitExpense}>
              <input name="label" type="text" placeholder="Depense" required />
              <input name="amountFcfa" type="number" min="0" placeholder="850000" required />
              <select name="category" defaultValue="Technique">
                <option value="Technique">Technique</option>
                <option value="Logistique">Logistique</option>
                <option value="Communication">Communication</option>
                <option value="Transport">Transport</option>
                <option value="Hebergement">Hebergement</option>
                <option value="Personnel">Personnel</option>
                <option value="Autre">Autre</option>
              </select>
              <input name="vendor" type="text" placeholder="Prestataire" />
              <input name="spentAt" type="datetime-local" />
              <input name="receiptReference" type="text" placeholder="Reference piece" />
              <input name="paymentMethod" type="text" placeholder="Mode paiement" />
              <input name="validatorName" type="text" placeholder="Valide par" />
              <input name="notes" type="text" placeholder="Notes" />
              <button type="submit" className="primary-button" disabled={isSaving}>
                Ajouter
              </button>
            </form>
            <ul className="compact-list">
              {eventFinance.expenses.map((expense) => (
                <li key={expense.id}>
                  <span>{expense.label}</span>
                  <strong>{formatFcfa(expense.amountFcfa)}</strong>
                </li>
              ))}
              {eventFinance.expenses.length === 0 && <li>Aucune depense.</li>}
            </ul>
          </article>

          <article className="settings-card">
            <p className="eyebrow">Paiements</p>
            <form className="compact-event-form" onSubmit={submitPayment}>
              <input name="label" type="text" placeholder="Acompte, solde..." required />
              <input name="amountFcfa" type="number" min="0" placeholder="1200000" required />
              <select name="status" defaultValue="PENDING">
                {paymentStatusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <input name="dueAt" type="datetime-local" />
              <input name="paidAt" type="datetime-local" />
              <input name="method" type="text" placeholder="Mobile money, virement..." />
              <input name="reference" type="text" placeholder="Reference" />
              <input name="beneficiary" type="text" placeholder="Beneficiaire" />
              <input name="paymentAccount" type="text" placeholder="Compte / numero" />
              <input name="paymentCondition" type="text" placeholder="Condition de paiement" />
              <input name="notes" type="text" placeholder="Notes internes" />
              <button type="submit" className="primary-button" disabled={isSaving}>
                Ajouter
              </button>
            </form>
            <ul className="compact-list">
              {eventFinance.payments.map((payment) => (
                <li key={payment.id}>
                  <span>{payment.label}</span>
                  <strong>
                    {formatFcfa(payment.amountFcfa)} - {paymentStatusLabel(payment.status)}
                  </strong>
                </li>
              ))}
              {eventFinance.payments.length === 0 && <li>Aucun paiement.</li>}
            </ul>
          </article>

          <article className="settings-card event-documents">
            <p className="eyebrow">Devis, factures et recus</p>
            <form className="compact-event-form" onSubmit={submitDocument}>
              <input name="label" type="text" placeholder="Document" required />
              <select name="type" defaultValue="QUOTE">
                {financeDocumentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <input name="amountFcfa" type="number" min="0" placeholder="Montant" />
              <input name="url" type="url" placeholder="Lien" />
              <input name="file" type="file" />
              <button type="submit" className="primary-button" disabled={isSaving}>
                Ajouter
              </button>
            </form>
            <div className="document-grid">
              {eventFinance.documents.map((document) => (
                <a href={document.url} target="_blank" rel="noreferrer" key={document.id}>
                  <ClipboardCheck size={18} aria-hidden="true" />
                  <span>{document.label}</span>
                  <small>
                    {financeDocumentLabel(document.type)}
                    {document.amountFcfa ? ` - ${formatFcfa(document.amountFcfa)}` : ''}
                  </small>
                </a>
              ))}
              {eventFinance.documents.length === 0 && <p>Aucun document financier.</p>}
            </div>
          </article>
        </section>
      ) : (
        <p className="approval-empty">
          {isLoading ? 'Chargement financier...' : 'Creez un evenement avant de saisir les finances.'}
        </p>
      )}
    </>
  )
}

function EventsPage({ user }) {
  const [events, setEvents] = useState([])
  const [users, setUsers] = useState([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? events[0]
  const canCreateEvent =
    user.roleValues.includes('ADMIN') ||
    user.roleValues.includes('RH') ||
    user.roleValues.includes('COMMERCIAL') ||
    user.roleValues.includes('SECRETAIRE')
  const canManageEvent =
    user.roleValues.includes('ADMIN') ||
    user.roleValues.includes('RH') ||
    user.roleValues.includes('SECRETAIRE')
  const canManageProduction = user.roleValues.includes('ADMIN') || user.roleValues.includes('RH')
  const canAttachDocument =
    canManageEvent ||
    user.roleValues.includes('COMMERCIAL') ||
    user.roleValues.includes('COMPTABLE')

  const refreshEvents = useCallback(async () => {
    setIsLoading(true)
    setNotice('')

    try {
      const nextEvents = await api.getEvents()
      setEvents(nextEvents)
      setSelectedEventId((current) => current || nextEvents[0]?.id || '')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    Promise.all([api.getEvents(), api.getUsers().catch(() => [])])
      .then(([nextEvents, nextUsers]) => {
        if (!isMounted) {
          return
        }

        setEvents(nextEvents)
        setSelectedEventId(nextEvents[0]?.id || '')
        setUsers(nextUsers)
      })
      .catch((error) => {
        if (isMounted) {
          setNotice(error.message)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const syncSelectedEvent = (updatedEvent) => {
    setEvents((current) => {
      const exists = current.some((event) => event.id === updatedEvent.id)
      return exists
        ? current.map((event) => (event.id === updatedEvent.id ? updatedEvent : event))
        : [updatedEvent, ...current]
    })
    setSelectedEventId(updatedEvent.id)
  }

  const createEvent = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setIsSaving(true)
    setNotice('')

    try {
      const created = await api.createEvent({
        title: getFormValue(formData, 'title'),
        description: buildStructuredNotes(formData, 'description', [
          { label: 'Type evenement', name: 'eventType' },
          { label: 'Public cible', name: 'targetAudience' },
          { label: 'Jauge attendue', name: 'expectedGuests' },
          { label: 'Mode acces', name: 'accessType' },
          { label: 'Besoins production', name: 'productionNeeds' },
          { label: 'Risques / contraintes', name: 'riskNotes' },
        ]),
        location: getFormValue(formData, 'location'),
        startsAt: getFormValue(formData, 'startsAt'),
        endsAt: getFormValue(formData, 'endsAt'),
        budgetFcfa: Number(getFormValue(formData, 'budgetFcfa') || 0),
        status: getFormValue(formData, 'status') || 'DRAFT',
        responsibleId: getFormValue(formData, 'responsibleId'),
      })
      event.currentTarget.reset()
      syncSelectedEvent(created)
      setNotice('Evenement cree avec succes.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const updateEventStatus = async (nextStatus) => {
    if (!selectedEvent) {
      return
    }

    // Seuls les profils de pilotage evenementiel peuvent modifier le statut.
    if (!canManageEvent) {
      setNotice("Votre role permet de consulter cet evenement, pas de modifier son statut.")
      return
    }

    setIsSaving(true)
    setNotice('')

    try {
      syncSelectedEvent(await api.updateEvent(selectedEvent.id, { status: nextStatus }))
      setNotice('Statut evenement mis a jour.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const addAssignment = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    if (!selectedEvent) {
      return
    }

    if (!canManageProduction) {
      setNotice("Votre role ne permet pas d'affecter des responsables.")
      return
    }

    setIsSaving(true)
    setNotice('')

    try {
      syncSelectedEvent(
        await api.addEventAssignment(selectedEvent.id, {
          userId: getFormValue(formData, 'userId'),
          roleNote: getFormValue(formData, 'roleNote'),
        }),
      )
      event.currentTarget.reset()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const addChecklistItem = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    if (!selectedEvent) {
      return
    }

    if (!canManageEvent) {
      setNotice("Votre role ne permet pas de modifier la checklist.")
      return
    }

    setIsSaving(true)
    setNotice('')

    try {
      syncSelectedEvent(
        await api.addEventChecklistItem(selectedEvent.id, {
          title: getFormValue(formData, 'title'),
          dueAt: getFormValue(formData, 'dueAt'),
        }),
      )
      event.currentTarget.reset()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleChecklistItem = async (item) => {
    if (!canManageEvent) {
      setNotice("Votre role permet de consulter la checklist, pas de la modifier.")
      return
    }

    setIsSaving(true)
    setNotice('')

    try {
      syncSelectedEvent(
        await api.updateEventChecklistItem(selectedEvent.id, item.id, {
          isDone: !item.isDone,
        }),
      )
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const addProductionStep = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    if (!selectedEvent) {
      return
    }

    if (!canManageProduction) {
      setNotice("Votre role ne permet pas de modifier le planning de production.")
      return
    }

    setIsSaving(true)
    setNotice('')

    try {
      syncSelectedEvent(
        await api.addEventProductionStep(selectedEvent.id, {
          title: getFormValue(formData, 'title'),
          notes: getFormValue(formData, 'notes'),
          startsAt: getFormValue(formData, 'startsAt'),
          endsAt: getFormValue(formData, 'endsAt'),
          status: getFormValue(formData, 'status') || 'IN_PREPARATION',
          ownerId: getFormValue(formData, 'ownerId'),
        }),
      )
      event.currentTarget.reset()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const addAttachment = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    if (!selectedEvent) {
      return
    }

    if (!canAttachDocument) {
      setNotice("Votre role ne permet pas d'ajouter une piece jointe.")
      return
    }

    setIsSaving(true)
    setNotice('')

    try {
      const file = formData.get('file')
      const fileUrl = await fileToDataUrl(file)
      syncSelectedEvent(
        await api.addEventAttachment(selectedEvent.id, {
          label: getFormValue(formData, 'label'),
          type: getFormValue(formData, 'type') || 'OTHER',
          url: fileUrl || getFormValue(formData, 'url'),
          fileName: file instanceof File ? file.name : undefined,
          mimeType: file instanceof File ? file.type : undefined,
        }),
      )
      event.currentTarget.reset()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const completionRate = selectedEvent?.checklist?.length
    ? Math.round(
        (selectedEvent.checklist.filter((item) => item.isDone).length /
          selectedEvent.checklist.length) *
          100,
      )
    : 0

  return (
    <section className="module-page">
      <ModuleHeader
        description="Creez les evenements, organisez le planning de production, affectez les responsables et centralisez les documents."
        icon={CalendarDays}
        label="Evenementiel"
        title="Evenements."
      />

      {notice && <p className="auth-notice">{notice}</p>}

      <div className="event-workspace">
        {canCreateEvent ? (
          <form className="event-form settings-card" onSubmit={createEvent}>
            {/* Creation rapide : chaque evenement commence par les informations de pilotage. */}
            <p className="eyebrow">Creation</p>
            <h2>Nouvel evenement.</h2>
            <div className="form-grid">
              <label>
                Nom de l'evenement
                <input name="title" type="text" placeholder="Concert prive - Plateau" required />
              </label>
              <label>
                Lieu
                <input name="location" type="text" placeholder="Abidjan" />
              </label>
              <label>
                Type evenement
                <select name="eventType" defaultValue="Concert">
                  <option value="Concert">Concert</option>
                  <option value="Ceremonie">Ceremonie</option>
                  <option value="Conference">Conference</option>
                  <option value="Activation de marque">Activation de marque</option>
                  <option value="Production TV / digitale">Production TV / digitale</option>
                  <option value="Autre">Autre</option>
                </select>
              </label>
              <label>
                Public cible
                <input name="targetAudience" type="text" placeholder="VIP, grand public, entreprise..." />
              </label>
              <label>
                Debut
                <input name="startsAt" type="datetime-local" required />
              </label>
              <label>
                Fin
                <input name="endsAt" type="datetime-local" />
              </label>
              <label>
                Budget FCFA
                <input name="budgetFcfa" type="number" min="0" placeholder="4500000" />
              </label>
              <label>
                Jauge attendue
                <input name="expectedGuests" type="number" min="0" placeholder="1000" />
              </label>
              <label>
                Mode acces
                <select name="accessType" defaultValue="Invitation">
                  <option value="Invitation">Invitation</option>
                  <option value="Billetterie">Billetterie</option>
                  <option value="Acces libre">Acces libre</option>
                  <option value="Prive">Prive</option>
                </select>
              </label>
              <label>
                Statut
                <select name="status" defaultValue="DRAFT">
                  {eventStatusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Responsable
                <select name="responsibleId" defaultValue="">
                  <option value="">Non defini</option>
                  {users.map((item) => (
                    <option key={item.id} value={item.id}>
                      {`${item.lastName} ${item.firstName}`}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Description
                <textarea name="description" placeholder="Brief, objectifs, contraintes..." />
              </label>
              <label className="wide-field">
                Besoins production
                <textarea name="productionNeeds" placeholder="Scene, son, lumiere, captation, backline, securite..." />
              </label>
              <label className="wide-field">
                Risques / contraintes
                <textarea name="riskNotes" placeholder="Autorisation, acces, meteo, securite, protocole..." />
              </label>
            </div>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : 'Creer l evenement'}
            </button>
          </form>
        ) : (
          <section className="settings-card">
            <p className="approval-empty">Votre role permet de consulter les evenements, pas d'en creer.</p>
          </section>
        )}

        <section className="event-list-panel settings-card">
          <div className="settings-panel-heading">
            <div>
              <p className="eyebrow">Calendrier</p>
              <h2>{events.length} evenement(s).</h2>
            </div>
            <button type="button" className="secondary-button bordered" onClick={refreshEvents}>
              Actualiser
            </button>
          </div>
          {isLoading ? (
            <p className="approval-empty">Chargement des evenements...</p>
          ) : events.length === 0 ? (
            <p className="approval-empty">Aucun evenement cree pour le moment.</p>
          ) : (
            <div className="event-card-list">
              {events.map((event) => (
                <button
                  type="button"
                  className={`event-row-card ${selectedEvent?.id === event.id ? 'active' : ''}`}
                  key={event.id}
                  onClick={() => setSelectedEventId(event.id)}
                >
                  <span>{formatDateTime(new Date(event.startsAt))}</span>
                  <strong>{event.title}</strong>
                  <small>{eventStatusLabel(event.status)}</small>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedEvent && (
        <section className="event-detail-grid">
          <article className="settings-card event-summary-card">
            <div className="settings-panel-heading">
              <div>
                <p className="eyebrow">Fiche evenement</p>
                <h2>{selectedEvent.title}</h2>
                <p>{selectedEvent.description || 'Aucune description renseignee.'}</p>
              </div>
              {canManageEvent ? (
                <select
                  value={selectedEvent.status}
                  onChange={(event) => updateEventStatus(event.target.value)}
                >
                  {eventStatusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="role-badge">{eventStatusLabel(selectedEvent.status)}</span>
              )}
            </div>
            <div className="settings-meta-grid">
              <article>
                <span>Debut</span>
                <strong>{formatDateTime(new Date(selectedEvent.startsAt))}</strong>
              </article>
              <article>
                <span>Budget</span>
                <strong>
                  {selectedEvent.budgetFcfa ? formatFcfa(selectedEvent.budgetFcfa) : 'Non defini'}
                </strong>
              </article>
              <article>
                <span>Responsable</span>
                <strong>
                  {selectedEvent.responsible
                    ? `${selectedEvent.responsible.lastName} ${selectedEvent.responsible.firstName}`
                    : 'Non defini'}
                </strong>
              </article>
              <article>
                <span>Checklist</span>
                <strong>{completionRate}% pret</strong>
              </article>
            </div>
          </article>

          <article className="settings-card">
            <p className="eyebrow">Planning de production</p>
            {canManageProduction ? (
              <form className="compact-event-form" onSubmit={addProductionStep}>
                <input name="title" type="text" placeholder="Etape de production" required />
                <input name="startsAt" type="datetime-local" />
                <input name="endsAt" type="datetime-local" />
                <select name="ownerId" defaultValue="">
                  <option value="">Responsable</option>
                  {users.map((item) => (
                    <option key={item.id} value={item.id}>
                      {`${item.lastName} ${item.firstName}`}
                    </option>
                  ))}
                </select>
                <select name="status" defaultValue="IN_PREPARATION">
                  {eventStatusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <input name="notes" type="text" placeholder="Notes" />
                <button type="submit" className="primary-button" disabled={isSaving}>
                  Ajouter
                </button>
              </form>
            ) : (
              <p className="approval-empty">Planning consultable en lecture seule pour votre role.</p>
            )}
            <ul className="event-timeline">
              {selectedEvent.steps.map((step) => (
                <li key={step.id}>
                  <CalendarDays size={18} aria-hidden="true" />
                  <div>
                    <strong>{step.title}</strong>
                    <span>
                      {step.startsAt ? formatDateInput(step.startsAt).replace('T', ' ') : 'Date a definir'} -{' '}
                      {eventStatusLabel(step.status)}
                    </span>
                  </div>
                </li>
              ))}
              {selectedEvent.steps.length === 0 && <li>Aucune etape de production.</li>}
            </ul>
          </article>

          <article className="settings-card">
            <p className="eyebrow">Checklist avant evenement</p>
            {canManageEvent ? (
              <form className="compact-event-form two" onSubmit={addChecklistItem}>
                <input name="title" type="text" placeholder="Element a verifier" required />
                <input name="dueAt" type="datetime-local" />
                <button type="submit" className="primary-button" disabled={isSaving}>
                  Ajouter
                </button>
              </form>
            ) : (
              <p className="approval-empty">Checklist visible sans modification pour votre role.</p>
            )}
            <ul className="event-checklist">
              {selectedEvent.checklist.map((item) => (
                <li key={item.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={item.isDone}
                      disabled={!canManageEvent || isSaving}
                      onChange={() => toggleChecklistItem(item)}
                    />
                    <span>{item.title}</span>
                  </label>
                  {item.dueAt && <small>{formatDateTime(new Date(item.dueAt))}</small>}
                </li>
              ))}
              {selectedEvent.checklist.length === 0 && <li>Aucun element de checklist.</li>}
            </ul>
          </article>

          <article className="settings-card">
            <p className="eyebrow">Responsables affectes</p>
            {canManageProduction ? (
              <form className="compact-event-form two" onSubmit={addAssignment}>
                <select name="userId" required defaultValue="">
                  <option value="">Choisir un utilisateur</option>
                  {users.map((item) => (
                    <option key={item.id} value={item.id}>
                      {`${item.lastName} ${item.firstName}`}
                    </option>
                  ))}
                </select>
                <input name="roleNote" type="text" placeholder="Mission sur l'evenement" />
                <button type="submit" className="primary-button" disabled={isSaving}>
                  Affecter
                </button>
              </form>
            ) : (
              <p className="approval-empty">Affectations visibles sans modification pour votre role.</p>
            )}
            <ul className="compact-list">
              {selectedEvent.assignments.map((assignment) => (
                <li key={assignment.id}>
                  <span>{`${assignment.user.lastName} ${assignment.user.firstName}`}</span>
                  <strong>{assignment.roleNote || 'Responsable'}</strong>
                </li>
              ))}
              {selectedEvent.assignments.length === 0 && <li>Aucune affectation.</li>}
            </ul>
          </article>

          <article className="settings-card event-documents">
            <p className="eyebrow">Pieces jointes</p>
            {canAttachDocument ? (
              <form className="compact-event-form" onSubmit={addAttachment}>
                <input name="label" type="text" placeholder="Contrat, devis, fiche..." required />
                <select name="type" defaultValue="CONTRACT">
                  {eventAttachmentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <input name="url" type="url" placeholder="Lien document" />
                <input name="file" type="file" />
                <button type="submit" className="primary-button" disabled={isSaving}>
                  Ajouter
                </button>
              </form>
            ) : (
              <p className="approval-empty">Pieces jointes consultables uniquement pour votre role.</p>
            )}
            <div className="document-grid">
              {selectedEvent.attachments.map((attachment) => (
                <a href={attachment.url} target="_blank" rel="noreferrer" key={attachment.id}>
                  <ClipboardCheck size={18} aria-hidden="true" />
                  <span>{attachment.label}</span>
                  <small>{eventAttachmentLabel(attachment.type)}</small>
                </a>
              ))}
              {selectedEvent.attachments.length === 0 && <p>Aucune piece jointe.</p>}
            </div>
          </article>
        </section>
      )}
    </section>
  )
}

function FinancePage({ isAdmin }) {
  return (
    <section className="module-page">
      <ModuleHeader
        description="Suivez les revenus, les depenses et les validations financieres avec une lecture directe en FCFA."
        icon={Wallet}
        label="Controle financier"
        title="Finance."
      />
      <FinanceWorkspacePage isAdmin={isAdmin} />
    </section>
  )
}

function TeamPage({ onHrEvent, pendingCount, user }) {
  const canManageHr = user.roleValues.includes('RH') || user.roleValues.includes('ADMIN')
  const [overview, setOverview] = useState(null)
  const [events, setEvents] = useState([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(canManageHr)
  const [isSaving, setIsSaving] = useState(false)
  const staffRows = overview?.staff ?? []
  const selectedStaff =
    staffRows.find((staff) => staff.id === selectedStaffId) ?? staffRows[0] ?? null

  const refreshHr = useCallback(async () => {
    if (!canManageHr) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setNotice('')

    try {
      const [nextOverview, nextEvents] = await Promise.all([
        api.getHrOverview(),
        api.getEvents().catch(() => []),
      ])
      setOverview(nextOverview)
      setEvents(nextEvents)
      setSelectedStaffId((current) => current || nextOverview.staff[0]?.id || '')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [canManageHr])

  useEffect(() => {
    if (!canManageHr) {
      return undefined
    }

    let isMounted = true

    Promise.all([api.getHrOverview(), api.getEvents().catch(() => [])])
      .then(([nextOverview, nextEvents]) => {
        if (!isMounted) {
          return
        }

        setOverview(nextOverview)
        setEvents(nextEvents)
        setSelectedStaffId(nextOverview.staff[0]?.id || '')
      })
      .catch((error) => {
        if (isMounted) {
          setNotice(error.message)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [canManageHr])

  const syncHrAction = async (message) => {
    await refreshHr()
    setNotice(message)
    onHrEvent(message)
  }

  const submitProfile = async (event) => {
    event.preventDefault()

    if (!selectedStaff) {
      return
    }

    const formData = new FormData(event.currentTarget)
    setIsSaving(true)
    setNotice('')

    try {
      await api.updateStaffProfile(selectedStaff.id, {
        internalRole: getFormValue(formData, 'internalRole'),
        department: getFormValue(formData, 'department'),
        availability: getFormValue(formData, 'availability') || 'AVAILABLE',
        availabilityNotes: buildStructuredNotes(formData, 'availabilityNotes', [
          { label: 'Competences fortes', name: 'skills' },
          { label: 'Mobilite', name: 'mobility' },
          { label: 'Missions preferees', name: 'preferredTasks' },
          { label: 'Certifications / habilitations', name: 'certifications' },
        ]),
        emergencyContact: getFormValue(formData, 'emergencyContact'),
        hireDate: getFormValue(formData, 'hireDate'),
      })
      await syncHrAction('Profil RH mis a jour.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const submitContract = async (event) => {
    event.preventDefault()

    if (!selectedStaff) {
      return
    }

    const formData = new FormData(event.currentTarget)
    setIsSaving(true)
    setNotice('')

    try {
      await api.createStaffContract(selectedStaff.id, {
        title: getFormValue(formData, 'title'),
        type: getFormValue(formData, 'type') || 'AUTRE',
        status: getFormValue(formData, 'status') || 'ACTIVE',
        startsAt: getFormValue(formData, 'startsAt'),
        endsAt: getFormValue(formData, 'endsAt'),
        salaryFcfa: Number(getFormValue(formData, 'salaryFcfa') || 0),
        fileUrl: getFormValue(formData, 'fileUrl'),
        notes: buildStructuredNotes(formData, 'notes', [
          { label: 'Reference contrat', name: 'contractReference' },
          { label: 'Cycle de paiement', name: 'paymentCycle' },
          { label: 'Avantages / primes', name: 'benefits' },
          { label: 'Clause sensible', name: 'confidentialityClause' },
        ]),
      })
      event.currentTarget.reset()
      await syncHrAction('Contrat ajoute au dossier RH.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const submitDocument = async (event) => {
    event.preventDefault()

    if (!selectedStaff) {
      return
    }

    const formData = new FormData(event.currentTarget)
    setIsSaving(true)
    setNotice('')

    try {
      const file = formData.get('file')
      const fileUrl = await fileToDataUrl(file)
      await api.createStaffDocument(selectedStaff.id, {
        label: getFormValue(formData, 'label'),
        type: getFormValue(formData, 'type') || 'OTHER',
        url: fileUrl || getFormValue(formData, 'url'),
        fileName: file instanceof File ? file.name : undefined,
        mimeType: file instanceof File ? file.type : undefined,
      })
      event.currentTarget.reset()
      await syncHrAction('Document administratif ajoute.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const submitMission = async (event) => {
    event.preventDefault()

    if (!selectedStaff) {
      return
    }

    const formData = new FormData(event.currentTarget)
    setIsSaving(true)
    setNotice('')

    try {
      await api.createStaffMission(selectedStaff.id, {
        title: getFormValue(formData, 'title'),
        eventId: getFormValue(formData, 'eventId'),
        roleNote: getFormValue(formData, 'roleNote'),
        status: getFormValue(formData, 'status') || 'PLANNED',
        startsAt: getFormValue(formData, 'startsAt'),
        endsAt: getFormValue(formData, 'endsAt'),
        notes: buildStructuredNotes(formData, 'notes', [
          { label: 'Heure de convocation', name: 'callTime' },
          { label: 'Lieu de mission', name: 'missionLocation' },
          { label: 'Materiel necessaire', name: 'equipmentNeeds' },
          { label: 'Contact terrain', name: 'reportingContact' },
        ]),
      })
      event.currentTarget.reset()
      await syncHrAction('Mission affectee au personnel.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="module-page">
      <ModuleHeader
        description="Gerez le personnel, les disponibilites, contrats, documents administratifs et missions evenementielles."
        icon={Users}
        label={canManageHr ? 'Dashboard RH' : 'Equipe'}
        title={canManageHr ? 'Equipe et RH.' : 'Equipe.'}
      />

      {notice && <p className="auth-notice">{notice}</p>}

      <section className="workflow-stats">
        <article className="visual-panel">
          <span>Personnel</span>
          <strong>{overview?.totals.personnel ?? 0}</strong>
        </article>
        <article className="visual-panel">
          <span>Disponibles</span>
          <strong>{overview?.totals.available ?? 0}</strong>
        </article>
        <article className="visual-panel">
          <span>Contrats actifs</span>
          <strong>{overview?.totals.contractsActive ?? 0}</strong>
        </article>
        <article className="visual-panel">
          <span>Missions</span>
          <strong>{overview?.totals.missionsUpcoming ?? 0}</strong>
        </article>
      </section>

      {!canManageHr && (
        <section className="settings-card">
          <p className="approval-empty">
            Le module RH complet est reserve aux profils RH et Admin.
          </p>
        </section>
      )}

      {canManageHr && (
        <section className="hr-board">
          <aside className="settings-card hr-staff-list" aria-label="Liste du personnel">
            <div className="settings-panel-heading">
              <div>
                <p className="eyebrow">Personnel</p>
                <h2>Liste active.</h2>
              </div>
              <button type="button" className="secondary-button bordered" onClick={refreshHr}>
                Actualiser
              </button>
            </div>
            {staffRows.map((staff) => (
              <button
                type="button"
                className={`hr-staff-card ${selectedStaff?.id === staff.id ? 'active' : ''}`}
                key={staff.id}
                onClick={() => setSelectedStaffId(staff.id)}
              >
                <span className="hr-avatar">
                  {staff.photoUrl ? <img src={staff.photoUrl} alt="" /> : userDisplayName(staff).slice(0, 2)}
                </span>
                <strong>{userDisplayName(staff)}</strong>
                <small>{staff.profile?.internalRole || staff.roles?.[0]?.label || 'Collaborateur'}</small>
                <em>{staffAvailabilityLabel(staff.profile?.availability || 'AVAILABLE')}</em>
              </button>
            ))}
            {staffRows.length === 0 && (
              <p className="approval-empty">
                {isLoading ? 'Chargement du personnel...' : 'Aucun personnel actif.'}
              </p>
            )}
          </aside>

          <article className="settings-card hr-detail">
            {selectedStaff ? (
              <>
                <div className="settings-panel-heading">
                  <div>
                    <p className="eyebrow">Dossier RH</p>
                    <h2>{userDisplayName(selectedStaff)}</h2>
                    <p>
                      {selectedStaff.email} - {selectedStaff.phone || 'Contact non renseigne'}
                    </p>
                  </div>
                  <span className="role-badge">
                    {selectedStaff.roles?.map((role) => role.label).join(', ') || 'Utilisateur'}
                  </span>
                </div>

                <div className="settings-meta-grid">
                  <article>
                    <span>Adresse</span>
                    <strong>{selectedStaff.address || 'Non renseignee'}</strong>
                  </article>
                  <article>
                    <span>Disponibilite</span>
                    <strong>{staffAvailabilityLabel(selectedStaff.profile?.availability || 'AVAILABLE')}</strong>
                  </article>
                  <article>
                    <span>Contrats</span>
                    <strong>{selectedStaff.contracts.length}</strong>
                  </article>
                  <article>
                    <span>Missions historiques</span>
                    <strong>{selectedStaff.missions.length + selectedStaff.eventAssignments.length}</strong>
                  </article>
                </div>

                <section className="hr-section">
                  <p className="eyebrow">Profil utilisateur RH</p>
                  <form className="compact-event-form" onSubmit={submitProfile}>
                    <input
                      name="internalRole"
                      type="text"
                      defaultValue={selectedStaff.profile?.internalRole ?? ''}
                      placeholder="Role interne"
                    />
                    <input
                      name="department"
                      type="text"
                      defaultValue={selectedStaff.profile?.department ?? ''}
                      placeholder="Departement"
                    />
                    <select name="availability" defaultValue={selectedStaff.profile?.availability ?? 'AVAILABLE'}>
                      {staffAvailabilityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      name="availabilityNotes"
                      type="text"
                      defaultValue={selectedStaff.profile?.availabilityNotes ?? ''}
                      placeholder="Notes disponibilite"
                    />
                    <input name="skills" type="text" placeholder="Competences fortes" />
                    <input name="mobility" type="text" placeholder="Mobilite / zones possibles" />
                    <input name="preferredTasks" type="text" placeholder="Missions preferees" />
                    <input name="certifications" type="text" placeholder="Certifications / habilitations" />
                    <input
                      name="emergencyContact"
                      type="text"
                      defaultValue={selectedStaff.profile?.emergencyContact ?? ''}
                      placeholder="Contact urgence"
                    />
                    <input
                      name="hireDate"
                      type="date"
                      defaultValue={selectedStaff.profile?.hireDate?.slice(0, 10) ?? ''}
                    />
                    <button type="submit" className="primary-button" disabled={isSaving}>
                      Enregistrer
                    </button>
                  </form>
                </section>

                <section className="hr-section-grid">
                  <article className="hr-section">
                    <p className="eyebrow">Contrats</p>
                    <form className="compact-event-form" onSubmit={submitContract}>
                      <input name="title" type="text" placeholder="Contrat, prestation..." required />
                      <select name="type" defaultValue="AUTRE">
                        {staffContractTypes.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select name="status" defaultValue="ACTIVE">
                        {staffContractStatuses.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input name="startsAt" type="date" />
                      <input name="endsAt" type="date" />
                      <input name="salaryFcfa" type="number" min="0" placeholder="Montant FCFA" />
                      <input name="contractReference" type="text" placeholder="Reference contrat" />
                      <input name="paymentCycle" type="text" placeholder="Mensuel, mission, cachet..." />
                      <input name="benefits" type="text" placeholder="Primes, transport, repas..." />
                      <input name="confidentialityClause" type="text" placeholder="Clause sensible / NDA" />
                      <input name="fileUrl" type="url" placeholder="Lien fichier" />
                      <input name="notes" type="text" placeholder="Notes" />
                      <button type="submit" className="primary-button" disabled={isSaving}>
                        Ajouter contrat
                      </button>
                    </form>
                    <ul className="compact-list">
                      {selectedStaff.contracts.map((contract) => (
                        <li key={contract.id}>
                          <span>{contract.title}</span>
                          <strong>
                            {staffContractTypeLabel(contract.type)} - {staffContractStatusLabel(contract.status)}
                          </strong>
                        </li>
                      ))}
                      {selectedStaff.contracts.length === 0 && <li>Aucun contrat.</li>}
                    </ul>
                  </article>

                  <article className="hr-section">
                    <p className="eyebrow">Documents administratifs</p>
                    <form className="compact-event-form" onSubmit={submitDocument}>
                      <input name="label" type="text" placeholder="Document" required />
                      <select name="type" defaultValue="OTHER">
                        {staffDocumentTypes.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input name="url" type="url" placeholder="Lien" />
                      <input name="file" type="file" />
                      <button type="submit" className="primary-button" disabled={isSaving}>
                        Ajouter document
                      </button>
                    </form>
                    <div className="document-grid">
                      {selectedStaff.documents.map((document) => (
                        <a href={document.url} target="_blank" rel="noreferrer" key={document.id}>
                          <FileText size={18} aria-hidden="true" />
                          <span>{document.label}</span>
                          <small>{staffDocumentTypeLabel(document.type)}</small>
                        </a>
                      ))}
                      {selectedStaff.documents.length === 0 && <p>Aucun document.</p>}
                    </div>
                  </article>
                </section>

                <section className="hr-section">
                  <p className="eyebrow">Affectation aux evenements et missions</p>
                  <form className="compact-event-form" onSubmit={submitMission}>
                    <input name="title" type="text" placeholder="Mission" required />
                    <select name="eventId" defaultValue="">
                      <option value="">Sans evenement lie</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.title}
                        </option>
                      ))}
                    </select>
                    <input name="roleNote" type="text" placeholder="Role sur mission" />
                    <select name="status" defaultValue="PLANNED">
                      {staffMissionStatuses.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input name="startsAt" type="datetime-local" />
                    <input name="endsAt" type="datetime-local" />
                    <input name="callTime" type="datetime-local" />
                    <input name="missionLocation" type="text" placeholder="Lieu de mission" />
                    <input name="equipmentNeeds" type="text" placeholder="Materiel / tenue / badge" />
                    <input name="reportingContact" type="text" placeholder="Contact terrain" />
                    <input name="notes" type="text" placeholder="Notes" />
                    <button type="submit" className="primary-button" disabled={isSaving}>
                      Affecter
                    </button>
                  </form>
                  <div className="activity-list workflow-timeline">
                    {selectedStaff.missions.map((mission) => (
                      <article key={mission.id}>
                        <UserCheck size={18} aria-hidden="true" />
                        <div>
                          <strong>{mission.title}</strong>
                          <span>
                            {staffMissionStatusLabel(mission.status)}
                            {mission.event ? ` - ${mission.event.title}` : ''}
                          </span>
                          {mission.roleNote && <small>{mission.roleNote}</small>}
                        </div>
                      </article>
                    ))}
                    {selectedStaff.eventAssignments.map((assignment) => (
                      <article key={assignment.id}>
                        <CalendarDays size={18} aria-hidden="true" />
                        <div>
                          <strong>{assignment.event.title}</strong>
                          <span>Affectation evenement</span>
                          {assignment.roleNote && <small>{assignment.roleNote}</small>}
                        </div>
                      </article>
                    ))}
                    {selectedStaff.missions.length + selectedStaff.eventAssignments.length === 0 && (
                      <p className="approval-empty">Aucune mission pour ce profil.</p>
                    )}
                  </div>
                </section>
              </>
            ) : (
              <p className="approval-empty">Selectionnez un membre du personnel.</p>
            )}
          </article>
        </section>
      )}

      {canManageHr && pendingCount > 0 && (
        <section className="settings-card">
          <p className="approval-empty">
            {pendingCount} demande(s) d'inscription attendent encore une validation Admin.
          </p>
        </section>
      )}
    </section>
  )
}

function BudgetWorkspacePage() {
  const [summary, setSummary] = useState(null)
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    api
      .getFinanceSummary()
      .then((result) => {
        if (isMounted) {
          setSummary(result)
        }
      })
      .catch((error) => {
        if (isMounted) {
          setNotice(error.message)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const approvedPercent = Math.min(
    100,
    ((summary?.totals.approvedBudgetFcfa ?? 0) /
      Math.max(summary?.totals.plannedBudgetFcfa ?? 1, 1)) *
      100,
  )

  return (
    <>
      {notice && <p className="auth-notice">{notice}</p>}
      <div className="budget-grid">
        <article className="visual-panel">
          <p className="eyebrow">Budget previsionnel</p>
          <strong className="big-money">{formatFcfa(summary?.totals.plannedBudgetFcfa ?? 0)}</strong>
          <div className="budget-meter">
            <span style={{ '--progress': `${approvedPercent}%` }}></span>
          </div>
          <p>{formatFcfa(summary?.totals.approvedBudgetFcfa ?? 0)} deja valide par l'Admin.</p>
        </article>
        <article className="visual-panel">
          <p className="eyebrow">Depenses reelles</p>
          <strong className="big-money">{formatFcfa(summary?.totals.actualExpensesFcfa ?? 0)}</strong>
          <ul className="compact-list">
            <li>
              <span>Paiements effectues</span>
              <strong>{formatFcfa(summary?.totals.paidFcfa ?? 0)}</strong>
            </li>
            <li>
              <span>Paiements en attente</span>
              <strong>{formatFcfa(summary?.totals.pendingPaymentsFcfa ?? 0)}</strong>
            </li>
            <li>
              <span>Depassement</span>
              <strong>{formatFcfa(summary?.totals.overBudgetFcfa ?? 0)}</strong>
            </li>
          </ul>
        </article>
      </div>
      <section className="settings-card">
        <div className="settings-panel-heading">
          <div>
            <p className="eyebrow">Alertes budget</p>
            <h2>Evenements au-dessus de la limite.</h2>
          </div>
        </div>
        {isLoading ? (
          <p className="approval-empty">Chargement des budgets...</p>
        ) : summary?.alerts.length ? (
          <ul className="compact-list">
            {summary.alerts.map((event) => (
              <li key={event.eventId}>
                <span>{event.title}</span>
                <strong>
                  {formatFcfa(event.actualExpensesFcfa)} / {formatFcfa(event.limitFcfa)}
                </strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="approval-empty">Aucun depassement budgetaire detecte.</p>
        )}
      </section>
    </>
  )
}

function BudgetPage() {
  return (
    <section className="module-page">
      <ModuleHeader
        description="Visualisez les enveloppes, les engagements, les validations Admin et les depassements."
        icon={Banknote}
        label="Budget"
        title="Budget."
      />
      <BudgetWorkspacePage />
    </section>
  )
}

function WorkflowPage({ onWorkflowEvent, user }) {
  const [workflows, setWorkflows] = useState([])
  const [events, setEvents] = useState([])
  const [users, setUsers] = useState([])
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('')
  const [decisionNote, setDecisionNote] = useState('')
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const isAdmin = user.roleValues.includes('ADMIN')
  const canCreate = isAdmin || user.roleValues.includes('COMMERCIAL')
  const canBudget = isAdmin || user.roleValues.includes('COMPTABLE')
  const canAssign = isAdmin || user.roleValues.includes('RH')
  const selectedWorkflow =
    workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? workflows[0]

  const refreshWorkflows = useCallback(async () => {
    setIsLoading(true)
    setNotice('')

    try {
      const [nextWorkflows, nextEvents, nextUsers] = await Promise.all([
        api.getWorkflows(),
        api.getEvents().catch(() => []),
        api.getUsers().catch(() => []),
      ])

      setWorkflows(nextWorkflows)
      setEvents(nextEvents)
      setUsers(nextUsers)
      setSelectedWorkflowId((current) => current || nextWorkflows[0]?.id || '')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    Promise.all([
      api.getWorkflows(),
      api.getEvents().catch(() => []),
      api.getUsers().catch(() => []),
    ])
      .then(([nextWorkflows, nextEvents, nextUsers]) => {
        if (!isMounted) {
          return
        }

        setWorkflows(nextWorkflows)
        setEvents(nextEvents)
        setUsers(nextUsers)
        setSelectedWorkflowId(nextWorkflows[0]?.id || '')
      })
      .catch((error) => {
        if (isMounted) {
          setNotice(error.message)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const syncWorkflow = (updatedWorkflow) => {
    setWorkflows((current) => {
      const exists = current.some((workflow) => workflow.id === updatedWorkflow.id)

      if (!exists) {
        return [updatedWorkflow, ...current]
      }

      return current.map((workflow) => (workflow.id === updatedWorkflow.id ? updatedWorkflow : workflow))
    })
    setSelectedWorkflowId(updatedWorkflow.id)
  }

  const submitWorkflow = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setIsSaving(true)
    setNotice('')

    try {
      const workflow = await api.createWorkflow({
        title: getFormValue(formData, 'title'),
        description: buildStructuredNotes(formData, 'description', [
          { label: 'Priorite', name: 'priority' },
          { label: 'Impact budget', name: 'budgetImpact' },
          { label: 'Besoin RH', name: 'hrNeed' },
          { label: 'Livrable attendu', name: 'expectedDeliverable' },
          { label: 'Echeance souhaitee', name: 'dueAt' },
        ]),
        eventId: getFormValue(formData, 'eventId'),
      })
      syncWorkflow(workflow)
      event.currentTarget.reset()
      setNotice('Demande creee et envoyee au Comptable.')
      onWorkflowEvent('Workflow cree')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const submitBudget = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    if (!selectedWorkflow) {
      return
    }

    setIsSaving(true)
    setNotice('')

    try {
      const workflow = await api.addWorkflowBudget(selectedWorkflow.id, {
        budgetAmountFcfa: Number(getFormValue(formData, 'budgetAmountFcfa') || 0),
        budgetNotes: getFormValue(formData, 'budgetNotes'),
      })
      syncWorkflow(workflow)
      event.currentTarget.reset()
      setNotice('Budget ajoute et transmis a la RH.')
      onWorkflowEvent('Budget workflow ajoute')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const submitAssignees = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const userIds = formData.getAll('userIds').map(String).filter(Boolean)

    if (!selectedWorkflow || userIds.length === 0) {
      setNotice('Selectionnez au moins une personne.')
      return
    }

    setIsSaving(true)
    setNotice('')

    try {
      const workflow = await api.assignWorkflowPeople(selectedWorkflow.id, {
        assignees: userIds.map((userId) => ({
          userId,
          roleNote: getFormValue(formData, 'roleNote'),
        })),
      })
      syncWorkflow(workflow)
      event.currentTarget.reset()
      setNotice('Responsables affectes et demande envoyee a l Admin.')
      onWorkflowEvent('Affectation RH effectuee')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const decideWorkflow = async (action) => {
    if (!selectedWorkflow) {
      return
    }

    setIsSaving(true)
    setNotice('')

    try {
      const workflow =
        action === 'approve'
          ? await api.approveWorkflow(selectedWorkflow.id, { note: decisionNote })
          : await api.rejectWorkflow(selectedWorkflow.id, { note: decisionNote })
      syncWorkflow(workflow)
      setDecisionNote('')
      setNotice(action === 'approve' ? 'Demande validee.' : 'Demande refusee.')
      onWorkflowEvent(action === 'approve' ? 'Workflow valide' : 'Workflow refuse')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="module-page">
      <ModuleHeader
        description="Suivez la chaine Commercial, Comptable, RH et Admin avec un journal complet des actions."
        icon={Layers}
        label="Workflow"
        title="Validation interne."
      />

      {notice && <p className="auth-notice">{notice}</p>}

      <section className="workflow-stats">
        <article className="visual-panel">
          <span>Demandes</span>
          <strong>{workflows.length}</strong>
        </article>
        <article className="visual-panel">
          <span>Budget attendu</span>
          <strong>{workflows.filter((workflow) => workflow.status === 'PENDING_BUDGET').length}</strong>
        </article>
        <article className="visual-panel">
          <span>Validation Admin</span>
          <strong>{workflows.filter((workflow) => workflow.status === 'PENDING_ADMIN').length}</strong>
        </article>
        <article className="visual-panel">
          <span>Validees</span>
          <strong>{workflows.filter((workflow) => workflow.status === 'APPROVED').length}</strong>
        </article>
      </section>

      {canCreate && (
        <section className="settings-card">
          <div className="settings-panel-heading">
            <div>
              <p className="eyebrow">Commercial</p>
              <h2>Creer une demande.</h2>
            </div>
          </div>
          <form className="compact-event-form" onSubmit={submitWorkflow}>
            <input name="title" type="text" placeholder="Demande client, prestation, production..." required />
            <select name="eventId" defaultValue="">
              <option value="">Sans evenement lie</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
            <select name="priority" defaultValue="Normale">
              <option value="Basse">Priorite basse</option>
              <option value="Normale">Priorite normale</option>
              <option value="Haute">Priorite haute</option>
              <option value="Urgente">Priorite urgente</option>
            </select>
            <input name="budgetImpact" type="text" placeholder="Impact budget / enveloppe" />
            <input name="hrNeed" type="text" placeholder="Besoin RH / profils" />
            <input name="expectedDeliverable" type="text" placeholder="Livrable attendu" />
            <input name="dueAt" type="datetime-local" />
            <input name="description" type="text" placeholder="Description courte" />
            <button type="submit" className="primary-button" disabled={isSaving}>
              Creer
            </button>
          </form>
        </section>
      )}

      <section className="workflow-board">
        <aside className="workflow-list settings-card" aria-label="Liste des workflows">
          <div className="settings-panel-heading">
            <div>
              <p className="eyebrow">Demandes</p>
              <h2>File de validation.</h2>
            </div>
            <button type="button" className="secondary-button bordered" onClick={refreshWorkflows}>
              Actualiser
            </button>
          </div>
          {workflows.map((workflow) => (
            <button
              type="button"
              className={`workflow-card ${selectedWorkflow?.id === workflow.id ? 'active' : ''}`}
              key={workflow.id}
              onClick={() => setSelectedWorkflowId(workflow.id)}
            >
              <span>{workflowStatusLabel(workflow.status)}</span>
              <strong>{workflow.title}</strong>
              <small>{workflow.event?.title ?? 'Demande autonome'}</small>
            </button>
          ))}
          {workflows.length === 0 && (
            <p className="approval-empty">
              {isLoading ? 'Chargement des workflows...' : 'Aucune demande de validation.'}
            </p>
          )}
        </aside>

        <article className="settings-card workflow-detail">
          {selectedWorkflow ? (
            <>
              <div className="settings-panel-heading">
                <div>
                  <p className="eyebrow">{workflowStatusLabel(selectedWorkflow.status)}</p>
                  <h2>{selectedWorkflow.title}</h2>
                  <p>{selectedWorkflow.description || 'Aucune description.'}</p>
                </div>
                <span className="role-badge">{workflowStatusLabel(selectedWorkflow.status)}</span>
              </div>

              <div className="settings-meta-grid">
                <article>
                  <span>Demandeur</span>
                  <strong>{userDisplayName(selectedWorkflow.requester)}</strong>
                </article>
                <article>
                  <span>Evenement</span>
                  <strong>{selectedWorkflow.event?.title ?? 'Non lie'}</strong>
                </article>
                <article>
                  <span>Budget</span>
                  <strong>{formatFcfa(selectedWorkflow.budgetAmountFcfa ?? 0)}</strong>
                </article>
                <article>
                  <span>Responsables</span>
                  <strong>{selectedWorkflow.assignees.length}</strong>
                </article>
              </div>

              <div className="workflow-actions-grid">
                {canBudget && selectedWorkflow.status === 'PENDING_BUDGET' && (
                  <form className="compact-event-form" onSubmit={submitBudget}>
                    <input
                      name="budgetAmountFcfa"
                      type="number"
                      min="0"
                      placeholder="Budget en FCFA"
                      required
                    />
                    <input name="budgetNotes" type="text" placeholder="Notes budget" />
                    <button type="submit" className="primary-button" disabled={isSaving}>
                      Ajouter budget
                    </button>
                  </form>
                )}

                {canAssign && selectedWorkflow.status === 'PENDING_RH' && (
                  <form className="compact-event-form" onSubmit={submitAssignees}>
                    <select name="userIds" multiple required>
                      {users.map((item) => (
                        <option key={item.id} value={item.id}>
                          {userDisplayName(item)}
                        </option>
                      ))}
                    </select>
                    <input name="roleNote" type="text" placeholder="Mission ou responsabilite" />
                    <button type="submit" className="primary-button" disabled={isSaving}>
                      Affecter
                    </button>
                  </form>
                )}

                {isAdmin && selectedWorkflow.status === 'PENDING_ADMIN' && (
                  <div className="workflow-decision-box">
                    <input
                      type="text"
                      value={decisionNote}
                      onChange={(event) => setDecisionNote(event.target.value)}
                      placeholder="Note ou motif de decision"
                    />
                    <div className="approval-actions">
                    <button
                      type="button"
                      className="primary-button"
                      disabled={isSaving}
                      onClick={() => decideWorkflow('approve')}
                    >
                      <CheckCircle2 size={16} />
                      Valider
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={isSaving}
                      onClick={() => decideWorkflow('reject')}
                    >
                      <XCircle size={16} />
                      Refuser
                    </button>
                    </div>
                  </div>
                )}
              </div>

              <section className="workflow-section">
                <p className="eyebrow">Responsables affectes</p>
                <ul className="compact-list">
                  {selectedWorkflow.assignees.map((assignee) => (
                    <li key={assignee.id}>
                      <span>{userDisplayName(assignee.user)}</span>
                      <strong>{assignee.roleNote || 'Responsable'}</strong>
                    </li>
                  ))}
                  {selectedWorkflow.assignees.length === 0 && <li>Aucune personne affectee.</li>}
                </ul>
              </section>

              <section className="workflow-section">
                <p className="eyebrow">Journal du workflow</p>
                <div className="activity-list workflow-timeline">
                  {selectedWorkflow.actions.map((action) => (
                    <article key={action.id}>
                      <History size={18} aria-hidden="true" />
                      <div>
                        <strong>{workflowActionLabel(action.action)}</strong>
                        <span>
                          {userDisplayName(action.actor)} - {formatDateTime(new Date(action.createdAt))}
                        </span>
                        {action.note && <small>{action.note}</small>}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <p className="approval-empty">Selectionnez une demande pour afficher son suivi.</p>
          )}
        </article>
      </section>
    </section>
  )
}

function AlertsPage({ notificationCount, onNotificationsChanged, onTestSound, onToggleSound, soundEnabled }) {
  const [notifications, setNotifications] = useState([])
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const refreshNotifications = useCallback(async () => {
    setIsLoading(true)
    setNotice('')

    try {
      const [nextNotifications, unread] = await Promise.all([
        api.getNotifications(),
        api.getNotificationCount(),
      ])
      setNotifications(nextNotifications)
      onNotificationsChanged(unread.count ?? 0)
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [onNotificationsChanged])

  useEffect(() => {
    let isMounted = true

    Promise.all([api.getNotifications(), api.getNotificationCount()])
      .then(([nextNotifications, unread]) => {
        if (!isMounted) {
          return
        }

        setNotifications(nextNotifications)
        onNotificationsChanged(unread.count ?? 0)
      })
      .catch((error) => {
        if (isMounted) {
          setNotice(error.message)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [onNotificationsChanged])

  const markAsRead = async (notification) => {
    setIsSaving(true)
    setNotice('')

    try {
      const updated = await api.markNotificationRead(notification.id)
      setNotifications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      onNotificationsChanged(Math.max(notificationCount - 1, 0))
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const sendReminders = async () => {
    setIsSaving(true)
    setNotice('')

    try {
      const result = await api.sendEventReminders()
      await refreshNotifications()
      setNotice(`${result.createdCount} rappel(s) evenement cree(s).`)
      onTestSound()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="module-page">
      <ModuleHeader
        description="Centralisez les alertes in-app, email, WhatsApp, SMS et les rappels automatiques avant evenement."
        icon={Bell}
        label="Alertes"
        title="Alertes."
      />
      {notice && <p className="auth-notice">{notice}</p>}
      <div className="alert-toolbar">
        <button type="button" className="secondary-button bordered" onClick={onToggleSound}>
          {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          {soundEnabled ? 'Desactiver le son' : 'Activer le son'}
        </button>
        <button type="button" className="secondary-button bordered" onClick={refreshNotifications}>
          <Bell size={17} />
          Actualiser
        </button>
        <button type="button" className="secondary-button bordered" disabled={isSaving} onClick={sendReminders}>
          <CalendarDays size={17} />
          Rappels evenements
        </button>
        <button type="button" className="primary-button" onClick={onTestSound}>
          <Bell size={17} />
          Tester l'alerte
        </button>
      </div>
      <section className="workflow-stats">
        <article className="visual-panel">
          <span>Non lues</span>
          <strong>{notificationCount}</strong>
        </article>
        <article className="visual-panel">
          <span>Total</span>
          <strong>{notifications.length}</strong>
        </article>
        <article className="visual-panel">
          <span>Budget</span>
          <strong>
            {notifications.filter((item) => item.type === 'BUDGET_PENDING' || item.type === 'BUDGET_OVER_LIMIT').length}
          </strong>
        </article>
        <article className="visual-panel">
          <span>Workflow</span>
          <strong>{notifications.filter((item) => item.type === 'WORKFLOW_UPDATED').length}</strong>
        </article>
      </section>
      <div className="alert-list">
        {notifications.map((notification) => (
          <article
            className={`alert-card notification-card ${notification.readAt ? 'read' : 'unread'}`}
            key={notification.id}
          >
            <AlertTriangle size={22} aria-hidden="true" />
            <div>
              <strong>{notification.title}</strong>
              <span>{notification.message}</span>
              <small>
                {notificationTypeLabel(notification.type)} - {formatDateTime(new Date(notification.createdAt))}
              </small>
            </div>
            <div className="table-actions">
              <em>{notification.readAt ? 'Lue' : 'Non lue'}</em>
              {!notification.readAt && (
                <button
                  type="button"
                  className="secondary-button bordered"
                  disabled={isSaving}
                  onClick={() => markAsRead(notification)}
                >
                  Marquer lue
                </button>
              )}
            </div>
          </article>
        ))}
        {notifications.length === 0 && (
          <p className="approval-empty">
            {isLoading ? 'Chargement des alertes...' : 'Aucune notification pour le moment.'}
          </p>
        )}
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

function SettingsPanel({
  onAdminEvent,
  onCompanyUpdate,
  onInterfacePreferencesUpdate,
  onProfileUpdate,
  onRequestLogout,
  preferences,
  user,
}) {
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
  const [twoFactorSetup, setTwoFactorSetup] = useState(null)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [users, setUsers] = useState([])
  const [activityLog, setActivityLog] = useState([])
  const [selectedUserHistory, setSelectedUserHistory] = useState([])
  const [selectedHistoryUser, setSelectedHistoryUser] = useState(null)
  const [userPasswordDeliveryInfo, setUserPasswordDeliveryInfo] = useState(null)
  const [adminSettings, setAdminSettings] = useState(() => readAdminSettings())
  const [isAdminDataLoading, setIsAdminDataLoading] = useState(false)
  const isAdmin = user.roleValues.includes('ADMIN')
  const interfaceSettings = normalizeInterfacePreferences(preferences)

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

  const persistInterfaceSettings = async (payload, message) => {
    setSavingTarget('interface')
    showNotice('', '')

    try {
      const updatedPreferences = await onInterfacePreferencesUpdate(payload)
      showNotice('success', message)
      onAdminEvent?.(message)
      return updatedPreferences
    } catch (error) {
      showNotice('error', error.message)
      return null
    } finally {
      setSavingTarget('')
    }
  }

  const updateDisplayPreference = (field, value) => {
    persistInterfaceSettings({ [field]: value }, 'Preferences d affichage mises a jour')
  }

  const toggleDisplayWidget = (widget) => {
    persistInterfaceSettings(
      {
        widgets: {
          [widget]: !interfaceSettings.widgets[widget],
        },
      },
      'Widgets du dashboard mis a jour',
    )
  }

  const toggleNavigationPreference = (field) => {
    persistInterfaceSettings(
      {
        navigation: {
          [field]: !interfaceSettings.navigation[field],
        },
      },
      'Navigation du dashboard mise a jour',
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

  const prepareTwoFactor = async () => {
    setSavingTarget('2fa-setup')
    showNotice('', '')

    try {
      const result = await api.setupTwoFactor()
      setTwoFactorSetup(result)
      showNotice('success', 'Secret 2FA genere. Ajoutez-le dans votre application OTP.')
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setSavingTarget('')
    }
  }

  const enableTwoFactor = async () => {
    setSavingTarget('2fa-enable')
    showNotice('', '')

    try {
      await api.enableTwoFactor({ code: twoFactorCode })
      setTwoFactorCode('')
      setTwoFactorSetup(null)
      const updatedProfile = await api.getUserProfile()
      await onProfileUpdate({
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        address: updatedProfile.address,
        email: updatedProfile.email,
        phone: updatedProfile.phone,
        photoUrl: updatedProfile.photoUrl,
      })
      showNotice('success', 'Authentification a deux facteurs activee.')
      onAdminEvent?.('2FA activee')
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setSavingTarget('')
    }
  }

  const disableTwoFactor = async () => {
    setSavingTarget('2fa-disable')
    showNotice('', '')

    try {
      await api.disableTwoFactor({ code: twoFactorCode })
      setTwoFactorCode('')
      const updatedProfile = await api.getUserProfile()
      await onProfileUpdate({
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        address: updatedProfile.address,
        email: updatedProfile.email,
        phone: updatedProfile.phone,
        photoUrl: updatedProfile.photoUrl,
      })
      showNotice('success', 'Authentification a deux facteurs desactivee.')
      onAdminEvent?.('2FA desactivee')
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
        <p className="eyebrow">{isAdmin ? 'Parametres Admin' : `Parametres ${user.role}`}</p>
        <h1>{isAdmin ? 'Compte, securite et entreprise.' : 'Compte, securite et interface.'}</h1>
        <p>
          Mettez a jour vos informations, controlez les sessions actives et adaptez votre espace
          de travail a votre profil.
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
                La 2FA protege le compte Admin avec une application OTP comme Google
                Authenticator, Microsoft Authenticator ou 1Password.
              </p>
              <span className={`status-pill ${user.twoFactorEnabled ? 'active' : 'pending'}`}>
                {user.twoFactorEnabled ? '2FA activee' : '2FA inactive'}
              </span>
              {twoFactorSetup && (
                <div className="two-factor-box">
                  <span>Secret OTP</span>
                  <strong>{twoFactorSetup.secret}</strong>
                  {twoFactorSetup.otpauthUrl && (
                    <a href={twoFactorSetup.otpauthUrl}>Ouvrir dans une application compatible</a>
                  )}
                </div>
              )}
              <label>
                Code OTP
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={twoFactorCode}
                  onChange={(event) => setTwoFactorCode(event.target.value)}
                />
              </label>
              <div className="settings-actions left">
                {!user.twoFactorEnabled && !twoFactorSetup && (
                  <button
                    type="button"
                    className="secondary-button bordered"
                    disabled={savingTarget === '2fa-setup'}
                    onClick={prepareTwoFactor}
                  >
                    {savingTarget === '2fa-setup' ? 'Preparation...' : 'Generer la 2FA'}
                  </button>
                )}
                {!user.twoFactorEnabled && twoFactorSetup && (
                  <button
                    type="button"
                    className="primary-button"
                    disabled={savingTarget === '2fa-enable'}
                    onClick={enableTwoFactor}
                  >
                    {savingTarget === '2fa-enable' ? 'Activation...' : 'Activer la 2FA'}
                  </button>
                )}
                {user.twoFactorEnabled && (
                  <button
                    type="button"
                    className="danger-button"
                    disabled={savingTarget === '2fa-disable'}
                    onClick={disableTwoFactor}
                  >
                    {savingTarget === '2fa-disable' ? 'Desactivation...' : 'Desactiver la 2FA'}
                  </button>
                )}
              </div>
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
          isSaving={savingTarget === 'interface'}
          preferences={interfaceSettings}
          onChange={updateDisplayPreference}
          onToggleNavigation={toggleNavigationPreference}
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

function DisplayPreferencesSettings({
  isSaving,
  onChange,
  onToggleNavigation,
  onToggleWidget,
  preferences,
}) {
  const widgetLabels = {
    alerts: 'Alertes',
    budget: 'Budget',
    clients: 'Clients',
    documents: 'Documents',
    events: 'Evenements',
    finance: 'Finance',
    hr: 'RH',
    reports: 'Rapports',
    workflows: 'Workflows',
  }

  return (
    <div className="settings-card">
      <div className="settings-panel-heading">
        <div>
          <p className="eyebrow">Preferences d'affichage</p>
          <h2>Adapter le dashboard.</h2>
          <p>Ces reglages sont sauvegardes sur votre compte et suivront vos connexions.</p>
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
          Couleur principale
          <input
            type="color"
            value={preferences.primaryColor}
            onChange={(event) => onChange('primaryColor', event.target.value)}
          />
        </label>
        <label>
          Couleur accent
          <input
            type="color"
            value={preferences.accentColor}
            onChange={(event) => onChange('accentColor', event.target.value)}
          />
        </label>
        <label>
          Sidebar
          <select value={preferences.sidebarStyle} onChange={(event) => onChange('sidebarStyle', event.target.value)}>
            <option value="dark">Sombre</option>
            <option value="light">Claire</option>
            <option value="brand">Couleur principale</option>
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
      <div className="interface-preview" aria-label="Apercu des couleurs">
        <span style={{ backgroundColor: preferences.primaryColor }}></span>
        <span style={{ backgroundColor: preferences.accentColor }}></span>
        <strong>{preferences.theme === 'dark' ? 'Theme sombre' : 'Theme clair'}</strong>
        <small>{preferences.language === 'en' ? 'English interface' : 'Interface francaise'}</small>
      </div>
      <div className="settings-section-grid">
        {[
          ['compactSidebar', 'Sidebar compacte'],
          ['showIcons', 'Afficher les icones du menu'],
          ['stickyHeader', 'En-tete fixe'],
        ].map(([field, label]) => (
          <label className="settings-toggle" key={field}>
            <input
              type="checkbox"
              checked={preferences.navigation[field]}
              disabled={isSaving}
              onChange={() => onToggleNavigation(field)}
            />
            {label}
          </label>
        ))}
      </div>
      <div className="settings-section-grid">
        {Object.entries(preferences.widgets).map(([widget, enabled]) => (
          <label className="settings-toggle" key={widget}>
            <input type="checkbox" checked={enabled} disabled={isSaving} onChange={() => onToggleWidget(widget)} />
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
