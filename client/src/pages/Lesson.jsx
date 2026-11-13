import { useEffect, useRef, useState } from 'react'
import { LESSON } from '../data/lessons.js'
import { LANG } from '../data/languages.js'
import { useStore } from '../lib/store.js'
import { speak, stopSpeaking, wait } from '../lib/speech.js'
import { failedSpan, scoreLabel } from '../lib/compare.js'
import { addErrorReview, saveLesson, scheduleSentence } from '../lib/reviews.js'
import { formatDue } from '../lib/srs.js'
import { go } from '../lib/router.js'
import Icon from '../components/Icon.jsx'
import Orb from '../components/Orb.jsx'
import Cover from '../components/Cover.jsx'
import SayIt from '../components/SayIt.jsx'
import FreeChat from '../components/FreeChat.jsx'
import { Line, TokenDiff, Meter } from '../components/ui.jsx'

const STEPS = [
  { key: 'listen', name: 'Escuchar', hint: 'Escucha la escena. La traducción aparece solo si tocas una frase.' },
  { key: 'build', name: 'Construir', hint: 'Arma la frase de atrás hacia adelante, bloque por bloque.' },
  { key: 'shadow', name: 'Shadowing', hint: 'Habla encima del audio, al mismo tiempo, imitando el ritmo.' },
  { key: 'compare', name: 'Comparar', hint: 'Mira qué salió bien y repite solo la parte que falló.' },
  { key: 'converse', name: 'Usar', hint: 'Di la frase tú solo dentro de una mini conversación.' },
  { key: 'review', name: 'Repaso', hint: 'La frase volverá justo antes de que la olvides.' }
]

function useVoiceOpts(lang) {
  const rate = useStore((s) => s.settings.rate)
  const voices = useStore((s) => s.settings.voices)
  const L = LANG[lang]
  return (rateMul = 1) => ({ lang: L.bcp, rate: rate * rateMul, voiceName: voices[lang] })
}

export default function Lesson({ id }) {
  const lesson = LESSON[id]
  const saved = useStore((s) => s.progress.lessons[id])
  const [step, setStep] = useState(0)
  const [shared, setShared] = useState({ lastResult: null, best: 0 })
  useEffect(() => () => stopSpeaking(), [])
  useEffect(() => {
    stopSpeaking()
    window.scrollTo(0, 0)
  }, [step])

  if (!lesson) {
    return (
      <div className="page narrow">
        <p>No encontramos esta lección.</p>
        <a className="btn" href="#/">Volver al inicio</a>
      </div>
    )
  }
  const L = LANG[lesson.lang]
  const next = (patch = {}) => {
    setShared((s) => ({ ...s, ...patch, best: Math.max(s.best, patch.lastResult?.score || 0) }))
    const n = Math.min(step + 1, STEPS.length - 1)
    saveLesson(id, { step: n })
    setStep(n)
  }

  const S = STEPS[step]
  return (
    <div className="page lesson" style={{ '--lang': L.color }}>
      <header className="lesson-head">
        <a className="icon-btn" href={`#/idioma/${lesson.lang}`} aria-label="Volver">
          <Icon name="back" />
        </a>
        <div className="lesson-title">
          <span className="eyebrow">{L.name} · {lesson.titleEs}</span>
          <h1 lang={L.bcp}>{lesson.title}</h1>
        </div>
      </header>

      <ol className="stepper" aria-label="Pasos de la lección">
        {STEPS.map((s, i) => {
          const reachable = i <= Math.max(step, saved?.step || 0)
          return (
            <li key={s.key} className={i === step ? 'now' : i < step ? 'done' : ''}>
              <button type="button" disabled={!reachable} onClick={() => setStep(i)}>
                <span className="num">{i < step ? <Icon name="check" size={14} /> : i + 1}</span>
                <span className="lbl">{s.name}</span>
              </button>
            </li>
          )
        })}
      </ol>

      <section className="step-card">
        <div className="step-intro">
          <h2>
            {step + 1}. {S.name}
          </h2>
          <p>{S.hint}</p>
        </div>
        {S.key === 'listen' && <StepListen lesson={lesson} onNext={() => next()} />}
        {S.key === 'build' && <StepBuild lesson={lesson} onNext={() => next()} />}
        {S.key === 'shadow' && <StepShadow lesson={lesson} onNext={(r) => next({ lastResult: r })} />}
        {S.key === 'compare' && <StepCompare lesson={lesson} initial={shared.lastResult} onNext={(r) => next({ lastResult: r })} />}
        {S.key === 'converse' && <StepConverse lesson={lesson} onNext={(r) => next({ lastResult: r })} />}
        {S.key === 'review' && <StepReview lesson={lesson} best={shared.best} />}
      </section>
    </div>
  )
}

/* 1. Escuchar */
function StepListen({ lesson, onNext }) {
  const L = LANG[lesson.lang]
  const opts = useVoiceOpts(lesson.lang)
  const [mode, setMode] = useState('audio')
  const [active, setActive] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [listens, setListens] = useState(0)
  const run = useRef(0)

  const playStory = async () => {
    if (playing) {
      run.current++
      stopSpeaking()
      setPlaying(false)
      setActive(-1)
      return
    }
    const token = ++run.current
    setPlaying(true)
    for (let i = 0; i < lesson.story.length; i++) {
      const isTarget = i === lesson.targetIndex
      const times = isTarget ? 3 : 1
      for (let k = 0; k < times; k++) {
        if (run.current !== token) return
        setActive(i)
        await speak(lesson.story[i].text, opts(isTarget && k === 0 ? 0.85 : 1))
        if (isTarget) setListens((n) => n + 1)
        await wait(isTarget ? 700 : 350)
      }
    }
    if (run.current === token) {
      setPlaying(false)
      setActive(-1)
    }
  }

  const playTarget = async () => {
    run.current++
    setPlaying(false)
    setActive(lesson.targetIndex)
    await speak(lesson.sentence.text, opts())
    setListens((n) => n + 1)
  }

  return (
    <div className="listen">
      <div className="listen-stage">
        <Cover scene={lesson.scene} color={L.color} className="listen-cover" title={lesson.titleEs} />
        <div className="listen-orb">
          <Orb color={L.color} size={120} onClick={playStory} label={playing ? 'Pausar' : 'Escuchar la escena'} />
        </div>
      </div>
      <div className="row between">
        <div className="seg" role="tablist" aria-label="Modo">
          <button role="tab" aria-selected={mode === 'audio'} className={mode === 'audio' ? 'on' : ''} onClick={() => setMode('audio')}>
            <Icon name="headphones" size={16} /> Audio
          </button>
          <button role="tab" aria-selected={mode === 'text'} className={mode === 'text' ? 'on' : ''} onClick={() => setMode('text')}>
            <Icon name="text" size={16} /> Texto
          </button>
        </div>
        <button className="btn" onClick={playStory}>
          <Icon name={playing ? 'stop' : 'play'} size={16} /> {playing ? 'Detener' : 'Escuchar la escena'}
        </button>
      </div>
      <div className="story">
        {lesson.story.map((l, i) => (
          <Line key={l.id} line={l} lang={lesson.lang} active={i === active} big={i === lesson.targetIndex} hideText={mode === 'audio' && i !== active} />
        ))}
      </div>
      <div className="step-foot">
        <button className="btn ghost" onClick={playTarget}>
          <Icon name="repeat" size={16} /> Repetir la frase clave
        </button>
        <span className="muted small">Escuchada {listens} {listens === 1 ? 'vez' : 'veces'}</span>
        <button className="btn primary" onClick={onNext} disabled={listens < 3} title={listens < 3 ? 'Escucha la frase al menos 3 veces' : ''}>
          {listens < 3 ? `Escucha ${3 - listens} más` : 'Construir la frase'} <Icon name="next" size={16} />
        </button>
      </div>
    </div>
  )
}

/* 2. Construir de atras hacia adelante */
function StepBuild({ lesson, onNext }) {
  const L = LANG[lesson.lang]
  const opts = useVoiceOpts(lesson.lang)
  const showRom = useStore((s) => s.settings.showRom)
  const [idx, setIdx] = useState(0)
  const [result, setResult] = useState(null)
  const [tries, setTries] = useState(0)
  const chunk = lesson.chunks[idx]
  const last = idx === lesson.chunks.length - 1
  const fluent = result && result.score >= 0.85

  useEffect(() => {
    setResult(null)
    setTries(0)
    const t = setTimeout(() => speak(chunk.text, opts(0.9)), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  return (
    <div className="build">
      <div className="blocks" dir={L.rtl ? 'rtl' : 'ltr'}>
        {lesson.chunks.map((c, i) => (
          <button
            key={i}
            type="button"
            className={`block ${i === idx ? 'now' : i < idx ? 'done' : 'todo'}`}
            onClick={() => i <= idx && speak(c.text, opts(0.9))}
            disabled={i > idx}
            lang={L.bcp}
          >
            {i <= idx ? c.text : '· · ·'}
          </button>
        ))}
      </div>
      <div className="focus-phrase" lang={L.bcp} dir={L.rtl ? 'rtl' : 'ltr'}>
        <p className="phrase">{chunk.text}</p>
        {L.rom && showRom && chunk.rom && <p className="rom" dir="ltr">{chunk.rom}</p>}
      </div>
      <div className="row center wrap">
        <button className="btn" onClick={() => speak(chunk.text, opts(0.9))}>
          <Icon name="play" size={16} /> Escuchar bloque
        </button>
        <SayIt
          lang={lesson.lang}
          expected={chunk.text}
          label="Repetir en voz alta"
          color={L.color}
          onResult={(r) => {
            setResult(r)
            setTries((t) => t + 1)
          }}
        />
      </div>
      {result && (
        <div className="feedback">
          <Meter value={result.score} color={L.color} />
          <p className="feedback-label">{fluent ? 'Fluido. Puedes añadir el siguiente bloque.' : `${scoreLabel(result.score)}. Escucha y repite otra vez.`}</p>
          <TokenDiff result={result} lang={lesson.lang} />
        </div>
      )}
      <div className="step-foot">
        <span className="muted small">
          Bloque {idx + 1} de {lesson.chunks.length}
        </span>
        {(fluent || tries >= 3) && (
          <button className="btn primary" onClick={() => (last ? onNext() : setIdx(idx + 1))}>
            {last ? 'Pasar al shadowing' : 'Añadir el bloque anterior'} <Icon name="next" size={16} />
          </button>
        )}
        {!fluent && tries < 3 && <span className="muted small">Repite hasta que salga fluido</span>}
      </div>
    </div>
  )
}

/* 3. Shadowing */
const SPEEDS = [0.6, 0.75, 0.9, 1]

function StepShadow({ lesson, onNext }) {
  const L = LANG[lesson.lang]
  const opts = useVoiceOpts(lesson.lang)
  const [level, setLevel] = useState(0)
  const [results, setResults] = useState({})
  const speed = SPEEDS[level]
  const r = results[level]
  const text = lesson.sentence.text

  return (
    <div className="shadow">
      <div className="shadow-orb">
        <Orb color={L.color} size={180} />
        <div className="speed-pills" role="group" aria-label="Velocidad">
          {SPEEDS.map((s, i) => (
            <button key={s} type="button" className={i === level ? 'on' : results[i] ? 'done' : ''} onClick={() => i <= level && setLevel(i)} disabled={i > level}>
              {s}x
            </button>
          ))}
        </div>
      </div>
      <div className="focus-phrase" lang={L.bcp} dir={L.rtl ? 'rtl' : 'ltr'}>
        <Line line={lesson.sentence} lang={lesson.lang} big onPlay={() => speak(text, opts(speed))} />
      </div>
      <p className="tip">
        <Icon name="headphones" size={16} /> Usa audífonos: así el micrófono te oye a ti y no al audio.
      </p>
      <div className="row center">
        <SayIt
          lang={lesson.lang}
          expected={text}
          label={`Hablar junto al audio a ${speed}x`}
          color={L.color}
          maxMs={5000 + (text.length * 140) / speed}
          beforeListen={async () => {
            await wait(350)
            await speak(text, opts(speed))
          }}
          onResult={(res) => setResults((x) => ({ ...x, [level]: res }))}
        />
      </div>
      {r && (
        <div className="feedback">
          <Meter value={r.score} color={L.color} />
          <p className="feedback-label">
            {scoreLabel(r.score)} a {speed}x.
          </p>
          <TokenDiff result={r} lang={lesson.lang} />
        </div>
      )}
      <div className="step-foot">
        <span className="muted small">La velocidad sube de 0.6x a 1x</span>
        {r && level < SPEEDS.length - 1 && (
          <button className="btn primary" onClick={() => setLevel(level + 1)}>
            Subir a {SPEEDS[level + 1]}x <Icon name="next" size={16} />
          </button>
        )}
        {r && level === SPEEDS.length - 1 && (
          <button className="btn primary" onClick={() => onNext(r)}>
            Ver la comparación <Icon name="next" size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

/* 4. Comparacion */
function StepCompare({ lesson, initial, onNext }) {
  const L = LANG[lesson.lang]
  const opts = useVoiceOpts(lesson.lang)
  const text = lesson.sentence.text
  const [result, setResult] = useState(initial)
  const [partResult, setPartResult] = useState(null)
  const [saved, setSaved] = useState([])
  const span = result ? failedSpan(result, text) : null

  // Los errores se convierten en frases de repaso.
  const keepError = (r) => {
    const sp = failedSpan(r, text)
    if (!sp) return
    const card = addErrorReview(lesson, sp)
    if (card) setSaved((s) => (s.includes(card.text) ? s : [...s, card.text]))
  }
  const once = useRef(false)
  useEffect(() => {
    if (initial && !once.current) {
      once.current = true
      keepError(initial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onFull = (r) => {
    setResult(r)
    setPartResult(null)
    keepError(r)
  }

  return (
    <div className="compare">
      {!result && <p className="muted">Di la frase completa y te mostramos palabra por palabra cómo salió.</p>}
      {result && (
        <div className="feedback big">
          <div className="score-ring" style={{ '--p': result.score, '--c': L.color }}>
            <span>{Math.round(result.score * 100)}</span>
          </div>
          <div>
            <TokenDiff result={result} lang={lesson.lang} />
            <p className="legend">
              <span className="tok tok-ok">bien</span> <span className="tok tok-close">casi</span> <span className="tok tok-miss">faltó</span>
            </p>
            {result.heard && (
              <p className="heard" lang={L.bcp}>
                Escuchamos: «{result.heard}»
              </p>
            )}
          </div>
        </div>
      )}
      {span && (
        <div className="fix">
          <p>
            Practica solo esta parte:{' '}
            <strong lang={L.bcp} dir={L.rtl ? 'rtl' : 'ltr'}>
              {span.text}
            </strong>
          </p>
          <div className="row wrap">
            <button className="btn" onClick={() => speak(span.text, opts(0.8))}>
              <Icon name="repeat" size={16} /> Repetir lo que falló
            </button>
            <SayIt lang={lesson.lang} expected={span.text} label="Decir esta parte" color={L.color} onResult={setPartResult} compact />
          </div>
          {partResult && (
            <div className="feedback">
              <Meter value={partResult.score} color={L.color} />
              <TokenDiff result={partResult} lang={lesson.lang} />
            </div>
          )}
        </div>
      )}
      {result && !span && <p className="good">Todas las palabras salieron bien.</p>}
      {saved.length > 0 && (
        <p className="muted small">
          Guardamos para repasar: {saved.map((s) => `«${s}»`).join(', ')}
        </p>
      )}
      <div className="step-foot">
        <SayIt lang={lesson.lang} expected={text} label={result ? 'Decir la frase completa otra vez' : 'Decir la frase completa'} color={L.color} onResult={onFull} />
        {result && (
          <button className="btn primary" onClick={() => onNext(result)}>
            Usarla en una conversación <Icon name="next" size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

/* 5. Mini conversacion */
function StepConverse({ lesson, onNext }) {
  const L = LANG[lesson.lang]
  const opts = useVoiceOpts(lesson.lang)
  const hasKey = useStore((s) => !!s.settings.geminiKey)
  const [mode, setMode] = useState('script')
  const [nodeId, setNodeId] = useState(lesson.dialog.start)
  const [log, setLog] = useState([])
  const [miss, setMiss] = useState(null)
  const [peek, setPeek] = useState(false)
  const [targetResult, setTargetResult] = useState(null)
  const node = lesson.dialog.nodes[nodeId]
  const done = node.options.length === 0
  const endRef = useRef(null)

  useEffect(() => {
    if (mode !== 'script') return
    setLog((l) => [...l, { who: 'npc', line: node.npc }])
    setMiss(null)
    setPeek(false)
    const t = setTimeout(() => speak(node.npc.text, opts()), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, mode])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [log])

  const restart = () => {
    setLog([])
    setNodeId(lesson.dialog.start)
    if (nodeId === lesson.dialog.start) setLog([{ who: 'npc', line: node.npc }])
  }

  const onSaid = (r) => {
    if (r.score < 0.6) {
      setMiss(r)
      speak(lesson.lang === 'es' ? '¿Perdón?' : lesson.dialog.nodes[nodeId].npc.text, opts(0.9))
      return
    }
    const opt = node.options[r.option]
    if (opt.isTarget) setTargetResult(r)
    setLog((l) => [...l, { who: 'me', line: opt, result: r }])
    setNodeId(opt.next)
  }

  return (
    <div className="converse">
      {hasKey && (
        <div className="seg" role="tablist" aria-label="Modo de conversación">
          <button className={mode === 'script' ? 'on' : ''} onClick={() => setMode('script')}>
            <Icon name="chat" size={16} /> Guionada
          </button>
          <button className={mode === 'free' ? 'on' : ''} onClick={() => setMode('free')}>
            <Icon name="spark" size={16} /> Libre con Gemini
          </button>
        </div>
      )}
      {mode === 'free' ? (
        <FreeChat lang={lesson.lang} lesson={lesson} />
      ) : (
        <>
          <div className="chat">
            {log.map((m, i) => (
              <div key={i} className={`bubble ${m.who}`}>
                <Line line={m.line} lang={lesson.lang} />
                {m.result && <span className="bubble-score">{Math.round(m.result.score * 100)}%</span>}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          {!done && (
            <div className="your-turn">
              <p className="eyebrow">Tu turno. Responde con una de estas ideas:</p>
              <ul className="ideas">
                {node.options.map((o, i) => (
                  <li key={i} className={o.isTarget ? 'target' : ''}>
                    <span>{o.tr}</span>
                    {peek && (
                      <span className="peek" lang={L.bcp} dir={L.rtl ? 'rtl' : 'ltr'}>
                        {o.text}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <div className="row wrap">
                <SayIt lang={lesson.lang} expected={node.options.map((o) => o.text)} label="Responder" color={L.color} onResult={onSaid} />
                <button className="btn ghost" onClick={() => setPeek((p) => !p)}>
                  <Icon name="eye" size={16} /> {peek ? 'Ocultar texto' : 'Ver texto'}
                </button>
              </div>
              {miss && (
                <div className="feedback">
                  <p className="feedback-label">No te entendieron bien. Inténtalo otra vez.</p>
                  <TokenDiff result={miss} lang={lesson.lang} />
                </div>
              )}
            </div>
          )}
        </>
      )}
      <div className="step-foot">
        {mode === 'script' && done && (
          <button className="btn ghost" onClick={restart}>
            <Icon name="repeat" size={16} /> Probar otra rama
          </button>
        )}
        {(done || mode === 'free') && (
          <button className="btn primary" onClick={() => onNext(targetResult)}>
            Programar el repaso <Icon name="next" size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

/* 6. Repaso espaciado */
function StepReview({ lesson, best }) {
  const L = LANG[lesson.lang]
  const reviews = useStore((s) => s.progress.reviews)
  const [card, setCard] = useState(null)
  const once = useRef(false)
  useEffect(() => {
    if (once.current) return
    once.current = true
    const score = best || 0.7
    setCard(scheduleSentence(lesson, score))
    saveLesson(lesson.id, { completedAt: Date.now(), bestScore: score, step: 5 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const fragments = Object.values(reviews).filter((r) => r.lessonId === lesson.id && r.kind === 'fragment')
  return (
    <div className="review-done">
      <Orb color={L.color} size={140} mode="idle" />
      <h3>Lección completada</h3>
      {card && (
        <p>
          La frase volverá <strong>{formatDue(card.due)}</strong>. Cada vez que la recuerdes bien, tardará más en volver.
        </p>
      )}
      {fragments.length > 0 && (
        <div className="frag-list">
          <p className="eyebrow">También repasarás las partes que fallaron</p>
          <ul>
            {fragments.map((f) => (
              <li key={f.id} lang={L.bcp}>
                {f.text}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="row center wrap">
        <button className="btn" onClick={() => go(`/lector/${lesson.id}`)}>
          <Icon name="book" size={16} /> Leer la historia
        </button>
        <button className="btn primary" onClick={() => go(`/idioma/${lesson.lang}`)}>
          Siguiente lección <Icon name="next" size={16} />
        </button>
      </div>
    </div>
  )
}
