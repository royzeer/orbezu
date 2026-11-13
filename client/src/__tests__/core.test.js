import { describe, it, expect } from 'vitest'
import { compare, failedSpan, chunkForError } from '../lib/compare.js'
import { review, newCard, gradeFromScore } from '../lib/srs.js'
import { LESSONS } from '../data/lessons.js'
import { mergeProgress } from '../lib/store.js'

describe('compare', () => {
  it('marca todo bien cuando coincide', () => {
    const r = compare("Tomorrow morning I'm going to buy bread.", "tomorrow morning I'm going to buy bread", 'en')
    expect(r.score).toBe(1)
  })
  it('detecta la palabra que falta', () => {
    const s = "Tomorrow morning I'm going to buy bread at the bakery on the corner."
    const r = compare(s, "tomorrow morning I'm going to buy bread at the on the corner", 'en')
    expect(r.tokens.find((t) => t.text === 'bakery').status).toBe('miss')
    const span = failedSpan(r, s)
    expect(span.text).toBe('the bakery on')
  })
  it('acepta cifras en lugar de palabras', () => {
    expect(compare('They open at seven.', 'they open at 7', 'en').score).toBe(1)
  })
  it('compara chino caracter por caracter', () => {
    const r = compare('它早上7点开门。', '它早上七点开门', 'zh')
    expect(r.score).toBe(1)
  })
  it('ignora los diacriticos del arabe', () => {
    expect(compare('شكرًا جزيلًا!', 'شكرا جزيلا', 'ar').score).toBe(1)
  })
  it('elige el bloque mas corto que contiene el error', () => {
    const lesson = LESSONS.find((l) => l.id === 'en-bakery')
    const r = compare(lesson.sentence.text, "tomorrow morning I'm going to buy bread at the bakery on the", 'en')
    const span = failedSpan(r, lesson.sentence.text)
    expect(chunkForError(span, lesson.sentence.text, lesson.chunks).text).toBe('on the corner')
  })
})

describe('contenido', () => {
  it('hay 2 lecciones por cada uno de los 11 idiomas', () => {
    expect(LESSONS.length).toBe(22)
  })
  it('cada bloque aparece dentro de la frase completa y el ultimo es la frase', () => {
    for (const l of LESSONS) {
      const last = l.chunks[l.chunks.length - 1].text
      expect(last, l.id).toBe(l.sentence.text)
      for (const c of l.chunks) {
        const raw = c.text.replace(/[.!?。？！؟]+$/u, '')
        expect(l.sentence.text.includes(raw), `${l.id}: ${c.text}`).toBe(true)
      }
      for (let i = 1; i < l.chunks.length; i++) {
        expect(l.chunks[i].text.length, l.id).toBeGreaterThan(l.chunks[i - 1].text.length)
      }
    }
  })
  it('los idiomas con romanizacion la tienen en todas las lineas', () => {
    for (const l of LESSONS.filter((x) => ['zh', 'ja', 'ko', 'ar', 'ru'].includes(x.lang))) {
      for (const s of l.story) expect(s.rom, s.id).not.toBe('')
      for (const c of l.chunks) expect(c.rom, l.id).not.toBe('')
    }
  })
  it('cada frase se compara perfecto contra si misma', () => {
    for (const l of LESSONS) expect(compare(l.sentence.text, l.sentence.text, l.lang).score, l.id).toBe(1)
  })
})

describe('repaso espaciado', () => {
  it('aumenta el intervalo cuando sale bien y lo reinicia cuando falla', () => {
    let c = newCard({ id: 'x' }, 0)
    c = review(c, 5, 0)
    expect(c.interval).toBe(1)
    c = review(c, 5, 0)
    expect(c.interval).toBe(3)
    c = review(c, 4, 0)
    expect(c.interval).toBeGreaterThan(3)
    c = review(c, 1, 0)
    expect(c.interval).toBe(1)
    expect(gradeFromScore(0.97)).toBe(5)
  })
  it('une progreso local y de la nube sin perder datos', () => {
    const a = { lessons: { x: { bestScore: 0.5 } }, reviews: { r: { updatedAt: 1 } }, stats: { xp: 10 }, updatedAt: 1 }
    const b = { lessons: { x: { bestScore: 0.9 }, y: { bestScore: 0.2 } }, reviews: { r: { updatedAt: 2, v: 2 } }, stats: { xp: 5 }, updatedAt: 2 }
    const m = mergeProgress(a, b)
    expect(m.lessons.x.bestScore).toBe(0.9)
    expect(m.lessons.y).toBeTruthy()
    expect(m.reviews.r.v).toBe(2)
    expect(m.stats.xp).toBe(10)
  })
})
