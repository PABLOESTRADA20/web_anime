import { supabase } from './supabase'

export async function getToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return null
  if (session.expires_at && Date.now() >= (session.expires_at - 30) * 1000) {
    const {
      data: { session: refreshed },
    } = await supabase.auth.refreshSession()
    return refreshed?.access_token || null
  }
  return session.access_token
}
