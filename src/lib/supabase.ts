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

export const supabase: SupabaseClient | null = isValid
  ? createClient(supabaseUrl, supabaseKey)
  : null

export function isSupabaseReady(): boolean {
  return supabase !== null
}
