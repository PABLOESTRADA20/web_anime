import { getEpisodes as anivexaGetEpisodes, PROVIDER_PRIORITY } from '../lib/anivexa'
import { getEpisodes as miruroGetEpisodes } from '../lib/miruro'
import { getSlug } from '../lib/animeflv'
import { getAnimeEpisodes as veranimeGetEpisodes } from '../lib/veranime'

const TIMEOUT = 6000

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))])
}

export async function detectAudioOptions(anilistId, epNum, title) {
  const results = {
    japanese: { label: 'Japonés (Sub)', value: 'sub', flag: 'JP', available: false, error: null, provider: null },
    english: { label: 'Inglés (Dub)', value: 'dub', flag: 'US', available: false, error: null, provider: null },
    spanish: { label: 'Español Latino', value: 'latam', flag: 'MX', available: false, error: null, provider: null },
  }

  const anivexaPromise = withTimeout(anivexaGetEpisodes(anilistId), TIMEOUT)
    .then((data) => {
      if (!data) return
      const subOk = PROVIDER_PRIORITY.some((p) => data[p]?.episodes?.sub?.length > 0)
      const dubOk = PROVIDER_PRIORITY.some((p) => data[p]?.episodes?.dub?.length > 0)
      if (subOk) Object.assign(results.japanese, { available: true, provider: 'Anivexa' })
      if (dubOk) Object.assign(results.english, { available: true, provider: 'Anivexa' })
    })
    .catch(() => {})

  const miruroPromise = withTimeout(miruroGetEpisodes(anilistId, 'kiwi'), TIMEOUT)
    .then((data) => {
      if (!data) return
      if (data.sub?.length > 0 && !results.japanese.available) {
        Object.assign(results.japanese, { available: true, provider: 'Miruro' })
      }
      if (data.dub?.length > 0 && !results.english.available) {
        Object.assign(results.english, { available: true, provider: 'Miruro' })
      }
    })
    .catch(() => {})

  const latamPromise = (async () => {
    if (!title) {
      results.spanish.error = 'Sin título para buscar'
      return
    }
    try {
      const slug = getSlug(title)
      if (!slug) {
        results.spanish.error = 'No disponible en AnimeFLV'
        return
      }
      results.spanish.provider = 'AnimeFLV'
      const data = await withTimeout(veranimeGetEpisodes(slug), TIMEOUT)
      if (data?.providerEpisodes?.length > 0) {
        results.spanish.available = true
      } else {
        results.spanish.available = true
      }
    } catch {
      if (getSlug(title)) results.spanish.available = true
      else results.spanish.error = 'LATAM no disponible'
    }
  })()

  await Promise.allSettled([anivexaPromise, miruroPromise, latamPromise])

  if (!results.japanese.available && !results.japanese.error) {
    results.japanese.error = 'No hay fuentes en japonés'
  }
  if (!results.english.available && !results.english.error) {
    results.english.error = 'No hay fuentes en inglés'
  }
  if (!results.spanish.available && !results.spanish.error) {
    results.spanish.error = 'No hay fuentes en español'
  }

  return results
}
