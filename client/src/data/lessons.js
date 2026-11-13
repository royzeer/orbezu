import { SCENES, SCENE_ORDER } from './scenes.js'
import { LANGUAGES, LANG } from './languages.js'
import en from './content/en.js'
import es from './content/es.js'
import fr from './content/fr.js'
import zh from './content/zh.js'
import pt from './content/pt.js'
import ar from './content/ar.js'
import de from './content/de.js'
import ja from './content/ja.js'
import ko from './content/ko.js'
import it from './content/it.js'
import ru from './content/ru.js'

const CONTENT = { en, es, fr, zh, pt, ar, de, ja, ko, it, ru }

const line = (data, key, trTable, id) => {
  const [text, rom] = data[key]
  return { id, key, text, rom: rom || '', tr: trTable[key] || '' }
}

function build(langCode, sceneId) {
  const scene = SCENES[sceneId]
  const data = CONTENT[langCode][sceneId]
  // Traduccion de ayuda: al español, o al inglés si se aprende español.
  const trLang = langCode === 'es' ? 'en' : 'es'
  const tr = scene[trLang]
  const id = `${langCode}-${sceneId}`
  const story = scene.story.map((k, i) => line(data, k, tr, `${id}-s${i}`))
  const sentence = line(data, scene.target, tr, `${id}-T`)
  const chunks = data.chunks.map(([text, rom]) => ({ text, rom: rom || '' }))
  const nodes = {}
  for (const [nid, n] of Object.entries(scene.dialog.nodes)) {
    nodes[nid] = {
      id: nid,
      npc: line(data, n.npc, tr, `${id}-${nid}`),
      options: n.options.map((o) => ({ ...line(data, o.line, tr, `${id}-${nid}-${o.line}`), next: o.next, isTarget: o.line === scene.target }))
    }
  }
  return {
    id,
    lang: langCode,
    scene: sceneId,
    title: data.title[0],
    titleRom: data.title[1] || '',
    titleEs: scene.es.title,
    trLang,
    story,
    targetIndex: scene.story.indexOf(scene.target),
    sentence,
    chunks,
    dialog: { start: scene.dialog.start, nodes }
  }
}

export const LESSONS = []
for (const l of LANGUAGES) for (const s of SCENE_ORDER) LESSONS.push(build(l.code, s))

export const LESSON = Object.fromEntries(LESSONS.map((l) => [l.id, l]))

export const lessonsFor = (code) => LESSONS.filter((l) => l.lang === code)

export { LANG, LANGUAGES }
