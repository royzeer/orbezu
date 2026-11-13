import { useEffect } from 'react'
import { useRoute } from './lib/router.js'
import { useStore } from './lib/store.js'
import { useAuthSync, useAuth } from './lib/auth.js'
import { isDue } from './lib/srs.js'
import Icon from './components/Icon.jsx'
import { BrowserNotice } from './components/ui.jsx'
import Home from './pages/Home.jsx'
import Language from './pages/Language.jsx'
import Lesson from './pages/Lesson.jsx'
import Review from './pages/Review.jsx'
import Library from './pages/Library.jsx'
import Reader from './pages/Reader.jsx'
import Settings from './pages/Settings.jsx'
import Account from './pages/Account.jsx'
import FreeTalk from './pages/FreeTalk.jsx'

function useTheme() {
  const theme = useStore((s) => s.settings.theme)
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])
}

function Logo() {
  return (
    <a href="#/" className="logo" aria-label="Orbezu, inicio">
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <defs>
          <radialGradient id="lg" cx="35%" cy="30%" r="80%">
            <stop offset="0" stopColor="#fff" />
            <stop offset=".4" stopColor="#8B7BFF" />
            <stop offset="1" stopColor="#1E1650" />
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="13" fill="url(#lg)" />
        <circle cx="16" cy="16" r="15" fill="none" stroke="#7DF0E0" strokeWidth="1.2" opacity=".7" />
      </svg>
      <span>Orbezu</span>
    </a>
  )
}

const TABS = [
  { path: '', label: 'Inicio', icon: 'home', match: ['', 'idioma', 'leccion', 'libre'] },
  { path: 'repaso', label: 'Repaso', icon: 'review', match: ['repaso'] },
  { path: 'lector', label: 'Historias', icon: 'book', match: ['lector'] },
  { path: 'ajustes', label: 'Ajustes', icon: 'settings', match: ['ajustes'] },
  { path: 'cuenta', label: 'Cuenta', icon: 'user', match: ['cuenta'] }
]

export default function App() {
  useTheme()
  useAuthSync()
  const parts = useRoute()
  const { user } = useAuth()
  const due = useStore((s) => Object.values(s.progress.reviews).filter((r) => isDue(r)).length)
  const [section = '', a] = parts
  const immersive = section === 'lector' && a

  let page
  switch (section) {
    case '':
      page = <Home />
      break
    case 'idioma':
      page = <Language code={a} />
      break
    case 'leccion':
      page = <Lesson key={a} id={a} />
      break
    case 'repaso':
      page = <Review />
      break
    case 'lector':
      page = a ? <Reader id={a} /> : <Library />
      break
    case 'libre':
      page = <FreeTalk code={a} />
      break
    case 'ajustes':
      page = <Settings />
      break
    case 'cuenta':
      page = <Account />
      break
    default:
      page = (
        <div className="page narrow">
          <h1>Página no encontrada</h1>
          <a className="btn" href="#/">
            Ir al inicio
          </a>
        </div>
      )
  }

  return (
    <div className={`app ${immersive ? 'is-immersive' : ''}`}>
      {!immersive && (
        <header className="topbar">
          <Logo />
          <nav className="tabs" aria-label="Principal">
            {TABS.map((t) => (
              <a key={t.label} href={`#/${t.path}`} className={t.match.includes(section) ? 'on' : ''} aria-current={t.match.includes(section) ? 'page' : undefined}>
                <Icon name={t.icon} size={20} />
                <span>{t.label === 'Cuenta' && user ? 'Tú' : t.label}</span>
                {t.path === 'repaso' && due > 0 && <b className="count">{due}</b>}
              </a>
            ))}
          </nav>
        </header>
      )}
      {!immersive && <BrowserNotice />}
      <main>{page}</main>
    </div>
  )
}
