// Cada idioma tiene su color propio. `rom` indica si se muestra romanizacion.
export const LANGUAGES = [
  { code: 'en', bcp: 'en-US', name: 'Inglés', native: 'English', englishName: 'English', color: '#3B5BDB', rom: false },
  { code: 'es', bcp: 'es-ES', name: 'Español', native: 'Español', englishName: 'Spanish', color: '#E8890C', rom: false },
  { code: 'fr', bcp: 'fr-FR', name: 'Francés', native: 'Français', englishName: 'French', color: '#0E9F9A', rom: false },
  { code: 'zh', bcp: 'zh-CN', name: 'Mandarín', native: '中文', englishName: 'Mandarin Chinese', color: '#D9363E', rom: true, romName: 'pinyin' },
  { code: 'pt', bcp: 'pt-BR', name: 'Portugués', native: 'Português', englishName: 'Brazilian Portuguese', color: '#1F9D63', rom: false },
  { code: 'ar', bcp: 'ar-SA', name: 'Árabe', native: 'العربية', englishName: 'Modern Standard Arabic', color: '#A87B00', rom: true, romName: 'transliteración', rtl: true },
  { code: 'de', bcp: 'de-DE', name: 'Alemán', native: 'Deutsch', englishName: 'German', color: '#6C47E0', rom: false },
  { code: 'ja', bcp: 'ja-JP', name: 'Japonés', native: '日本語', englishName: 'Japanese', color: '#D23F79', rom: true, romName: 'rōmaji' },
  { code: 'ko', bcp: 'ko-KR', name: 'Coreano', native: '한국어', englishName: 'Korean', color: '#1693D0', rom: true, romName: 'romanización revisada' },
  { code: 'it', bcp: 'it-IT', name: 'Italiano', native: 'Italiano', englishName: 'Italian', color: '#C0501C', rom: false },
  { code: 'ru', bcp: 'ru-RU', name: 'Ruso', native: 'Русский', englishName: 'Russian', color: '#2E4A8A', rom: true, romName: 'transliteración' }
]

export const LANG = Object.fromEntries(LANGUAGES.map((l) => [l.code, l]))
