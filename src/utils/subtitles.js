function normalizeLabel(sub) {
  return (sub.label || sub.language || sub.srclang || sub.name || '').toLowerCase()
}

function labelIncludes(sub, patterns) {
  const text = normalizeLabel(sub)
  return patterns.some(p => {
    if (p.length <= 2) return text === p
    return text.includes(p)
  })
}

const ES_PATTERNS = ['spanish', 'es', 'spa', 'español', 'espanol', 'castellano', 'latino', 'mexican', 'subtitulos', 'sub-es']
const EN_PATTERNS = ['english', 'en', 'inglés', 'eng']
const JA_PATTERNS = ['japanese', 'ja', 'japonés', '日本', '日本語']
const FR_PATTERNS = ['french', 'fr', 'français']
const PT_PATTERNS = ['portuguese', 'pt', 'português', 'brazilian']
const AR_PATTERNS = ['arabic', 'ar']
const KO_PATTERNS = ['korean', 'ko']
const ZH_PATTERNS = ['chinese', 'zh', '中文']

export function subtitleLangLabel(sub) {
  if (labelIncludes(sub, ES_PATTERNS)) return 'Español'
  if (labelIncludes(sub, EN_PATTERNS)) return 'English'
  if (labelIncludes(sub, JA_PATTERNS)) return '日本語'
  if (labelIncludes(sub, FR_PATTERNS)) return 'Français'
  if (labelIncludes(sub, PT_PATTERNS)) return 'Português'
  if (labelIncludes(sub, AR_PATTERNS)) return 'العربية'
  if (labelIncludes(sub, KO_PATTERNS)) return '한국어'
  if (labelIncludes(sub, ZH_PATTERNS)) return '中文'
  return sub.label || sub.language || `Track ${sub.index || 0}`
}

export function subtitleSrcLang(sub) {
  if (sub.language) return sub.language
  if (labelIncludes(sub, ES_PATTERNS)) return 'es'
  if (labelIncludes(sub, EN_PATTERNS)) return 'en'
  if (labelIncludes(sub, JA_PATTERNS)) return 'ja'
  if (labelIncludes(sub, FR_PATTERNS)) return 'fr'
  if (labelIncludes(sub, PT_PATTERNS)) return 'pt'
  if (labelIncludes(sub, AR_PATTERNS)) return 'ar'
  if (labelIncludes(sub, KO_PATTERNS)) return 'ko'
  if (labelIncludes(sub, ZH_PATTERNS)) return 'zh'
  return 'en'
}

export function isCloudflareBlock(text) {
  return text.includes('cf-browser-verification') ||
    text.includes('__cf_chl_') ||
    text.includes('Just a moment') ||
    text.includes('Attention Required') ||
    text.includes('Checking your browser') ||
    text.includes('cdn-cgi/challenge-platform')
}

export function isLikelySubtitle(text) {
  const trimmed = text.trim()
  return trimmed.startsWith('WEBVTT') || /^\d{2}:\d{2}/m.test(trimmed)
}

export function isSpanishSub(sub) {
  const language = (sub.language || sub.srclang || '').toLowerCase()
  const file = (sub.file || sub.url || sub.src || '').toLowerCase()

  if (language === 'es' || language === 'spa') return true
  if (labelIncludes(sub, ES_PATTERNS)) return true

  const filePatterns = ['es.', 'spanish.', 'espanol.', 'español.', 'latino.', 'sub.es', '_es.']
  if (filePatterns.some(p => file.includes(p))) return true

  return false
}

export function getSubtitleInfo(sub) {
  return {
    label: subtitleLangLabel(sub),
    srcLang: subtitleSrcLang(sub),
    isSpanish: isSpanishSub(sub),
    file: sub.file || sub.url || sub.src || '',
  }
}
