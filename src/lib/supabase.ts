import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str)
    return url.protocol === 'https:' && url.hostname !== 'your-project.supabase.co'
  } catch {
    return false
  }
}

const isValid = !!supabaseUrl && !!supabaseKey && isValidUrl(supabaseUrl)

function createFetchWithRetry(maxRetries = 3): typeof fetch {
  return async (input, init) => {
    let lastError: Error | null = null
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(input, init)
        return res
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
        }
      }
    }
    throw lastError
  }
}

export const supabase: SupabaseClient | null = isValid
  ? createClient(supabaseUrl, supabaseKey, { fetch: createFetchWithRetry() } as any)
  : null

export function isSupabaseReady(): boolean {
  return supabase !== null
}
