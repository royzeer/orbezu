import { useEffect, useRef, useState } from 'react'
import { LESSON } from '../data/lessons.js'
import { LANG } from '../data/languages.js'
import { useStore, updateReader } from '../lib/store.js'
import { speak, stopSpeaking, wait } from '../lib/speech.js'
import Icon from '../components/Icon.jsx'
import Orb from '../components/Orb.jsx'
import Cover from '../components/Cover.jsx'

const THEMES = [
  { id: 'mist', name: 'Bruma' },
  { id: 'dusk', name: 'Crepúsculo' },
  { id: 'night', name: 'Noche' }
]
const LINE_HEIGHTS = [1.45, 1.7, 2]

export default function Reader({ id }) {
  const lesson = LESSON[id]
  const reader = useStore((s) => s.settings.reader)
  const { rate, voices, showRom } = useStore((s) => s.settings)
  const [panel, setPanel] = useState(false)
  const [active, setActive] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [open, setOpen] = useState({})
  const run = useRef(0)
  useEffect(() => () => stopSpeaking(), [])

  if (!lesson) return <div className="page narrow">Historia no encontrada.</div>
  const L = LANG[lesson.lang]
  const opts = { lang: L.bcp, rate, voiceName: voices[lesson.lang] }

  const play = async (from = 0) => {
    if (playing) {
      run.current++
      stopSpeaking()
      setPlaying(false)
      return
    }
    const token = ++run.current
    setPlaying(true)
    for (let i = from; i < lesson.story.length; i++) {
      if (run.current !== token) return
      setActive(i)
      await speak(lesson.story[i].text, opts)
      await wait(450)
    }
    if (run.current === token) {
      setPlaying(false)
      setActive(-1)
    }
  }

  const audio = reader.mode === 'audio'
  const current = lesson.story[Math.max(0, active)]

  return (
    <div className={`reader theme-${reader.theme}`} style={{ '--lang': L.color, filter: `brightness(${reader.brightness}%)` }}>
      <header className="reader-bar">
        <a className="icon-btn" href="#/lector" aria-label="Volver a historias">
          <Icon name="back" />
        </a>
        <div className="seg small" role="tablist" aria-label="Modo de lectura">
          <button className={audio ? 'on' : ''} onClick={() => updateReader({ mode: 'audio' })} role="tab" aria-selected={audio}>
            Audio
          </button>
          <button className={!audio ? 'on' : ''} onClick={() => updateReader({ mode: 'text' })} role="tab" aria-selected={!audio}>
            Texto
          </button>
        </div>
        <button className="icon-btn" aria-label="Ajustes de lectura" aria-expanded={panel} onClick={() => setPanel((p) => !p)}>
          <Icon name="sliders" />
        </button>
      </header>

      <article className="reader-body" style={{ fontSize: reader.fontSize, lineHeight: reader.lineHeight }}>
        <Cover scene={lesson.scene} color={L.color} className="reader-cover" />
        <p className="eyebrow">{L.name} · {lesson.titleEs}</p>
        <h1 lang={L.bcp}>{lesson.title}</h1>
        {lesson.titleRom && showRom && <p className="line-rom">{lesson.titleRom}</p>}

        {audio ? (
          <div className="reader-audio">
            <Orb color={L.color} size={170} onClick={() => play(active < 0 ? 0 : active)} label={playing ? 'Pausar' : 'Reproducir'} />
            <p className="reader-now" lang={L.bcp} dir={L.rtl ? 'rtl' : 'ltr'}>
              {active >= 0 ? current.text : 'Toca el orbe para escuchar la historia.'}
            </p>
            {active >= 0 && L.rom && showRom && <p className="line-rom">{current.rom}</p>}
            <div className="row center">
              <button className="icon-btn" aria-label="Frase anterior" onClick={() => { run.current++; setPlaying(false); const i = Math.max(0, active - 1); setActive(i); speak(lesson.story[i].text, opts) }}>
                <Icon name="back" />
              </button>
              <button className="btn primary" onClick={() => play(active < 0 ? 0 : active)}>
                <Icon name={playing ? 'pause' : 'play'} size={16} /> {playing ? 'Pausar' : 'Reproducir'}
              </button>
              <button className="icon-btn" aria-label="Frase siguiente" onClick={() => { run.current++; setPlaying(false); const i = Math.min(lesson.story.length - 1, active + 1); setActive(i); speak(lesson.story[i].text, opts) }}>
                <Icon name="next" />
              </button>
            </div>
          </div>
        ) : (
          <div className="reader-text" lang={L.bcp} dir={L.rtl ? 'rtl' : 'ltr'}>
            {lesson.story.map((l, i) => (
              <p key={l.id} className={i === active ? 'is-active' : ''}>
                <button type="button" onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))} className={i === lesson.targetIndex ? 'key' : ''}>
                  {l.text}
                </button>{' '}
                <button type="button" className="mini-play" aria-label="Escuchar frase" onClick={() => { setActive(i); speak(l.text, opts) }}>
                  <Icon name="play" size={14} />
                </button>
                {L.rom && showRom && <span className="line-rom" dir="ltr">{l.rom}</span>}
                {open[i] && <span className="line-tr" dir="ltr">{l.tr}</span>}
              </p>
            ))}
            <a className="btn primary" href={`#/leccion/${lesson.id}`}>
              Practicar esta escena <Icon name="next" size={16} />
            </a>
          </div>
        )}
      </article>

      {panel && (
        <div className="reader-panel" role="dialog" aria-label="Ajustes de lectura">
          <div className="panel-row">
            <Icon name="moon" size={18} />
            <input type="range" min="60" max="120" value={reader.brightness} onChange={(e) => updateReader({ brightness: Number(e.target.value) })} aria-label="Brillo" />
            <Icon name="sun" size={18} />
          </div>
          <div className="panel-row themes">
            {THEMES.map((t) => (
              <button key={t.id} className={`swatch sw-${t.id} ${reader.theme === t.id ? 'on' : ''}`} onClick={() => updateReader({ theme: t.id })} aria-pressed={reader.theme === t.id}>
                {t.name}
              </button>
            ))}
          </div>
          <div className="panel-row">
            <button className="icon-btn" aria-label="Letra más pequeña" onClick={() => updateReader({ fontSize: Math.max(14, reader.fontSize - 2) })}>
              <Icon name="minus" />
            </button>
            <span className="font-size" aria-live="polite">{reader.fontSize}</span>
            <button className="icon-btn" aria-label="Letra más grande" onClick={() => updateReader({ fontSize: Math.min(34, reader.fontSize + 2) })}>
              <Icon name="plus" />
            </button>
          </div>
          <div className="panel-row lh">
            {LINE_HEIGHTS.map((lh) => (
              <button key={lh} className={reader.lineHeight === lh ? 'on' : ''} onClick={() => updateReader({ lineHeight: lh })} aria-label={`Interlineado ${lh}`}>
                <span style={{ gap: `${(lh - 1) * 8}px` }}>
                  <i /><i /><i />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
