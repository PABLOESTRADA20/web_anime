import { novelbinProvider } from './novelbin.js'
import { readnovelfullProvider } from './readnovelfull.js'
import { novelbuddyProvider } from './novelbuddy.js'

const providers = [
  { name: 'novelbin', provider: novelbinProvider },
  { name: 'readnovelfull', provider: readnovelfullProvider },
  { name: 'novelbuddy', provider: novelbuddyProvider },
]

const nameMap = Object.fromEntries(providers.map((p) => [p.name, p.provider]))

export async function tryProviders(action, params, context) {
  const errors = []

  if (params.source) {
    const provider = nameMap[params.source]
    if (!provider) throw new Error(`Fuente desconocida: ${params.source}`)
    if (typeof provider[action] !== 'function') throw new Error(`Acción no soportada por ${params.source}`)
    try {
      const result = await provider[action](params, context)
      result._source = params.source
      return result
    } catch (e) {
      throw new Error(`${params.source}: ${e.message}`, { cause: e })
    }
  }

  for (const { name, provider } of providers) {
    if (typeof provider[action] !== 'function') continue
    try {
      const result = await provider[action](params, context)
      if (Array.isArray(result)) {
        result._source = name
        return result
      }
      if (result && typeof result === 'object') {
        result._source = name
        return result
      }
      return result
    } catch (e) {
      errors.push({ provider: name, error: e.message })
    }
  }

  if (errors.length === 1) {
    throw new Error(errors[0].error)
  }
  throw new Error(`No disponible (${errors.length} fuentes): ${errors.map((e) => `${e.provider}: ${e.error}`).join('; ')}`)
}

export function getProviderNames() {
  return providers.map((p) => p.name)
}
