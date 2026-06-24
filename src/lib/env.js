import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_ANIVEXA_URL: z.string().url().optional(),
  VITE_CONSUMET_URL: z.string().url().optional(),
  VITE_SENTRY_DSN: z.string().url().optional(),
})

function getEnv() {
  const raw = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_ANIVEXA_URL: import.meta.env.VITE_ANIVEXA_URL,
    VITE_CONSUMET_URL: import.meta.env.VITE_CONSUMET_URL,
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  }

  const result = envSchema.safeParse(raw)

  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    console.warn(`[env] Variables de entorno inválidas o faltantes:\n${issues}`)
  }

  return result.data
}

export const env = getEnv()
