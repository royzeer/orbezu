import { useState } from 'react'
import { LANGUAGES, LANG } from '../data/languages.js'
import { LESSONS } from '../data/lessons.js'
import Cover from '../components/Cover.jsx'
import Icon from '../components/Icon.jsx'

export default function Library() {
  const [filter, setFilter] = useState('all')
  const list = LESSONS.filter((l) => filter === 'all' || l.lang === filter)
  return (
    <div className="page">
      <header className="page-head">
        <h1>Historias</h1>
        <p className="muted">Lee y escucha las escenas completas. Toca una frase para ver su traducción.</p>
      </header>
      <div className="chips scroll" role="tablist" aria-label="Filtrar por idioma">
        <button className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
          Todos
        </button>
        {LANGUAGES.map((l) => (
          <button key={l.code} className={`chip ${filter === l.code ? 'on' : ''}`} style={{ '--lang': l.color }} onClick={() => setFilter(l.code)}>
            <span className="dot" /> {l.name}
          </button>
        ))}
      </div>
      <div className="story-grid">
        {list.map((ls) => {
          const L = LANG[ls.lang]
          return (
            <a key={ls.id} className="story-card" href={`#/lector/${ls.id}`} style={{ '--lang': L.color }}>
              <Cover scene={ls.scene} color={L.color} className="story-cover" />
              <span className="story-lang">
                <span className="dot" /> {L.name}
              </span>
              <strong lang={L.bcp}>{ls.title}</strong>
              <span className="muted small">
                {ls.titleEs} · {ls.story.length} frases
              </span>
              <span className="story-go" aria-hidden="true">
                <Icon name="next" size={16} />
              </span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
