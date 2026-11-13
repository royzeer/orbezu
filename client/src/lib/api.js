// Cliente del servidor de Orbezu (Express). El token JWT se guarda en este
// navegador y se envia en la cabecera Authorization.

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const TOKEN_KEY = 'orbezu:token'

export const apiEnabled = Boolean(BASE)
export const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* sin almacenamiento */
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let res
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  } catch {
    const e = new Error('No se pudo conectar con el servidor. Si está en Render gratis, puede tardar un minuto en despertar.')
    e.status = 0
    throw e
  }
  let data = null
  try {
    data = await res.json()
  } catch {
    /* respuesta sin cuerpo */
  }
  if (!res.ok) {
    const e = new Error(data?.error || `Error ${res.status}`)
    e.status = res.status
    throw e
  }
  return data
}

export const authApi = {
  register: (b) => api('/api/auth/register', { method: 'POST', body: b }),
  login: (b) => api('/api/auth/login', { method: 'POST', body: b }),
  google: (credential) => api('/api/auth/google', { method: 'POST', body: { credential } }),
  me: () => api('/api/auth/me'),
  update: (b) => api('/api/auth/me', { method: 'PATCH', body: b }),
  remove: () => api('/api/auth/me', { method: 'DELETE' })
}

export const progressApi = {
  get: () => api('/api/progress'),
  put: (data) => api('/api/progress', { method: 'PUT', body: { data } })
}
