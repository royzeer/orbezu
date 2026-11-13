import { useEffect, useRef } from 'react'
import { getVoiceState, subscribeVoice } from '../lib/voiceBus.js'

// Orbe de voz: una forma organica que respira en reposo, late cuando
// la app habla y sigue el volumen del microfono cuando escucha.
export default function Orb({ color = '#6D5DF5', size = 220, label, onClick, mode: forcedMode }) {
  const pathA = useRef(null)
  const pathB = useRef(null)
  const ring = useRef(null)
  const id = useRef(`orb${Math.random().toString(36).slice(2, 8)}`).current

  useEffect(() => {
    let raf = 0
    let v = getVoiceState()
    let smooth = 0
    const unsub = subscribeVoice((s) => (v = s))
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const draw = (t) => {
      const mode = forcedMode || v.mode
      const target = mode === 'listening' ? 0.25 + v.level * 1.4 : mode === 'speaking' ? 0.55 + 0.35 * Math.sin(t / 140) ** 2 : 0.12
      smooth += (target - smooth) * 0.12
      const amp = reduce ? 0.05 : smooth
      const blob = (phase, r0) => {
        const pts = []
        const N = 8
        for (let i = 0; i < N; i++) {
          const a = (i / N) * Math.PI * 2
          const wob =
            Math.sin(a * 3 + t / 900 + phase) * 0.06 +
            Math.sin(a * 2 - t / 1300 + phase * 2) * 0.05 +
            Math.sin(a * 5 + t / 260) * 0.05 * amp
          const r = r0 * (1 + wob * (0.6 + amp * 1.6) + amp * 0.06)
          pts.push([100 + Math.cos(a) * r, 100 + Math.sin(a) * r])
        }
        // Curva suave (Catmull-Rom a Bezier).
        let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
        for (let i = 0; i < N; i++) {
          const p0 = pts[(i - 1 + N) % N]
          const p1 = pts[i]
          const p2 = pts[(i + 1) % N]
          const p3 = pts[(i + 2) % N]
          const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
          const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
          d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
        }
        return d + 'Z'
      }
      pathA.current?.setAttribute('d', blob(0, 62))
      pathB.current?.setAttribute('d', blob(2.1, 50))
      if (ring.current) {
        ring.current.setAttribute('r', String(78 + amp * 14))
        ring.current.style.opacity = String(0.15 + amp * 0.5)
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      unsub()
    }
  }, [forcedMode])

  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className="orb" style={{ width: size, height: size, '--orb': color }} onClick={onClick} aria-label={label} type={onClick ? 'button' : undefined}>
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        <defs>
          <radialGradient id={`${id}a`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="35%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor="#1b1446" stopOpacity="1" />
          </radialGradient>
          <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7DF0E0" stopOpacity="0.85" />
            <stop offset="100%" stopColor={color} stopOpacity="0.2" />
          </linearGradient>
          <filter id={`${id}g`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <circle ref={ring} cx="100" cy="100" r="80" fill="none" stroke={color} strokeWidth="1.5" />
        <path ref={pathA} fill={`url(#${id}a)`} />
        <path ref={pathB} fill={`url(#${id}b)`} filter={`url(#${id}g)`} style={{ mixBlendMode: 'screen' }} />
        <ellipse cx="78" cy="70" rx="16" ry="9" fill="#fff" opacity="0.35" transform="rotate(-30 78 70)" />
      </svg>
    </Tag>
  )
}
