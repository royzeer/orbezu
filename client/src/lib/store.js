import { useSyncExternalStore } from 'react'

const KEY = 'orbezu:v1'

export const defaultState = {
  version: 1,
  settings: {
    theme: 'system',
    rate: 1,
    showRom: true,
    geminiKey: '',
    geminiModel: 'gemini-flash-latest',
    noticeDismissed: false,
    lastLang: null,
    voices: {},
    reader: { brightness: 100, theme: 'mist', fontSize: 20, lineHeight: 1.7, mode: 'text' }
  },
  progress: {
    lessons: {},
    reviews: {},
    stats: { xp: 0, streak: 0, lastDay: null, spoken: 0 },
    updatedAt: 0
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(defaultState)
    const data = JSON.parse(raw)
    return {
      ...defaultState,
      ...data,
      settings: {
        ...defaultState.settings,
        ...data.settings,
        reader: { ...defaultState.settings.reader, ...(data.settings?.reader || {}) }
      },
      progress: {
        ...defaultState.progress,
        ...data.progress,
        stats: { ...defaultState.progress.stats, ...(data.progress?.stats || {}) }
      }
    }
  } catch {
    return structuredClone(defaultState)
  }
}

let state = typeof localStorage !== 'undefined' ? load() : structuredClone(defaultState)
const listeners = new Set()

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* almacenamiento lleno o bloqueado: seguimos en memoria */
  }
}

export function getState() {
  return state
}

export function setState(updater) {
  const next = typeof updater === 'function' ? updater(state) : updater
  if (next === state) return
  state = next
  save()
  listeners.forEach((l) => l())
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useStore(selector = (s) => s) {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state))
}

export function updateSettings(patch) {
  setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
}

export function updateReader(patch) {
  setState((s) => ({ ...s, settings: { ...s.settings, reader: { ...s.settings.reader, ...patch } } }))
}

const today = () => new Date().toISOString().slice(0, 10)

export function updateProgress(fn) {
  setState((s) => {
    const p = fn(s.progress)
    return { ...s, progress: { ...p, updatedAt: Date.now() } }
  })
}

/** Registra actividad del dia para la racha. */
export function touchStreak(xp = 0) {
  updateProgress((p) => {
    const d = today()
    const st = { ...p.stats }
    if (st.lastDay !== d) {
      const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      st.streak = st.lastDay === y ? st.streak + 1 : 1
      st.lastDay = d
    }
    st.xp += xp
    st.spoken += xp ? 1 : 0
    return { ...p, stats: st }
  })
}

export function resetProgress() {
  setState((s) => ({ ...s, progress: structuredClone(defaultState.progress) }))
}

/** Une dos copias del progreso (local y nube) sin perder trabajo. */
export function mergeProgress(a, b) {
  if (!b) return a
  if (!a) return b
  const lessons = { ...a.lessons }
  for (const [id, l] of Object.entries(b.lessons || {})) {
    const mine = lessons[id]
    if (!mine) lessons[id] = l
    else
      lessons[id] = {
        ...mine,
        ...l,
        bestScore: Math.max(mine.bestScore || 0, l.bestScore || 0),
        completedAt: Math.max(mine.completedAt || 0, l.completedAt || 0) || null,
        step: Math.max(mine.step || 0, l.step || 0)
      }
  }
  const reviews = { ...a.reviews }
  for (const [id, r] of Object.entries(b.reviews || {})) {
    if (!reviews[id] || (r.updatedAt || 0) > (reviews[id].updatedAt || 0)) reviews[id] = r
  }
  const sa = a.stats || {}
  const sb = b.stats || {}
  const newer = (sa.lastDay || '') >= (sb.lastDay || '') ? sa : sb
  return {
    lessons,
    reviews,
    stats: { ...newer, xp: Math.max(sa.xp || 0, sb.xp || 0), spoken: Math.max(sa.spoken || 0, sb.spoken || 0) },
    updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0)
  }
}
