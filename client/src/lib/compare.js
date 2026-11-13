import { tokenize, similarity } from './text.js'

/**
 * Compara lo esperado contra lo escuchado, token por token.
 * Devuelve cada token esperado marcado como ok, close (casi) o miss.
 */
export function compare(expected, heard, lang) {
  const E = tokenize(expected, lang)
  const H = tokenize(heard || '', lang)
  const n = E.length
  const m = H.length
  const cost = (i, j) => {
    const a = E[i].norm
    const b = H[j].norm
    if (a === b) return 0
    if (a.length >= 3 && similarity(a, b) >= 0.6) return 0.5
    return 1
  }
  // Distancia de edicion entre secuencias de tokens.
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = 1; i <= n; i++) dp[i][0] = i
  for (let j = 1; j <= m; j++) dp[0][j] = j * 0.6
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 0.6, dp[i - 1][j - 1] + cost(i - 1, j - 1))
    }
  }
  const status = new Array(n).fill('miss')
  let i = n
  let j = m
  while (i > 0 && j > 0) {
    const c = cost(i - 1, j - 1)
    if (Math.abs(dp[i][j] - (dp[i - 1][j - 1] + c)) < 1e-9) {
      status[i - 1] = c === 0 ? 'ok' : c === 0.5 ? 'close' : 'miss'
      i--
      j--
    } else if (Math.abs(dp[i][j] - (dp[i - 1][j] + 1)) < 1e-9) {
      status[i - 1] = 'miss'
      i--
    } else {
      j--
    }
  }
  const tokens = E.map((t, k) => ({ ...t, status: status[k] }))
  const ok = status.filter((s) => s === 'ok').length
  const close = status.filter((s) => s === 'close').length
  const score = n ? (ok + close * 0.5) / n : 0
  return { tokens, score, heard: heard || '' }
}

/**
 * Primer grupo de tokens que fallaron, con un token de contexto a cada lado.
 * Devuelve el texto original de esa parte, para repetir solo lo que fallo.
 */
export function failedSpan(result, original) {
  const t = result.tokens
  const first = t.findIndex((x) => x.status !== 'ok')
  if (first < 0) return null
  let last = first
  while (last + 1 < t.length && t[last + 1].status !== 'ok') last++
  const start = Math.max(0, first - 1)
  const end = Math.min(t.length - 1, last + 1)
  const from = t[start].index
  const to = t[end].index + t[end].text.length
  return {
    start,
    end,
    from,
    to,
    text: original.slice(from, to),
    whole: start === 0 && end === t.length - 1
  }
}

/** Bloque mas corto de la leccion que contiene la parte que fallo. */
export function chunkForError(span, sentence, chunks) {
  if (!span) return null
  let best = null
  for (const c of chunks) {
    const raw = c.text.replace(/[.!?。？！؟]+$/u, '')
    const at = sentence.indexOf(raw)
    if (at < 0) continue
    if (at <= span.from && at + raw.length >= span.to) {
      if (!best || raw.length < best.text.length) best = { ...c, text: raw }
    }
  }
  return best
}

export function scoreLabel(score) {
  if (score >= 0.9) return 'Muy bien'
  if (score >= 0.7) return 'Casi'
  if (score >= 0.4) return 'Vamos de nuevo'
  return 'Escucha otra vez'
}
