// Repaso espaciado basado en SM-2, simplificado.
const DAY = 24 * 60 * 60 * 1000

export function newCard(base, now = Date.now()) {
  return { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now + DAY, createdAt: now, updatedAt: now, ...base }
}

/** Convierte un puntaje 0..1 en una nota 0..5. */
export function gradeFromScore(score) {
  if (score >= 0.95) return 5
  if (score >= 0.8) return 4
  if (score >= 0.6) return 3
  if (score >= 0.4) return 2
  return 1
}

export function review(card, grade, now = Date.now()) {
  const c = { ...card }
  if (grade < 3) {
    c.reps = 0
    c.lapses = (c.lapses || 0) + 1
    c.interval = 1
  } else {
    c.reps += 1
    if (c.reps === 1) c.interval = 1
    else if (c.reps === 2) c.interval = 3
    else c.interval = Math.round(c.interval * c.ease)
  }
  c.ease = Math.max(1.3, c.ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)))
  c.due = now + c.interval * DAY
  c.updatedAt = now
  return c
}

export function isDue(card, now = Date.now()) {
  return card.due <= now
}

export function formatDue(ts, now = Date.now()) {
  const days = Math.round((ts - now) / DAY)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'mañana'
  return `en ${days} días`
}
