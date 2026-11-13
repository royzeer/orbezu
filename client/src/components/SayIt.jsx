import { useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { listen, support, speechErrorMessage, stopSpeaking } from '../lib/speech.js'
import { compare } from '../lib/compare.js'
import { LANG } from '../data/languages.js'
import { touchStreak } from '../lib/store.js'

/**
 * Boton para hablar. Escucha, compara contra `expected` (texto o lista de
 * opciones) y devuelve el mejor resultado. Si el navegador no reconoce voz,
 * ofrece escribir.
 */
export default function SayIt({ lang, expected, onResult, label = 'Hablar', compact, color, beforeListen, maxMs = 9000, continuous = false, disabled }) {
  const L = LANG[lang]
  const [busy, setBusy] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const [typed, setTyped] = useState('')
  const ctrl = useRef(null)

  const options = Array.isArray(expected) ? expected : [expected]

  const finish = (transcripts) => {
    let best = null
    options.forEach((opt, idx) => {
      for (const t of transcripts) {
        const r = compare(opt, t, lang)
        if (!best || r.score > best.score) best = { ...r, option: idx, expected: opt }
      }
    })
    touchStreak(1)
    onResult?.(best)
  }

  const start = async () => {
    if (busy) {
      ctrl.current?.abort()
      return
    }
    setError('')
    setInterim('')
    stopSpeaking()
    setBusy(true)
    ctrl.current = new AbortController()
    try {
      const listening = listen({ lang: L.bcp, onInterim: setInterim, signal: ctrl.current.signal, maxMs, continuous })
      if (beforeListen) await beforeListen()
      const { transcript, alternatives } = await listening
      if (!transcript) {
        setError('No te escuché. Acércate al micrófono e inténtalo otra vez.')
      } else finish([transcript, ...alternatives])
    } catch (err) {
      setError(speechErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (!support.stt) {
    return (
      <form
        className="say-typed"
        onSubmit={(e) => {
          e.preventDefault()
          if (typed.trim()) finish([typed])
          setTyped('')
        }}
      >
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Escribe lo que dirías en voz alta"
          lang={L.bcp}
          dir={L.rtl ? 'rtl' : 'ltr'}
          aria-label="Escribe la frase"
        />
        <button className="btn" type="submit" disabled={disabled}>
          Comprobar
        </button>
      </form>
    )
  }

  return (
    <div className={`say ${compact ? 'is-compact' : ''}`}>
      <button
        type="button"
        className={`mic ${busy ? 'is-on' : ''}`}
        onClick={start}
        disabled={disabled}
        style={color ? { '--accent': color } : undefined}
        aria-pressed={busy}
      >
        <Icon name={busy ? 'stop' : 'mic'} size={compact ? 18 : 22} />
        <span>{busy ? 'Escuchando…' : label}</span>
      </button>
      {busy && interim && (
        <p className="interim" lang={L.bcp} dir={L.rtl ? 'rtl' : 'ltr'}>
          {interim}
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
