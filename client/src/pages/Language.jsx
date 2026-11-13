import { useEffect } from 'react'
import { LANG } from '../data/languages.js'
import { lessonsFor } from '../data/lessons.js'
import { useStore, updateSettings } from '../lib/store.js'
import Cover from '../components/Cover.jsx'
import Icon from '../components/Icon.jsx'
import { voicesFor } from '../lib/speech.js'

export default function Language({ code }) {
  const L = LANG[code]
  const progress = useStore((s) => s.progress.lessons)
  const hasKey = useStore((s) => !!s.settings.geminiKey)
  useEffect(() => {
    if (L) updateSettings({ lastLang: code })
  }, [code, L])
  if (!L) return <div className="page narrow">Idioma no encontrado.</div>
  const lessons = lessonsFor(code)
  const noVoice = typeof window !== 'undefined' && window.speechSynthesis && voicesFor(L.bcp).length === 0

  return (
    <div className="page" style={{ '--lang': L.color }}>
      <header className="lang-hero">
        <a className="icon-btn" href="#/" aria-label="Volver">
          <Icon name="back" />
        </a>
        <div>
          <p className="eyebrow">{L.name}</p>
          <h1 lang={L.bcp}>{L.native}</h1>
          <div className="chips">
            <span className="chip">{lessons.length} lecciones</span>
            <span className="chip">Frases largas</span>
            {L.rom && <span className="chip">Con {L.romName}</span>}
            {L.rtl && <span className="chip">Se lee de derecha a izquierda</span>}
          </div>
        </div>
      </header>
      {noVoice && (
        <div className="notice">
          <Icon name="info" size={18} />
          <p>Tu sistema no tiene una voz instalada para {L.name.toLowerCase()} todavía. Prueba en Chrome o Edge, o instala la voz en la configuración de tu sistema.</p>
        </div>
      )}
      <div className="lesson-grid">
        {lessons.map((ls, i) => {
          const p = progress[ls.id]
          return (
            <article key={ls.id} className="lesson-card">
              <a href={`#/leccion/${ls.id}`} className="lesson-cover-link" aria-label={`Abrir ${ls.titleEs}`}>
                <Cover scene={ls.scene} color={L.color} className="lesson-cover" title={ls.titleEs} />
                {p?.completedAt && (
                  <span className="badge">
                    <Icon name="check" size={14} /> Hecha
                  </span>
                )}
              </a>
              <div className="lesson-card-body">
                <p className="eyebrow">Lección {i + 1}</p>
                <h2 lang={L.bcp}>{ls.title}</h2>
                {ls.titleRom && <p className="rom">{ls.titleRom}</p>}
                <p className="muted">{ls.titleEs}</p>
                <div className="chips">
                  <span className="chip">{ls.chunks.length} bloques</span>
                  <span className="chip">{ls.story.length} frases en la escena</span>
                </div>
                <div className="row wrap">
                  <a className="btn primary" href={`#/leccion/${ls.id}`}>
                    <Icon name="play" size={16} /> {p?.completedAt ? 'Repetir' : p ? 'Continuar' : 'Empezar'}
                  </a>
                  <a className="btn" href={`#/lector/${ls.id}`}>
                    <Icon name="book" size={16} /> Historia
                  </a>
                </div>
              </div>
            </article>
          )
        })}
        <article className="lesson-card free-card">
          <div className="lesson-card-body">
            <p className="eyebrow">Modo libre</p>
            <h2>Conversa con Gemini</h2>
            <p className="muted">
              {hasKey ? 'Habla de lo que quieras. La IA responde y te corrige con suavidad.' : 'Opcional. Necesita tu propia API key de Gemini (se configura en Ajustes).'}
            </p>
            <a className="btn" href={hasKey ? `#/libre/${code}` : '#/ajustes'}>
              <Icon name={hasKey ? 'spark' : 'key'} size={16} /> {hasKey ? 'Abrir conversación' : 'Configurar'}
            </a>
          </div>
        </article>
      </div>
    </div>
  )
}
