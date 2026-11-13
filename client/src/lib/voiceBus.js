// Pequeño canal para que el orbe sepa si la app habla, escucha o descansa.
const listeners = new Set()
let state = { mode: 'idle', level: 0 }

export function getVoiceState() {
  return state
}

export function setVoiceState(next) {
  state = { ...state, ...next }
  listeners.forEach((l) => l(state))
}

export function subscribeVoice(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
