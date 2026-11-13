import { useCallback, useState } from 'react'
import { apiEnabled, authApi, googleClientId } from '../lib/api.js'
import { useAuth, signedIn, signOut, updateUser } from '../lib/auth.js'
import GoogleButton from '../components/GoogleButton.jsx'
import Icon from '../components/Icon.jsx'

export default function Account() {
  const { user, syncState, checked } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const run = async (fn) => {
    setBusy(true)
    setMsg('')
    try {
      await fn()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setBusy(false)
    }
  }

  const onGoogle = useCallback((credential) => run(async () => signedIn(await authApi.google(credential))), [])

  if (!apiEnabled) {
    return (
      <div className="page narrow">
        <header className="page-head">
          <h1>Cuenta</h1>
        </header>
        <section className="panel">
          <h2>Modo invitado</h2>
          <p>Estás usando Orbezu sin cuenta. Tu progreso se guarda en este navegador y todo funciona igual.</p>
          <p className="muted small">Para activar el registro, el inicio de sesión y la sincronización, configura VITE_API_URL con la dirección del servidor. Los pasos están en el README.</p>
        </section>
      </div>
    )
  }

  if (!checked) {
    return (
      <div className="page narrow">
        <p className="muted">Comprobando tu sesión…</p>
      </div>
    )
  }

  if (user) {
    return (
      <div className="page narrow">
        <header className="page-head">
          <h1>Cuenta</h1>
        </header>
        <section className="panel">
          <h2>
            <Icon name="cloud" size={20} /> {user.name || 'Sesión iniciada'}
          </h2>
          <p>{user.email}</p>
          <p className="muted small">
            {syncState === 'synced'
              ? 'Tu progreso está sincronizado.'
              : syncState === 'syncing'
                ? 'Sincronizando…'
                : syncState === 'error'
                  ? 'No se pudo sincronizar. Lo intentaremos de nuevo con tu próximo avance.'
                  : 'Preparando la sincronización…'}
          </p>
          <label className="toggle">
            <input
              type="checkbox"
              checked={!!user.remindersEnabled}
              onChange={(e) => run(async () => updateUser((await authApi.update({ remindersEnabled: e.target.checked })).user))}
            />
            <span>Recibir un correo cuando tenga frases para repasar</span>
          </label>
          <div className="row wrap">
            <button className="btn" onClick={signOut}>
              Cerrar sesión
            </button>
            {!confirmDelete ? (
              <button className="btn ghost danger" onClick={() => setConfirmDelete(true)}>
                Eliminar cuenta
              </button>
            ) : (
              <>
                <span className="small">Se borrarán tu cuenta y tu progreso en la nube.</span>
                <button
                  className="btn danger"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await authApi.remove()
                      signOut()
                    })
                  }
                >
                  Sí, eliminar
                </button>
                <button className="btn ghost" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </button>
              </>
            )}
          </div>
          {msg && <p className="error">{msg}</p>}
        </section>
      </div>
    )
  }

  const submit = (e) => {
    e.preventDefault()
    run(async () => {
      const payload = mode === 'register' ? form : { email: form.email, password: form.password }
      const out = mode === 'register' ? await authApi.register(payload) : await authApi.login(payload)
      await signedIn(out)
    })
  }

  return (
    <div className="page narrow">
      <header className="page-head">
        <h1>{mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}</h1>
        <p className="muted">Guarda tu progreso en la nube y úsalo en varios dispositivos. Lo que hiciste como invitado se conserva.</p>
      </header>
      <section className="panel auth">
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>
            Iniciar sesión
          </button>
          <button role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')}>
            Registrarme
          </button>
        </div>
        {googleClientId && (
          <>
            <GoogleButton onCredential={onGoogle} text={mode === 'register' ? 'signup_with' : 'continue_with'} />
            <div className="divider">
              <span>o con tu correo</span>
            </div>
          </>
        )}
        <form onSubmit={submit} className="form">
          {mode === 'register' && (
            <label className="field">
              <span>Nombre</span>
              <input required maxLength={80} value={form.name} onChange={set('name')} autoComplete="name" />
            </label>
          )}
          <label className="field">
            <span>Correo</span>
            <input type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input type="password" required minLength={8} value={form.password} onChange={set('password')} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
            {mode === 'register' && <small className="muted">Mínimo 8 caracteres.</small>}
          </label>
          <button className="btn primary" disabled={busy}>
            {busy ? 'Un momento…' : mode === 'register' ? 'Crear cuenta' : 'Entrar'}
          </button>
        </form>
        {msg && <p className="error">{msg}</p>}
      </section>
    </div>
  )
}
