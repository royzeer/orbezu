import { LANG } from '../data/languages.js'
import FreeChat from '../components/FreeChat.jsx'
import Icon from '../components/Icon.jsx'

export default function FreeTalk({ code }) {
  const L = LANG[code]
  if (!L) return <div className="page narrow">Idioma no encontrado.</div>
  return (
    <div className="page narrow" style={{ '--lang': L.color }}>
      <header className="lesson-head">
        <a className="icon-btn" href={`#/idioma/${code}`} aria-label="Volver">
          <Icon name="back" />
        </a>
        <div className="lesson-title">
          <span className="eyebrow">Modo libre · {L.name}</span>
          <h1>Conversación libre</h1>
        </div>
      </header>
      <section className="step-card">
        <FreeChat lang={code} />
      </section>
    </div>
  )
}
