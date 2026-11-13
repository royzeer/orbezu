// Ilustraciones originales de cada escena, geometricas y teñidas con el
// color del idioma.

export function mix(hex, other, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const a = p(hex)
  const b = p(other)
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

function Bakery({ c }) {
  const sky = mix(c, '#ffffff', 0.82)
  const deep = mix(c, '#120f2a', 0.55)
  const wall = mix(c, '#ffffff', 0.93)
  const scallops = Array.from({ length: 10 }, (_, i) => i)
  return (
    <>
      <rect width="320" height="220" fill={sky} />
      <circle cx="262" cy="52" r="30" fill={mix(c, '#ffd27a', 0.6)} opacity="0.9" />
      <circle cx="262" cy="52" r="44" fill="none" stroke={mix(c, '#ffd27a', 0.6)} strokeWidth="2" opacity="0.35" />
      <rect x="0" y="120" width="70" height="100" fill={mix(c, '#ffffff', 0.6)} />
      <rect x="250" y="104" width="70" height="116" fill={mix(c, '#ffffff', 0.55)} />
      <rect x="60" y="62" width="200" height="158" rx="6" fill={wall} />
      <rect x="60" y="62" width="200" height="16" rx="4" fill={deep} />
      <path d={`M60 92 H260 V116 ${scallops.map(() => 'a10 10 0 0 1 -20 0').join(' ')} Z`} fill={c} />
      {scallops.map((x, i) => (
        <rect key={i} x={60 + i * 20} y="92" width="10" height="24" fill="#ffffff" opacity="0.28" />
      ))}
      <rect x="78" y="132" width="104" height="58" rx="8" fill={mix(c, '#0f1a3a', 0.35)} />
      <rect x="84" y="138" width="92" height="46" rx="5" fill={mix(c, '#ffffff', 0.7)} />
      <ellipse cx="108" cy="170" rx="18" ry="8" fill="#E2A65B" />
      <ellipse cx="146" cy="170" rx="20" ry="9" fill="#D08C43" />
      <ellipse cx="128" cy="160" rx="14" ry="7" fill="#EDBE7A" />
      <path d="M96 168 l6 -4 M104 168 l6 -4 M112 168 l6 -4" stroke="#B8732F" strokeWidth="2" strokeLinecap="round" />
      <rect x="196" y="128" width="46" height="92" rx="23" fill={deep} />
      <circle cx="232" cy="176" r="3" fill={mix(c, '#ffd27a', 0.5)} />
      <rect x="0" y="210" width="320" height="10" fill={deep} opacity="0.85" />
    </>
  )
}

function Station({ c }) {
  const sky = mix(c, '#ffffff', 0.8)
  const deep = mix(c, '#120f2a', 0.55)
  const mid = mix(c, '#ffffff', 0.45)
  return (
    <>
      <rect width="320" height="220" fill={sky} />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${i * 80} 120 V60 a40 40 0 0 1 80 0 V120`} fill="none" stroke={mix(c, '#ffffff', 0.55)} strokeWidth="10" />
      ))}
      <rect x="0" y="0" width="320" height="22" fill={deep} />
      <circle cx="160" cy="52" r="20" fill="#fff" stroke={deep} strokeWidth="4" />
      <path d="M160 52 V40 M160 52 L169 57" stroke={deep} strokeWidth="3" strokeLinecap="round" />
      <path d="M0 220 L130 120 H190 L320 220 Z" fill={mix(c, '#ffffff', 0.68)} />
      <path d="M96 220 L148 120 M224 220 L172 120" stroke={deep} strokeWidth="4" />
      {[0, 1, 2, 3, 4].map((i) => {
        const y = 128 + i * i * 4.6 + i * 6
        const w = 14 + i * 13
        return <rect key={i} x={160 - w} y={y} width={w * 2} height={2 + i * 0.8} fill={deep} opacity="0.5" />
      })}
      <rect x="128" y="78" width="64" height="58" rx="18" fill={c} />
      <rect x="138" y="88" width="44" height="22" rx="6" fill={mix(c, '#ffffff', 0.85)} />
      <circle cx="142" cy="124" r="4" fill="#FFE29A" />
      <circle cx="178" cy="124" r="4" fill="#FFE29A" />
      <rect x="150" y="70" width="20" height="8" rx="3" fill={deep} />
      <rect x="0" y="120" width="96" height="100" fill={mid} opacity="0.55" />
      <rect x="230" y="120" width="90" height="100" fill={mid} opacity="0.55" />
      <rect x="22" y="150" width="34" height="44" rx="6" fill={deep} />
      <rect x="30" y="144" width="18" height="8" rx="3" fill="none" stroke={deep} strokeWidth="3" />
      <rect x="252" y="140" width="46" height="24" rx="4" fill={deep} />
      <rect x="256" y="144" width="38" height="6" rx="2" fill={mix(c, '#ffd27a', 0.5)} />
      <rect x="256" y="153" width="26" height="6" rx="2" fill={mix(c, '#ffffff', 0.6)} />
    </>
  )
}

const SCENES = { bakery: Bakery, station: Station }

export default function Cover({ scene, color, className = '', title }) {
  const S = SCENES[scene] || Bakery
  return (
    <svg className={`cover ${className}`} viewBox="0 0 320 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label={title || 'Ilustración de la escena'}>
      <S c={color} />
    </svg>
  )
}
