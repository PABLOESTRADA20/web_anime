export function subtitleLangLabel(sub) {
  const label = (sub.label || sub.language || '').toLowerCase()
  if (label.includes('spanish') || label === 'es' || label === 'spa' || label.includes('español') || label.includes('castellano') || label.includes('latino') || label.includes('mexican')) return 'Español'
  if (label.includes('english') || label === 'en' || label === 'inglés') return 'English'
  if (label.includes('japanese') || label === 'ja' || label.includes('japonés') || label.includes('日本')) return '日本語'
  if (label.includes('french') || label === 'fr' || label.includes('français')) return 'Français'
  if (label.includes('portuguese') || label === 'pt' || label.includes('português')) return 'Português'
  if (label.includes('arabic') || label === 'ar') return 'العربية'
  if (label.includes('korean') || label === 'ko') return '한국어'
  if (label.includes('chinese') || label === 'zh') return '中文'
  return sub.label || sub.language || `Track ${sub.index || 0}`
}

export function subtitleSrcLang(sub) {
  if (sub.language) return sub.language
  const label = (sub.label || '').toLowerCase()
  if (label.includes('spanish') || label.includes('español') || label.includes('castellano') || label.includes('latino') || label === 'spa') return 'es'
  if (label.includes('english') || label.includes('inglés')) return 'en'
  if (label.includes('japanese') || label.includes('japonés')) return 'ja'
  if (label.includes('french')) return 'fr'
  if (label.includes('portuguese')) return 'pt'
  if (label.includes('arabic')) return 'ar'
  if (label.includes('korean')) return 'ko'
  if (label.includes('chinese')) return 'zh'
  return 'en'
}

export function isCloudflareBlock(text) {
  return text.includes('cf-browser-verification') || text.includes('__cf_chl_') || text.includes('Just a moment')
}

export function isSpanishSub(sub) {
  const language = (sub.language || '').toLowerCase()
  const label = (sub.label || '').toLowerCase()
  return language === 'es' || language === 'spa' ||
    label.includes('spanish') || label.includes('español') ||
    label.includes('castellano') || label.includes('latino') ||
    label === 'spa'
}
