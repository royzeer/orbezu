import { LANGUAGES, LANG } from '../data/languages.js'
import { LESSONS, LESSON, lessonsFor } from '../data/lessons.js'
import { useStore } from '../lib/store.js'
import { isDue } from '../lib/srs.js'
import Orb from '../components/Orb.jsx'
import Icon from '../components/Icon.jsx'
import Cover from '../components/Cover.jsx'

const METHOD = [
  ['Escuchar', 'La frase suena varias veces dentro de una escena.'],
  ['Construir', 'De atrás hacia adelante, bloque por bloque.'],
  ['Shadowing', 'Hablas encima del audio, de 0.6x a 1x.'],
  ['Comparar', 'Ves palabra por palabra qué salió bien.'],
  ['Usar', 'La dices tú solo en una mini conversación.'],
  ['Repaso', 'Vuelve justo antes de que la olvides.']
]

export default function Home() {
  const progress = useStore((s) => s.progress)
  const lastLang = useStore((s) => s.settings.lastLang)
  const due = Object.values(progress.reviews).filter((r) => isDue(r)).length
  const started = Object.entries(progress.lessons).filter(([id, l]) => LESSON[id] && !l.completedAt)
  const continueLesson = started.length ? LESSON[started[0][0]] : lastLang ? lessonsFor(lastLang).find((l) => !progress.lessons[l.id]?.completedAt) : null
  const completed = Object.values(progress.lessons).filter((l) => l.completedAt).length

  return (
    <div className="page home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Shadowing y frases largas</p>
          <h1>Tu segunda lengua, como la primera.</h1>
          <p className="lead">
            Primero escuchas mucho. Luego repites imitando. La gramática la descubres sola, como cuando aprendiste a hablar.
          </p>
          <div className="row wrap">
            {continueLesson ? (
              <a className="btn primary lg" href={`#/leccion/${continueLesson.id}`}>
                <Icon name="play" size={18} /> Continuar: {continueLesson.titleEs}
              </a>
            ) : (
              <button className="btn primary lg" onClick={() => document.getElementById('idiomas')?.scrollIntoView({ behavior: 'smooth' })}>
                <Icon name="globe" size={18} /> Elegir un idioma
              </button>
            )}
            {due > 0 && (
              <a className="btn lg" href="#/repaso">
                <Icon name="review" size={18} /> {due} {due === 1 ? 'frase' : 'frases'} para repasar
              </a>
            )}
          </div>
          <div className="stats">
            <div>
              <strong>{progress.stats.streak || 0}</strong>
              <span>días seguidos</span>
            </div>
            <div>
              <strong>{progress.stats.spoken || 0}</strong>
              <span>frases dichas</span>
            </div>
            <div>
              <strong>
                {completed}/{LESSONS.length}
              </strong>
              <span>lecciones</span>
            </div>
          </div>
        </div>
        <div className="hero-orb">
          <Orb color={continueLesson ? LANG[continueLesson.lang].color : '#7C6CF6'} size={300} />
        </div>
      </section>

      <section id="idiomas" className="section">
        <div className="section-head">
          <h2>Idiomas</h2>
          <p className="muted">Cada idioma tiene su color. Toca uno para ver sus lecciones.</p>
        </div>
        <div className="lang-grid">
          {LANGUAGES.map((l, i) => {
            const ls = lessonsFor(l.code)
            const done = ls.filter((x) => progress.lessons[x.id]?.completedAt).length
            return (
              <a key={l.code} className="lang-card" href={`#/idioma/${l.code}`} style={{ '--lang': l.color }}>
                <Cover scene={ls[i % ls.length].scene} color={l.color} className="lang-cover" />
                <span className="lang-native" lang={l.bcp}>
                  {l.native}
                </span>
                <span className="lang-name">{l.name}</span>
                <span className="lang-meta">
                  {done}/{ls.length} lecciones{l.rom ? ` · con ${l.romName}` : ''}
                </span>
              </a>
            )
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Cómo es cada lección</h2>
          <p className="muted">Las historias, las conversaciones y el repaso están al servicio de este método.</p>
        </div>
        <ol className="method">
          {METHOD.map(([t, d], i) => (
            <li key={t}>
              <span className="method-n">{i + 1}</span>
              <strong>{t}</strong>
              <span>{d}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
