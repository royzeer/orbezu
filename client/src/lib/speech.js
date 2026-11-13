import { setVoiceState } from './voiceBus.js'

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
const Recognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

export const support = {
  tts: !!synth,
  stt: !!Recognition
}

export function browserInfo() {
  if (typeof navigator === 'undefined') return { name: 'otro', recommended: false }
  const ua = navigator.userAgent
  if (/Edg\//.test(ua)) return { name: 'Edge', recommended: true }
  if (/OPR\/|Opera/.test(ua)) return { name: 'Opera', recommended: false }
  if (/Firefox\//.test(ua)) return { name: 'Firefox', recommended: false }
  if (/Chrome\//.test(ua) && !/Brave/.test(ua)) return { name: 'Chrome', recommended: true }
  if (/Safari\//.test(ua)) return { name: 'Safari', recommended: false }
  return { name: 'otro', recommended: false }
}

let voices = []
function loadVoices() {
  if (!synth) return
  voices = synth.getVoices()
}
if (synth) {
  loadVoices()
  synth.addEventListener?.('voiceschanged', loadVoices)
}

export function voicesFor(bcp) {
  loadVoices()
  const base = bcp.split('-')[0].toLowerCase()
  return voices.filter((v) => v.lang.replace('_', '-').toLowerCase().split('-')[0] === base)
}

export function pickVoice(bcp, preferredName) {
  const list = voicesFor(bcp)
  if (!list.length) return null
  if (preferredName) {
    const p = list.find((v) => v.name === preferredName)
    if (p) return p
  }
  const exact = list.filter((v) => v.lang.replace('_', '-').toLowerCase() === bcp.toLowerCase())
  const pool = exact.length ? exact : list
  return pool.find((v) => /Google|Natural|Online/i.test(v.name)) || pool[0]
}

let speakToken = 0

export function stopSpeaking() {
  speakToken++
  synth?.cancel()
  setVoiceState({ mode: 'idle', level: 0 })
}

/** Lee un texto en voz alta. Resuelve cuando termina (o se cancela). */
export function speak(text, { lang = 'en-US', rate = 1, voiceName } = {}) {
  return new Promise((resolve) => {
    if (!synth) return resolve(false)
    synth.cancel()
    const token = ++speakToken
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = rate
    const v = pickVoice(lang, voiceName)
    if (v) u.voice = v
    let done = false
    const finish = (ok) => {
      if (done) return
      done = true
      if (token === speakToken) setVoiceState({ mode: 'idle', level: 0 })
      resolve(ok)
    }
    u.onstart = () => setVoiceState({ mode: 'speaking' })
    u.onend = () => finish(true)
    u.onerror = () => finish(false)
    // Chrome a veces no dispara onend: calculamos un limite de seguridad.
    const guess = Math.max(2500, (text.length * 110) / rate + 1500)
    setTimeout(() => finish(true), guess * 2)
    synth.speak(u)
  })
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/** Mide el volumen del microfono para animar el orbe. */
async function startLevelMeter() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const src = ctx.createMediaStreamSource(stream)
    const an = ctx.createAnalyser()
    an.fftSize = 512
    src.connect(an)
    const data = new Uint8Array(an.fftSize)
    let raf = 0
    const tick = () => {
      an.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const x = (data[i] - 128) / 128
        sum += x * x
      }
      setVoiceState({ level: Math.min(1, Math.sqrt(sum / data.length) * 4) })
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => {
      cancelAnimationFrame(raf)
      stream.getTracks().forEach((t) => t.stop())
      ctx.close()
    }
  } catch {
    return () => {}
  }
}

/**
 * Escucha a la persona. Devuelve { transcript, alternatives } o lanza un error
 * con code: 'unsupported' | 'not-allowed' | 'no-speech' | 'network' | ...
 * `onInterim` recibe el texto parcial mientras habla.
 */
export function listen({ lang = 'en-US', continuous = false, maxMs = 9000, onInterim, signal } = {}) {
  return new Promise((resolve, reject) => {
    if (!Recognition) {
      const e = new Error('unsupported')
      e.code = 'unsupported'
      return reject(e)
    }
    const rec = new Recognition()
    rec.lang = lang
    rec.interimResults = true
    rec.continuous = continuous
    rec.maxAlternatives = 3
    let finals = []
    let alts = []
    let stopMeter = () => {}
    let settled = false
    const timer = setTimeout(() => rec.stop(), maxMs)

    const cleanup = () => {
      clearTimeout(timer)
      stopMeter()
      setVoiceState({ mode: 'idle', level: 0 })
    }

    rec.onstart = async () => {
      setVoiceState({ mode: 'listening', level: 0 })
      stopMeter = await startLevelMeter()
      if (settled) stopMeter()
    }
    rec.onresult = (ev) => {
      let interim = ''
      finals = []
      alts = []
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i]
        if (r.isFinal) {
          finals.push(r[0].transcript)
          for (let k = 0; k < r.length; k++) alts.push(r[k].transcript)
        } else interim += r[0].transcript
      }
      onInterim?.((finals.join(' ') + ' ' + interim).trim())
    }
    rec.onerror = (ev) => {
      if (settled) return
      if (ev.error === 'no-speech' || ev.error === 'aborted') return
      settled = true
      cleanup()
      const e = new Error(ev.error)
      e.code = ev.error
      reject(e)
    }
    rec.onend = () => {
      if (settled) return
      settled = true
      cleanup()
      const transcript = finals.join(' ').trim()
      resolve({ transcript, alternatives: alts.length ? alts : [transcript] })
    }
    signal?.addEventListener('abort', () => rec.stop())
    try {
      rec.start()
    } catch (err) {
      settled = true
      cleanup()
      reject(err)
    }
  })
}

export function speechErrorMessage(err) {
  switch (err?.code) {
    case 'unsupported':
      return 'Tu navegador no reconoce voz. Escribe la frase para continuar, o abre Orbezu en Chrome o Edge.'
    case 'not-allowed':
    case 'service-not-allowed':
      return 'No hay permiso para usar el micrófono. Actívalo en el candado de la barra de direcciones.'
    case 'network':
      return 'El reconocimiento de voz necesita conexión a internet.'
    case 'audio-capture':
      return 'No se encontró un micrófono.'
    default:
      return 'No se pudo escuchar. Inténtalo otra vez.'
  }
}
