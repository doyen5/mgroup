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
    if (response.status === 401 && !skipRefresh && path !== '/auth/login') {
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
  getUserProfile: () => request('/users/me'),
  updateUserProfile: (payload) =>
    request('/users/me', {
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
  approveUser: (userId, payload) =>
    request(`/users/${userId}/approve`, {
      method: 'PATCH',
      body: payload,
    }),
  disableUser: (userId) =>
    request(`/users/${userId}/disable`, {
      method: 'PATCH',
      body: {},
    }),
}
