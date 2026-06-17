import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function isValidUrl(str) {
  try {
    const url = new URL(str)
    return url.protocol === 'https:' && url.hostname !== 'your-project.supabase.co'
  } catch {
    return false
  }
}

const isValid = supabaseUrl && supabaseKey && isValidUrl(supabaseUrl)

export const supabase = isValid
  ? createClient(supabaseUrl, supabaseKey)
  : null

export function isSupabaseReady() {
  return supabase !== null
}
