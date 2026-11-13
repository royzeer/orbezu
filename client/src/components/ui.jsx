import { useState } from 'react'
import Icon from './Icon.jsx'
import { useStore, updateSettings } from '../lib/store.js'
import { speak } from '../lib/speech.js'
import { support, browserInfo } from '../lib/speech.js'
import { LANG } from '../data/languages.js'

/** Linea de texto: se toca para ver la traduccion. Muestra romanizacion si aplica. */
export function Line({ line, lang, active, big, hideText, onPlay, showTr: forceTr }) {
  const showRom = useStore((s) => s.settings.showRom)
  const rate = useStore((s) => s.settings.rate)
  const [open, setOpen] = useState(false)
  const L = LANG[lang]
  const tr = forceTr || open
  return (
    <div className={`line ${active ? 'is-active' : ''} ${big ? 'is-big' : ''}`}>
      <button
        type="button"
        className="line-main"
        onClick={() => setOpen((o) => !o)}
        dir={L.rtl ? 'rtl' : 'ltr'}
        lang={L.bcp}
        aria-expanded={tr}
        title="Toca para ver la traducción"
      >
        <span className={`line-text ${hideText ? 'is-hidden' : ''}`}>{line.text}</span>
        {L.rom && showRom && line.rom && !hideText && <span className="line-rom" dir="ltr">{line.rom}</span>}
        {tr && line.tr && <span className="line-tr" dir="ltr">{line.tr}</span>}
      </button>
      <button
        type="button"
        className="icon-btn ghost"
        aria-label="Escuchar"
        onClick={() => (onPlay ? onPlay() : speak(line.text, { lang: L.bcp, rate }))}
      >
        <Icon name="play" size={16} />
      </button>
    </div>
  )
}

/** Muestra palabra por palabra que salio bien y que no. */
export function TokenDiff({ result, lang }) {
  if (!result) return null
  const L = LANG[lang]
  const joiner = lang === 'zh' || lang === 'ja' ? '' : ' '
  return (
    <div className="diff" dir={L.rtl ? 'rtl' : 'ltr'} lang={L.bcp}>
      {result.tokens.map((t, i) => (
        <span key={i} className={`tok tok-${t.status}`}>
          {t.text}
          {joiner && i < result.tokens.length - 1 ? joiner : ''}
        </span>
      ))}
    </div>
  )
}

export function Meter({ value, color }) {
  return (
    <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <span style={{ width: `${Math.round(value * 100)}%`, background: color }} />
    </div>
  )
}

export function Dots({ total, current, color }) {
  return (
    <div className="dots" aria-label={`Paso ${current + 1} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < current ? 'done' : i === current ? 'now' : ''} style={i <= current ? { background: color } : undefined} />
      ))}
    </div>
  )
}

export function BrowserNotice() {
  const dismissed = useStore((s) => s.settings.noticeDismissed)
  const b = browserInfo()
  if (dismissed && support.stt) return null
  if (b.recommended && support.stt && support.tts) return null
  return (
    <div className="notice" role="status">
      <Icon name="info" size={18} />
      <p>
        {support.stt
          ? `Orbezu funciona mejor en Chrome y Edge. En ${b.name} la voz puede fallar o sonar distinta.`
          : `Tu navegador (${b.name}) no tiene reconocimiento de voz. Puedes escuchar y escribir lo que dices, pero para hablar usa Chrome o Edge.`}
      </p>
      {support.stt && (
        <button type="button" className="icon-btn ghost" aria-label="Cerrar aviso" onClick={() => updateSettings({ noticeDismissed: true })}>
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  )
}
