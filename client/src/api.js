// URL de l'API NestJS. La variable Vite permet de changer d'URL sans modifier le code.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4000/api'

// Supprime les champs vides ou non definis avant d'envoyer le JSON au backend.
const cleanPayload = (payload) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== ''),
  )

// Convertit une image choisie dans un formulaire en Data URL pour le prototype.
// Plus tard, il faudra remplacer cela par un vrai upload fichier cote backend.
export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!(file instanceof File) || file.size === 0) {
      resolve(undefined)
      return
    }

    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error("Impossible de lire l'image selectionnee."))
    reader.readAsDataURL(file)
  })

// Fonction unique pour tous les appels API : JSON, cookies et erreurs coherentes.
const request = async (path, options = {}) => {
  const { skipRefresh, ...fetchOptions } = options
  const hasBody = options.body !== undefined
  const authPathsWithoutRefresh = [
    '/auth/login',
    '/auth/refresh',
    '/auth/google',
    '/auth/phone/verify-otp',
    '/auth/2fa/verify-login',
    '/auth/reset-password',
    '/auth/verify-email',
  ]
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: hasBody ? { 'Content-Type': 'application/json', ...fetchOptions.headers } : fetchOptions.headers,
    ...fetchOptions,
    body: hasBody ? JSON.stringify(cleanPayload(options.body)) : undefined,
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    // Si l'access token expire, on tente un refresh transparent grace au cookie HttpOnly.
    if (response.status === 401 && !skipRefresh && !authPathsWithoutRefresh.includes(path)) {
      await request('/auth/refresh', {
        method: 'POST',
        body: {},
        skipRefresh: true,
      })

      return request(path, {
        ...options,
        skipRefresh: true,
      })
    }

    const message = Array.isArray(data?.message)
      ? data.message.join(' ')
      : data?.message || "Une erreur est survenue avec l'API."
    throw new Error(message)
  }

  return data
}

// API exposee au reste du frontend. Chaque methode correspond a une route NestJS.
export const api = {
  getSetupStatus: () => request('/setup/status'),
  createCompanyAdmin: (payload) =>
    request('/setup/company-admin', {
      method: 'POST',
      body: payload,
    }),
  login: (payload) =>
    request('/auth/login', {
      method: 'POST',
      body: payload,
    }),
  googleLogin: (payload) =>
    request('/auth/google', {
      method: 'POST',
      body: payload,
    }),
  requestPhoneOtp: (payload) =>
    request('/auth/phone/request-otp', {
      method: 'POST',
      body: payload,
    }),
  verifyPhoneOtp: (payload) =>
    request('/auth/phone/verify-otp', {
      method: 'POST',
      body: payload,
    }),
  verifyTwoFactorLogin: (payload) =>
    request('/auth/2fa/verify-login', {
      method: 'POST',
      body: payload,
    }),
  verifyEmail: (payload) =>
    request('/auth/verify-email', {
      method: 'POST',
      body: payload,
    }),
  resendEmailVerification: (payload) =>
    request('/auth/resend-email-verification', {
      method: 'POST',
      body: payload,
    }),
  logout: () =>
    request('/auth/logout', {
      method: 'POST',
      body: {},
    }),
  register: (payload) =>
    request('/auth/register', {
      method: 'POST',
      body: payload,
    }),
  forgotPassword: (payload) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: payload,
    }),
  resetPassword: (payload) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: payload,
    }),
  changePassword: (payload) =>
    request('/auth/change-password', {
      method: 'POST',
      body: payload,
    }),
  logoutAllDevices: () =>
    request('/auth/logout-all', {
      method: 'POST',
      body: {},
    }),
  getSessions: () => request('/auth/sessions'),
  getLoginHistory: () => request('/auth/login-history'),
  setupTwoFactor: () =>
    request('/auth/2fa/setup', {
      method: 'POST',
      body: {},
    }),
  enableTwoFactor: (payload) =>
    request('/auth/2fa/enable', {
      method: 'POST',
      body: payload,
    }),
  disableTwoFactor: (payload) =>
    request('/auth/2fa/disable', {
      method: 'POST',
      body: payload,
    }),
  getUserProfile: () => request('/users/me'),
  updateUserProfile: (payload) =>
    request('/users/me', {
      method: 'PATCH',
      body: payload,
    }),
  getInterfacePreferences: () => request('/users/me/preferences'),
  updateInterfacePreferences: (payload) =>
    request('/users/me/preferences', {
      method: 'PATCH',
      body: payload,
    }),
  getCompany: () => request('/setup/company'),
  updateCompany: (payload) =>
    request('/setup/company', {
      method: 'PATCH',
      body: payload,
    }),
  getPendingUsers: () => request('/users/pending'),
  getUsers: () => request('/users'),
  getActivityLog: () => request('/users/activity'),
  getUserHistory: (userId) => request(`/users/${userId}/history`),
  approveUser: (userId, payload) =>
    request(`/users/${userId}/approve`, {
      method: 'PATCH',
      body: payload,
    }),
  updateUserRole: (userId, payload) =>
    request(`/users/${userId}/role`, {
      method: 'PATCH',
      body: payload,
    }),
  disableUser: (userId) =>
    request(`/users/${userId}/disable`, {
      method: 'PATCH',
      body: {},
    }),
  reactivateUser: (userId) =>
    request(`/users/${userId}/reactivate`, {
      method: 'PATCH',
      body: {},
    }),
  resetUserPassword: (userId, payload = {}) =>
    request(`/users/${userId}/reset-password`, {
      method: 'POST',
      body: payload,
    }),
  getEvents: () => request('/events'),
  createEvent: (payload) =>
    request('/events', {
      method: 'POST',
      body: payload,
    }),
  updateEvent: (eventId, payload) =>
    request(`/events/${eventId}`, {
      method: 'PATCH',
      body: payload,
    }),
  addEventAssignment: (eventId, payload) =>
    request(`/events/${eventId}/assignments`, {
      method: 'POST',
      body: payload,
    }),
  removeEventAssignment: (eventId, assignmentId) =>
    request(`/events/${eventId}/assignments/${assignmentId}`, {
      method: 'DELETE',
    }),
  addEventChecklistItem: (eventId, payload) =>
    request(`/events/${eventId}/checklist`, {
      method: 'POST',
      body: payload,
    }),
  updateEventChecklistItem: (eventId, itemId, payload) =>
    request(`/events/${eventId}/checklist/${itemId}`, {
      method: 'PATCH',
      body: payload,
    }),
  addEventProductionStep: (eventId, payload) =>
    request(`/events/${eventId}/production-steps`, {
      method: 'POST',
      body: payload,
    }),
  updateEventProductionStep: (eventId, stepId, payload) =>
    request(`/events/${eventId}/production-steps/${stepId}`, {
      method: 'PATCH',
      body: payload,
    }),
  addEventAttachment: (eventId, payload) =>
    request(`/events/${eventId}/attachments`, {
      method: 'POST',
      body: payload,
    }),
  removeEventAttachment: (eventId, attachmentId) =>
    request(`/events/${eventId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    }),
  getFinanceSummary: () => request('/finance/summary'),
  getEventFinance: (eventId) => request(`/finance/events/${eventId}`),
  createEventBudget: (eventId, payload) =>
    request(`/finance/events/${eventId}/budgets`, {
      method: 'POST',
      body: payload,
    }),
  updateEventBudget: (budgetId, payload) =>
    request(`/finance/budgets/${budgetId}`, {
      method: 'PATCH',
      body: payload,
    }),
  approveEventBudget: (budgetId, payload = {}) =>
    request(`/finance/budgets/${budgetId}/approve`, {
      method: 'PATCH',
      body: payload,
    }),
  rejectEventBudget: (budgetId, payload = {}) =>
    request(`/finance/budgets/${budgetId}/reject`, {
      method: 'PATCH',
      body: payload,
    }),
  createEventExpense: (eventId, payload) =>
    request(`/finance/events/${eventId}/expenses`, {
      method: 'POST',
      body: payload,
    }),
  createEventPayment: (eventId, payload) =>
    request(`/finance/events/${eventId}/payments`, {
      method: 'POST',
      body: payload,
    }),
  updateEventPayment: (paymentId, payload) =>
    request(`/finance/payments/${paymentId}`, {
      method: 'PATCH',
      body: payload,
    }),
  createFinanceDocument: (eventId, payload) =>
    request(`/finance/events/${eventId}/documents`, {
      method: 'POST',
      body: payload,
    }),
  removeFinanceDocument: (documentId) =>
    request(`/finance/documents/${documentId}`, {
      method: 'DELETE',
    }),
  getWorkflows: () => request('/workflows'),
  getWorkflow: (workflowId) => request(`/workflows/${workflowId}`),
  createWorkflow: (payload) =>
    request('/workflows', {
      method: 'POST',
      body: payload,
    }),
  addWorkflowBudget: (workflowId, payload) =>
    request(`/workflows/${workflowId}/budget`, {
      method: 'PATCH',
      body: payload,
    }),
  assignWorkflowPeople: (workflowId, payload) =>
    request(`/workflows/${workflowId}/assignees`, {
      method: 'PATCH',
      body: payload,
    }),
  approveWorkflow: (workflowId, payload = {}) =>
    request(`/workflows/${workflowId}/approve`, {
      method: 'PATCH',
      body: payload,
    }),
  rejectWorkflow: (workflowId, payload = {}) =>
    request(`/workflows/${workflowId}/reject`, {
      method: 'PATCH',
      body: payload,
    }),
  getNotifications: () => request('/notifications'),
  getNotificationCount: () => request('/notifications/unread-count'),
  markNotificationRead: (notificationId) =>
    request(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
      body: {},
    }),
  sendEventReminders: () =>
    request('/notifications/event-reminders', {
      method: 'POST',
      body: {},
    }),
  getHrOverview: () => request('/hr/overview'),
  getHrStaff: () => request('/hr/staff'),
  updateStaffProfile: (userId, payload) =>
    request(`/hr/staff/${userId}/profile`, {
      method: 'PATCH',
      body: payload,
    }),
  createStaffContract: (userId, payload) =>
    request(`/hr/staff/${userId}/contracts`, {
      method: 'POST',
      body: payload,
    }),
  createStaffDocument: (userId, payload) =>
    request(`/hr/staff/${userId}/documents`, {
      method: 'POST',
      body: payload,
    }),
  createStaffMission: (userId, payload) =>
    request(`/hr/staff/${userId}/missions`, {
      method: 'POST',
      body: payload,
    }),
  getCommercialOverview: () => request('/commercial/overview'),
  getCommercialClients: () => request('/commercial/clients'),
  createCommercialClient: (payload) =>
    request('/commercial/clients', {
      method: 'POST',
      body: payload,
    }),
  updateCommercialClient: (clientId, payload) =>
    request(`/commercial/clients/${clientId}`, {
      method: 'PATCH',
      body: payload,
    }),
  createServiceRequest: (payload) =>
    request('/commercial/requests', {
      method: 'POST',
      body: payload,
    }),
  updateServiceRequest: (requestId, payload) =>
    request(`/commercial/requests/${requestId}`, {
      method: 'PATCH',
      body: payload,
    }),
  createCommercialQuote: (payload) =>
    request('/commercial/quotes', {
      method: 'POST',
      body: payload,
    }),
  updateCommercialQuote: (quoteId, payload) =>
    request(`/commercial/quotes/${quoteId}`, {
      method: 'PATCH',
      body: payload,
    }),
  createClientExchange: (payload) =>
    request('/commercial/exchanges', {
      method: 'POST',
      body: payload,
    }),
  getDocumentsOverview: () => request('/documents/overview'),
  createBusinessDocument: (payload) =>
    request('/documents', {
      method: 'POST',
      body: payload,
    }),
  generateBusinessDocument: (payload) =>
    request('/documents/generate', {
      method: 'POST',
      body: payload,
    }),
  validateBusinessDocument: (documentId, payload) =>
    request(`/documents/${documentId}/validate`, {
      method: 'PATCH',
      body: payload,
    }),
  getReportsSummary: (params = {}) => {
    const query = new URLSearchParams(cleanPayload(params)).toString()
    return request(`/reports/summary${query ? `?${query}` : ''}`)
  },
  exportReport: (payload) =>
    request('/reports/export', {
      method: 'POST',
      body: payload,
    }),
}
