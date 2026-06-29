export const SUBTITLE_PREFS_KEY = 'anime_subtitle_prefs'
export const GLOBAL_SUBTITLE_PREFS_KEY = 'global_subtitle_prefs'

export function saveSubtitlePreference(episodeId, subtitleData) {
  try {
    const prefs = JSON.parse(localStorage.getItem(SUBTITLE_PREFS_KEY) || '{}')
    prefs[episodeId] = {
      subtitleIndex: subtitleData.index,
      fontSize: subtitleData.fontSize,
      offset: subtitleData.offset,
      position: subtitleData.position,
      timestamp: Date.now(),
    }
    localStorage.setItem(SUBTITLE_PREFS_KEY, JSON.stringify(prefs))
  } catch (e) {
    console.error('Error saving subtitle preference:', e)
  }
}

export function getSubtitlePreference(episodeId) {
  try {
    const prefs = JSON.parse(localStorage.getItem(SUBTITLE_PREFS_KEY) || '{}')
    return prefs[episodeId] || null
  } catch {
    return null
  }
}

export function saveGlobalSubtitlePrefs(prefs) {
  try {
    localStorage.setItem(GLOBAL_SUBTITLE_PREFS_KEY, JSON.stringify(prefs))
  } catch (e) {
    console.error('Error saving global subtitle prefs:', e)
  }
}

export function getGlobalSubtitlePrefs() {
  try {
    return JSON.parse(localStorage.getItem(GLOBAL_SUBTITLE_PREFS_KEY) || '{}')
  } catch {
    return {}
  }
}

const DEFAULTS = {
  fontSize: 'lg',
  offset: 0,
  position: 'bottom',
  enableTransitions: true,
}

export function getSubtitlePrefs() {
  return { ...DEFAULTS, ...getGlobalSubtitlePrefs() }
}

export function clearOldPreferences(olderThanDays = 30) {
  try {
    const prefs = JSON.parse(localStorage.getItem(SUBTITLE_PREFS_KEY) || '{}')
    const now = Date.now()
    const cutoff = now - olderThanDays * 24 * 60 * 60 * 1000
    Object.keys(prefs).forEach((key) => {
      if (prefs[key].timestamp < cutoff) {
        delete prefs[key]
      }
    })
    localStorage.setItem(SUBTITLE_PREFS_KEY, JSON.stringify(prefs))
  } catch (e) {
    console.error('Error clearing old preferences:', e)
  }
}
