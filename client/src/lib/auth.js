import { useEffect, useRef, useSyncExternalStore } from 'react'
import { apiEnabled, authApi, progressApi, getToken, setToken } from './api.js'
import { getState, setState, subscribe, mergeProgress } from './store.js'

let auth = { user: null, syncState: 'idle', checked: !apiEnabled }
const subs = new Set()
const setAuth = (patch) => {
  auth = { ...auth, ...patch }
  subs.forEach((f) => f())
}

export function useAuth() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => auth
  )
}

let currentUserId = null
let ready = false
let lastPushed = 0

/** Une el progreso local con el de la nube y sube el resultado. */
async function syncNow(user) {
  currentUserId = user.id
  ready = false
  setAuth({ user, syncState: 'syncing', checked: true })
  try {
    const { data: remote } = await progressApi.get()
    const merged = mergeProgress(getState().progress, remote)
    setState((s) => ({ ...s, progress: merged }))
    await progressApi.put(merged)
    lastPushed = merged.updatedAt
    ready = true
    setAuth({ syncState: 'synced' })
  } catch {
    setAuth({ syncState: 'error' })
  }
}

/** Guarda la sesion que devuelve el servidor y sincroniza. */
export async function signedIn({ token, user }) {
  setToken(token)
  await syncNow(user)
}

export function signOut() {
  setToken(null)
  currentUserId = null
  ready = false
  setAuth({ user: null, syncState: 'idle' })
}

export function updateUser(user) {
  setAuth({ user })
}

/** Restaura la sesion al abrir la app y sube los cambios con un pequeño retraso. */
export function useAuthSync() {
  const timer = useRef(null)
  useEffect(() => {
    if (!apiEnabled) return
    if (getToken()) {
      authApi
        .me()
        .then(({ user }) => syncNow(user))
        .catch((e) => {
          if (e.status === 401) setToken(null)
          setAuth({ checked: true, syncState: e.status === 401 ? 'idle' : 'error' })
        })
    } else setAuth({ checked: true })

    const unsub = subscribe(() => {
      const p = getState().progress
      if (!ready || !currentUserId || p.updatedAt === lastPushed) return
      clearTimeout(timer.current)
      timer.current = setTimeout(async () => {
        setAuth({ syncState: 'syncing' })
        try {
          await progressApi.put(getState().progress)
          lastPushed = getState().progress.updatedAt
          setAuth({ syncState: 'synced' })
        } catch {
          setAuth({ syncState: 'error' })
        }
      }, 1500)
    })
    return () => {
      unsub()
      clearTimeout(timer.current)
    }
  }, [])
}
