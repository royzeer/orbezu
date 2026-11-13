import { useEffect, useRef, useState } from 'react'
import { googleClientId } from '../lib/api.js'

let scriptPromise = null
function loadGis() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://accounts.google.com/gsi/client'
      s.async = true
      s.onload = resolve
      s.onerror = () => reject(new Error('No se pudo cargar el inicio de sesión de Google.'))
      document.head.appendChild(s)
    })
  }
  return scriptPromise
}

/** Boton oficial de Google Identity Services. Entrega un ID token (credential). */
export default function GoogleButton({ onCredential, text = 'continue_with' }) {
  const ref = useRef(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!googleClientId) return
    let alive = true
    loadGis()
      .then(() => {
        if (!alive || !ref.current) return
        window.google.accounts.id.initialize({ client_id: googleClientId, callback: (r) => onCredential(r.credential) })
        const dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
        window.google.accounts.id.renderButton(ref.current, { theme: dark ? 'filled_black' : 'outline', size: 'large', shape: 'pill', text, locale: 'es', width: 300 })
      })
      .catch((e) => setError(e.message))
    return () => {
      alive = false
    }
  }, [onCredential, text])
  if (!googleClientId) return null
  return (
    <div className="google-btn">
      <div ref={ref} />
      {error && <p className="error">{error}</p>}
    </div>
  )
}
