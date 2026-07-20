import { providerManager } from '../providers/manager'

const TIMEOUT = 10000

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))])
}

export async function detectAudioOptions(anilistId, t) {
  providerManager.init()

  try {
    const results = await withTimeout(providerManager.detectAudio(anilistId, t), TIMEOUT)
    return results
  } catch {
    return {
      japanese: { label: t('audio.japanese'), value: 'sub', flag: 'JP', available: false, error: t('audio.noJapanese'), provider: null },
      english: { label: t('audio.english'), value: 'dub', flag: 'US', available: false, error: t('audio.noEnglish'), provider: null },
      spanish: { label: t('audio.spanish'), value: 'latam', flag: 'MX', available: false, error: t('audio.noSpanish'), provider: null },
    }
  }
}
