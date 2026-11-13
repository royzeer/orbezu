import { updateProgress } from './store.js'
import { newCard, review, gradeFromScore } from './srs.js'
import { chunkForError } from './compare.js'

function hash(s) {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.codePointAt(0)) | 0
  return (h >>> 0).toString(36)
}

/** Programa (o reprograma) la frase principal de una leccion. */
export function scheduleSentence(lesson, score) {
  const id = lesson.sentence.id
  let card
  updateProgress((p) => {
    const prev = p.reviews[id]
    const base = { id, kind: 'sentence', lang: lesson.lang, lessonId: lesson.id, text: lesson.sentence.text, rom: lesson.sentence.rom, tr: lesson.sentence.tr }
    card = review(prev ? { ...prev, ...base } : newCard(base), gradeFromScore(score))
    return { ...p, reviews: { ...p.reviews, [id]: card } }
  })
  return card
}

/** Convierte un error en una frase de repaso (el bloque mas corto que lo contiene). */
export function addErrorReview(lesson, span) {
  const chunk = chunkForError(span, lesson.sentence.text, lesson.chunks)
  const full = lesson.sentence.text.replace(/[.!?。？！؟]+$/u, '')
  if (!chunk || chunk.text === full) return null
  const id = `${lesson.id}-f-${hash(chunk.text)}`
  const base = { id, kind: 'fragment', lang: lesson.lang, lessonId: lesson.id, text: chunk.text, rom: chunk.rom, tr: '' }
  let created = null
  updateProgress((p) => {
    if (p.reviews[id]) return p
    created = newCard(base)
    return { ...p, reviews: { ...p.reviews, [id]: created } }
  })
  return created || base
}

export function gradeCard(card, score) {
  let next
  updateProgress((p) => {
    next = review(p.reviews[card.id] || card, gradeFromScore(score))
    return { ...p, reviews: { ...p.reviews, [card.id]: next } }
  })
  return next
}

export function saveLesson(lessonId, patch) {
  updateProgress((p) => {
    const prev = p.lessons[lessonId] || {}
    const next = { ...prev, ...patch }
    if (patch.bestScore != null) next.bestScore = Math.max(prev.bestScore || 0, patch.bestScore)
    if (patch.step != null) next.step = Math.max(prev.step || 0, patch.step)
    return { ...p, lessons: { ...p.lessons, [lessonId]: next } }
  })
}
