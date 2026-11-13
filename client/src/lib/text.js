// Normalizacion y division en tokens para comparar lo que dijo la persona
// contra la frase esperada.

const CHAR_LANGS = new Set(['zh', 'ja'])

// Numeros que aparecen en las lecciones. El reconocimiento de voz a veces
// devuelve cifras y a veces palabras, asi que ambos lados se llevan a cifras.
const NUMBER_WORDS = {
  en: { three: '3', seven: '7', ten: '10' },
  es: { tres: '3', siete: '7', diez: '10' },
  fr: { trois: '3', sept: '7', dix: '10' },
  pt: { 'três': '3', tres: '3', sete: '7', dez: '10' },
  de: { drei: '3', sieben: '7', zehn: '10' },
  it: { tre: '3', sette: '7', dieci: '10' },
  ru: { 'три': '3', 'семь': '7', 'десять': '10' },
  ar: { 'ثلاثه': '3', 'ثلاث': '3', 'سبعه': '7', 'عشر': '10', 'عشره': '10' }
}

const CJK_NUMBERS = { '三': '3', '七': '7', '十': '10' }

export function isCharLang(lang) {
  return CHAR_LANGS.has(lang)
}

export function normalizeToken(token, lang) {
  let t = token.normalize('NFKC').toLowerCase()
  t = t.replace(/[’‘`]/g, "'")
  if (lang === 'ar') {
    t = t
      .replace(/[ً-ْٰـ]/g, '')
      .replace(/[آأإ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
  }
  if (lang === 'ru') t = t.replace(/ё/g, 'е')
  if (CHAR_LANGS.has(lang) && CJK_NUMBERS[t]) return CJK_NUMBERS[t]
  const map = NUMBER_WORDS[lang]
  if (map && map[t]) return map[t]
  return t.replace(/[^\p{L}\p{N}']/gu, '').replace(/^'+|'+$/g, '')
}

let segmenterCache = {}
function getSegmenter(lang) {
  if (typeof Intl === 'undefined' || !Intl.Segmenter) return null
  if (!segmenterCache[lang]) segmenterCache[lang] = new Intl.Segmenter(lang, { granularity: 'word' })
  return segmenterCache[lang]
}

/**
 * Divide un texto en tokens con su posicion original.
 * Para chino y japones cada caracter es un token (asi no dependemos
 * de como el reconocimiento elige separar palabras).
 */
export function tokenize(text, lang) {
  const out = []
  if (CHAR_LANGS.has(lang)) {
    // Agrupa cifras seguidas ("10") en un solo token.
    const re = /[0-9０-９]+|[\p{L}\p{N}]/gu
    let m
    while ((m = re.exec(text))) {
      const norm = normalizeToken(m[0], lang)
      if (norm) out.push({ text: m[0], norm, index: m.index })
    }
    return out
  }
  const seg = getSegmenter(lang)
  if (seg) {
    for (const s of seg.segment(text)) {
      if (!s.isWordLike) continue
      const norm = normalizeToken(s.segment, lang)
      if (norm) out.push({ text: s.segment, norm, index: s.index })
    }
    return out
  }
  const re = /[^\s.,;:!?¡¿"()«»،؟。、！？]+/gu
  let m
  while ((m = re.exec(text))) {
    const norm = normalizeToken(m[0], lang)
    if (norm) out.push({ text: m[0], norm, index: m.index })
  }
  return out
}

export function levenshtein(a, b) {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[n]
}

export function similarity(a, b) {
  const max = Math.max(a.length, b.length)
  if (!max) return 1
  return 1 - levenshtein(a, b) / max
}
