import { getEpisodes as anivexaGetEpisodes, PROVIDER_PRIORITY } from '../lib/anivexa'
import { detectLatamAvailability as jimovDetectLatam } from '../lib/jimov.js'
import { getAnimeTitle as anilistGetTitle } from '../lib/anilist.js'

const TIMEOUT = 4000

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))])
}

export async function detectAudioOptions(anilistId, t) {
  const results = {
    japanese: { label: t('audio.japanese'), value: 'sub', flag: 'JP', available: false, error: null, provider: null },
    english: { label: t('audio.english'), value: 'dub', flag: 'US', available: false, error: null, provider: null },
    spanish: { label: t('audio.spanish'), value: 'latam', flag: 'MX', available: false, error: null, provider: null },
  }

  try {
    const data = await withTimeout(anivexaGetEpisodes(anilistId), TIMEOUT)
    if (data) {
      const subOk = PROVIDER_PRIORITY.some((p) => data[p]?.episodes?.sub?.length > 0)
      const dubOk = PROVIDER_PRIORITY.some((p) => data[p]?.episodes?.dub?.length > 0)
      if (subOk) Object.assign(results.japanese, { available: true, provider: 'Anivexa' })
      if (dubOk) Object.assign(results.english, { available: true, provider: 'Anivexa' })
    }
  } catch {
    /* ignore */
  }

  try {
    const title = await anilistGetTitle(anilistId)
    if (title) {
      const latamOk = await withTimeout(jimovDetectLatam(anilistId, title), TIMEOUT)
      if (latamOk) Object.assign(results.spanish, { available: true, provider: 'TioAnime' })
    }
  } catch {
    /* ignore */
  }

  // Fallback: mark LATAM as available if dub is available
  if (!results.spanish.available && results.english.available) {
    Object.assign(results.spanish, { available: true, provider: results.english.provider })
  }

  if (!results.japanese.available && !results.japanese.error) {
    results.japanese.error = t('audio.noJapanese')
  }
  if (!results.english.available && !results.english.error) {
    results.english.error = t('audio.noEnglish')
  }
  if (!results.spanish.available && !results.spanish.error) {
    results.spanish.error = t('audio.noSpanish')
  }

  return results
}
