import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store.js'
import { LANG } from '../data/languages.js'
import { buildSystemPrompt, geminiTurn } from '../lib/gemini.js'
import { listen, speak, stopSpeaking, support, speechErrorMessage } from '../lib/speech.js'
import { touchStreak } from '../lib/store.js'
import Icon from './Icon.jsx'

/** Conversacion libre con Gemini. La persona habla (o escribe) y la IA responde. */
export default function FreeChat({ lang, lesson }) {
  const L = LANG[lang]
  const { geminiKey, geminiModel, rate, voices, showRom } = useStore((s) => s.settings)
  const [msgs, setMsgs] = useState([])
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [typed, setTyped] = useState('')
  const [error, setError] = useState('')
  const endRef = useRef(null)
  const system = buildSystemPrompt({ language: L, lesson, withRom: L.rom })

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [msgs, busy])
  useEffect(() => () => stopSpeaking(), [])

  const send = async (text, history = msgs) => {
    setError('')
    const userMsg = text ? [{ role: 'user', text }] : []
    const nextHistory = [...history, ...userMsg]
    setMsgs(nextHistory)
    setBusy(true)
    try {
      const kickoff = { role: 'user', text: '(La persona acaba de llegar. Saluda y empieza la escena.)' }
      const apiHistory = nextHistory[0]?.role === 'user' ? nextHistory : [kickoff, ...nextHistory]
      const out = await geminiTurn({ apiKey: geminiKey, model: geminiModel, system, history: apiHistory.map((m) => ({ role: m.role, text: m.role === 'user' ? m.text : JSON.stringify(m.raw || { reply: m.text }) })) })
      const ai = { role: 'model', text: out.reply || '', rom: out.romanization || '', tr: out.translation_es || '', raw: out }
      setMsgs((m) => {
        const copy = [...m]
        if (userMsg.length && out.feedback_es) copy[copy.length - 1] = { ...copy[copy.length - 1], feedback: out.feedback_es, usedTarget: out.used_target }
        return [...copy, ai]
      })
      if (ai.text) speak(ai.text, { lang: L.bcp, rate, voiceName: voices[lang] })
    } catch (e) {
      setError(`Gemini no respondió: ${e.message}. Revisa tu API key y el modelo en Ajustes.`)
    } finally {
      setBusy(false)
    }
  }

  const talk = async () => {
    stopSpeaking()
    setListening(true)
    setInterim('')
    try {
      const { transcript } = await listen({ lang: L.bcp, onInterim: setInterim })
      if (transcript) {
        touchStreak(1)
        await send(transcript)
      } else setError('No te escuché. Inténtalo otra vez.')
    } catch (e) {
      setError(speechErrorMessage(e))
    } finally {
      setListening(false)
    }
  }

  if (!geminiKey) {
    return (
      <div className="empty">
        <Icon name="key" size={22} />
        <p>El modo libre usa Gemini con tu propia API key. Agrégala en Ajustes; se guarda solo en este navegador.</p>
        <a className="btn primary" href="#/ajustes">
          Ir a Ajustes
        </a>
      </div>
    )
  }

  return (
    <div className="free">
      <div className="chat">
        {msgs.length === 0 && !busy && (
          <div className="empty">
            <p>Conversa libremente. Gemini responde en {L.name.toLowerCase()} y te corrige con suavidad.</p>
            <button className="btn primary" onClick={() => send('')}>
              <Icon name="spark" size={16} /> Empezar
            </button>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.role === 'user' ? 'me' : 'npc'}`}>
            <div className="bubble-body" lang={L.bcp} dir={L.rtl ? 'rtl' : 'ltr'}>
              <p>{m.text}</p>
              {m.rom && showRom && <p className="line-rom" dir="ltr">{m.rom}</p>}
              {m.tr && (
                <details>
                  <summary>Traducción</summary>
                  <p dir="ltr">{m.tr}</p>
                </details>
              )}
            </div>
            {m.role === 'model' && (
              <button className="icon-btn ghost" aria-label="Escuchar" onClick={() => speak(m.text, { lang: L.bcp, rate, voiceName: voices[lang] })}>
                <Icon name="play" size={16} />
              </button>
            )}
            {m.feedback && <p className="bubble-fb">{m.feedback}</p>}
          </div>
        ))}
        {busy && <div className="bubble npc typing"><span /><span /><span /></div>}
        <div ref={endRef} />
      </div>
      {listening && interim && <p className="interim">{interim}</p>}
      {error && <p className="error">{error}</p>}
      {msgs.length > 0 && (
        <div className="row wrap">
          {support.stt && (
            <button className={`mic ${listening ? 'is-on' : ''}`} style={{ '--accent': L.color }} onClick={talk} disabled={busy || listening}>
              <Icon name="mic" size={20} /> <span>{listening ? 'Escuchando…' : 'Hablar'}</span>
            </button>
          )}
          <form
            className="say-typed grow"
            onSubmit={(e) => {
              e.preventDefault()
              if (typed.trim()) send(typed.trim())
              setTyped('')
            }}
          >
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="O escribe aquí" lang={L.bcp} dir={L.rtl ? 'rtl' : 'ltr'} disabled={busy} />
            <button className="btn" type="submit" disabled={busy}>
              Enviar
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
