import { useMemo, useState } from 'react'
import { useStore } from '../lib/store.js'
import { isDue, formatDue } from '../lib/srs.js'
import { LANG } from '../data/languages.js'
import { LESSON } from '../data/lessons.js'
import { gradeCard } from '../lib/reviews.js'
import { speak } from '../lib/speech.js'
import { scoreLabel } from '../lib/compare.js'
import SayIt from '../components/SayIt.jsx'
import Orb from '../components/Orb.jsx'
import Icon from '../components/Icon.jsx'
import { TokenDiff, Meter } from '../components/ui.jsx'

export default function Review() {
  const reviews = useStore((s) => s.progress.reviews)
  const settings = useStore((s) => s.settings)
  // La cola se fija al abrir la pagina para que no cambie mientras se repasa.
  const [queue] = useState(() =>
    Object.values(reviews)
      .filter((r) => isDue(r))
      .sort((a, b) => a.due - b.due)
      .map((r) => r.id)
  )
  const [pos, setPos] = useState(0)
  const [result, setResult] = useState(null)
  const [nextDue, setNextDue] = useState(null)
  const [reveal, setReveal] = useState(false)
  const upcoming = useMemo(
    () =>
      Object.values(reviews)
        .filter((r) => !isDue(r))
        .sort((a, b) => a.due - b.due)
        .slice(0, 6),
    [reviews]
  )

  const card = reviews[queue[pos]]
  const total = Object.keys(reviews).length

  if (!card) {
    return (
      <div className="page narrow review-page">
        <header className="page-head">
          <h1>Repaso</h1>
          <p className="muted">Las frases vuelven justo antes de olvidarlas. Tus errores también se convierten en frases de repaso.</p>
        </header>
        <div className="empty big">
          <Orb size={140} mode="idle" />
          <h2>{queue.length ? 'Terminaste el repaso de hoy' : total ? 'No hay nada pendiente por ahora' : 'Aún no tienes frases para repasar'}</h2>
          <p className="muted">{total ? 'Vuelve más tarde. Te esperan estas frases:' : 'Completa una lección y su frase aparecerá aquí.'}</p>
          {upcoming.length > 0 && (
            <ul className="upcoming">
              {upcoming.map((r) => (
                <li key={r.id} style={{ '--lang': LANG[r.lang].color }}>
                  <span lang={LANG[r.lang].bcp}>{r.text}</span>
                  <span className="muted small">{formatDue(r.due)}</span>
                </li>
              ))}
            </ul>
          )}
          {!total && (
            <a className="btn primary" href="#/">
              Ir a las lecciones
            </a>
          )}
        </div>
      </div>
    )
  }

  const L = LANG[card.lang]
  const lesson = LESSON[card.lessonId]
  const opts = { lang: L.bcp, rate: settings.rate, voiceName: settings.voices[card.lang] }

  const advance = () => {
    setResult(null)
    setNextDue(null)
    setReveal(false)
    setPos((p) => p + 1)
  }

  return (
    <div className="page narrow review-page" style={{ '--lang': L.color }}>
      <header className="page-head">
        <p className="eyebrow">
          Repaso {pos + 1} de {queue.length} · {L.name}
        </p>
        <h1>{card.kind === 'fragment' ? 'Parte que te costó' : 'Frase de la lección'}</h1>
        {lesson && <p className="muted">{lesson.titleEs}</p>}
      </header>
      <section className="step-card review-card">
        <Orb color={L.color} size={130} onClick={() => speak(card.text, opts)} label="Escuchar" />
        <p className="muted small">Escúchala, y luego dila sin mirar.</p>
        <button type="button" className={`review-text ${reveal || result ? '' : 'blurred'}`} onClick={() => setReveal(true)} lang={L.bcp} dir={L.rtl ? 'rtl' : 'ltr'}>
          {card.text}
          {L.rom && settings.showRom && card.rom && (reveal || result) && <span className="line-rom" dir="ltr">{card.rom}</span>}
        </button>
        {card.tr && <p className="muted">{card.tr}</p>}
        <div className="row center wrap">
          <button className="btn" onClick={() => speak(card.text, opts)}>
            <Icon name="play" size={16} /> Escuchar
          </button>
          <SayIt
            lang={card.lang}
            expected={card.text}
            label="Decirla"
            color={L.color}
            onResult={(r) => {
              setResult(r)
              setNextDue(gradeCard(card, r.score).due)
            }}
            disabled={!!result}
          />
        </div>
        {result && (
          <div className="feedback">
            <Meter value={result.score} color={L.color} />
            <p className="feedback-label">
              {scoreLabel(result.score)}. Volverá {formatDue(nextDue)}.
            </p>
            <TokenDiff result={result} lang={card.lang} />
            <button className="btn primary" onClick={advance}>
              Siguiente <Icon name="next" size={16} />
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
