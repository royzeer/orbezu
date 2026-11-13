// Modo libre: conversacion con Gemini usando la API key de cada persona.
// La key se guarda solo en este navegador y la peticion va directo a Google.

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

export function buildSystemPrompt({ language, lesson, withRom }) {
  const target = lesson ? lesson.sentence.text : null
  return [
    `Eres un compañero de conversación amable que habla ${language.englishName} (${language.bcp}).`,
    'La persona aprende el idioma hablando en voz alta. Su lengua materna es el español.',
    lesson
      ? `Escena: ${lesson.titleEs}. Contexto: ${lesson.story.map((l) => l.text).join(' ')}`
      : 'Escena: una conversación cotidiana y tranquila.',
    target ? `Frase objetivo que la persona practica: "${target}". Crea situaciones donde tenga que usarla.` : '',
    'Responde siempre en el idioma meta, con frases cortas (una o dos) y nivel sencillo. Haz una pregunta para seguir.',
    'No expliques gramática salvo que la persona lo pida.',
    'Devuelve SOLO JSON con estas claves:',
    '{"reply": texto en el idioma meta,',
    withRom ? ' "romanization": romanización de reply,' : ' "romanization": "",',
    ' "translation_es": traducción de reply al español,',
    ' "feedback_es": corrección breve y amable de lo último que dijo la persona en español, o "" si estuvo bien,',
    ' "used_target": true si la persona usó la frase objetivo, si no false}'
  ]
    .filter(Boolean)
    .join('\n')
}

export async function geminiTurn({ apiKey, model, system, history }) {
  const res = await fetch(`${ENDPOINT}/${encodeURIComponent(model || 'gemini-flash-latest')}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: history.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
      generationConfig: { responseMimeType: 'application/json', temperature: 0.8 }
    })
  })
  if (!res.ok) {
    let msg = `Error ${res.status}`
    try {
      const j = await res.json()
      msg = j.error?.message || msg
    } catch {
      /* sin cuerpo */
    }
    throw new Error(msg)
  }
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
  try {
    return JSON.parse(text)
  } catch {
    return { reply: text, romanization: '', translation_es: '', feedback_es: '', used_target: false }
  }
}
