import { useEffect, useState } from 'react'
import { useStore, updateSettings, resetProgress } from '../lib/store.js'
import { LANGUAGES } from '../data/languages.js'
import { voicesFor, speak, support, browserInfo } from '../lib/speech.js'
import { geminiTurn } from '../lib/gemini.js'
import Icon from '../components/Icon.jsx'

export default function Settings() {
  const s = useStore((st) => st.settings)
  const [, force] = useState(0)
  const [keyDraft, setKeyDraft] = useState(s.geminiKey)
  const [test, setTest] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const b = browserInfo()

  useEffect(() => {
    const on = () => force((n) => n + 1)
    window.speechSynthesis?.addEventListener?.('voiceschanged', on)
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', on)
  }, [])

  const testKey = async () => {
    setTest('Probando…')
    try {
      const out = await geminiTurn({
        apiKey: keyDraft.trim(),
        model: s.geminiModel,
        system: 'Responde solo JSON {"reply": "ok"}.',
        history: [{ role: 'user', text: 'ping' }]
      })
      setTest(out.reply ? 'La key funciona.' : 'Gemini respondió, pero sin texto.')
    } catch (e) {
      setTest(`No funcionó: ${e.message}`)
    }
  }

  return (
    <div className="page narrow">
      <header className="page-head">
        <h1>Ajustes</h1>
      </header>

      <section className="panel">
        <h2>Apariencia</h2>
        <div className="seg" role="radiogroup" aria-label="Tema">
          {[
            ['system', 'Sistema'],
            ['light', 'Claro'],
            ['dark', 'Oscuro']
          ].map(([v, n]) => (
            <button key={v} role="radio" aria-checked={s.theme === v} className={s.theme === v ? 'on' : ''} onClick={() => updateSettings({ theme: v })}>
              {n}
            </button>
          ))}
        </div>
        <label className="toggle">
          <input type="checkbox" checked={s.showRom} onChange={(e) => updateSettings({ showRom: e.target.checked })} />
          <span>Mostrar romanización en mandarín, japonés, coreano, árabe y ruso</span>
        </label>
      </section>

      <section className="panel">
        <h2>Voz</h2>
        <p className="muted small">
          Navegador: {b.name}. Lectura en voz alta: {support.tts ? 'disponible' : 'no disponible'}. Reconocimiento de voz: {support.stt ? 'disponible' : 'no disponible'}.
          {' '}Orbezu funciona mejor en Chrome y Edge. El reconocimiento de voz de Chrome envía el audio a los servidores de Google para transcribirlo.
        </p>
        <label className="field">
          <span>Velocidad base: {s.rate.toFixed(2)}x</span>
          <input type="range" min="0.6" max="1.2" step="0.05" value={s.rate} onChange={(e) => updateSettings({ rate: Number(e.target.value) })} />
        </label>
        <div className="voice-list">
          {LANGUAGES.map((l) => {
            const vs = voicesFor(l.bcp)
            return (
              <div key={l.code} className="voice-row" style={{ '--lang': l.color }}>
                <span className="dot" />
                <span className="voice-name">{l.name}</span>
                {vs.length ? (
                  <select value={s.voices[l.code] || ''} onChange={(e) => updateSettings({ voices: { ...s.voices, [l.code]: e.target.value } })} aria-label={`Voz para ${l.name}`}>
                    <option value="">Automática</option>
                    {vs.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="muted small">Sin voz instalada</span>
                )}
                <button className="icon-btn ghost" aria-label={`Probar voz de ${l.name}`} onClick={() => speak(l.native, { lang: l.bcp, rate: s.rate, voiceName: s.voices[l.code] })}>
                  <Icon name="play" size={16} />
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <section className="panel">
        <h2>Modo libre con Gemini (opcional)</h2>
        <p className="muted small">
          Cada persona usa su propia API key. Se guarda solo en este navegador, nunca se sincroniza, y las peticiones van directo de tu navegador a Google. Puedes crear una key gratis en Google AI Studio.
        </p>
        <label className="field">
          <span>API key</span>
          <input type="password" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} placeholder="Pega tu API key" autoComplete="off" />
        </label>
        <label className="field">
          <span>Modelo</span>
          <input value={s.geminiModel} onChange={(e) => updateSettings({ geminiModel: e.target.value.trim() || 'gemini-flash-latest' })} />
        </label>
        <div className="row wrap">
          <button className="btn primary" onClick={() => updateSettings({ geminiKey: keyDraft.trim() })}>
            Guardar
          </button>
          <button className="btn" onClick={testKey} disabled={!keyDraft.trim()}>
            Probar
          </button>
          {s.geminiKey && (
            <button className="btn ghost" onClick={() => { setKeyDraft(''); updateSettings({ geminiKey: '' }) }}>
              Quitar key
            </button>
          )}
        </div>
        {test && <p className="muted small">{test}</p>}
      </section>

      <section className="panel">
        <h2>Datos</h2>
        <p className="muted small">En modo invitado tu progreso se guarda en este navegador. Para usarlo en varios dispositivos, crea una cuenta o inicia sesión en Cuenta.</p>
        <div className="row wrap">
          <a className="btn" href="#/cuenta">
            <Icon name="user" size={16} /> Cuenta
          </a>
          {!confirmReset ? (
            <button className="btn ghost danger" onClick={() => setConfirmReset(true)}>
              Borrar progreso
            </button>
          ) : (
            <>
              <span className="small">¿Seguro? No se puede deshacer.</span>
              <button className="btn danger" onClick={() => { resetProgress(); setConfirmReset(false) }}>
                Sí, borrar
              </button>
              <button className="btn ghost" onClick={() => setConfirmReset(false)}>
                Cancelar
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
