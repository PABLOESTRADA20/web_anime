# AnimeVerse

App de anime y manga online con múltiples proveedores, subtítulos en español, watch party, y recomendaciones personalizadas.

## Stack

- **Frontend**: React 19 + Vite 8 + Tailwind CSS 4 + Framer Motion
- **Backend**: Supabase (auth, DB, RLS, edge functions) + Cloudflare Pages (hosting, functions, PWA)
- **APIs**: AniList GraphQL, Anivexa (múltiples providers), Miruro, MangaDex
- **Calidad**: TypeScript strict, ESLint, Prettier, Husky + lint-staged, Vitest

## Comenzar

```bash
npm install
cp .env.example .env  # configurar variables
npm run dev
```

## Variables de entorno

| Variable                 | Requerida | Descripción                                         |
| ------------------------ | --------- | --------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Sí        | URL del proyecto Supabase                           |
| `VITE_SUPABASE_ANON_KEY` | Sí        | Anon key pública de Supabase                        |
| `VITE_ANIVEXA_URL`       | No        | API de Anivexa (por defecto anivexa-api.vercel.app) |
| `VITE_CONSUMET_URL`      | No        | API de Consumet (para providers alternativos)       |
| `VITE_SENTRY_DSN`        | No        | DSN de Sentry para monitoreo de errores             |

## Scripts

| Comando                 | Descripción                         |
| ----------------------- | ----------------------------------- |
| `npm run dev`           | Desarrollo con HMR                  |
| `npm run build`         | Build producción                    |
| `npm run preview`       | Preview del build                   |
| `npm run lint`          | ESLint                              |
| `npm run format`        | Prettier — escribir                 |
| `npm run format:check`  | Prettier — verificar                |
| `npm run test`          | Tests (Vitest)                      |
| `npm run test:watch`    | Tests en watch mode                 |
| `npm run test:coverage` | Tests con cobertura                 |
| `npm run typecheck`     | TypeScript strict check             |
| `npm run analyze`       | Bundle analyzer (abre visualizador) |

## Arquitectura

```
src/
├── components/    # UI reutilizable
├── hooks/         # Hooks (auth, datos, UI)
├── i18n/          # Traducciones ES/EN/PT
├── lib/           # APIs y lógica de negocio
├── pages/         # Vistas (Home, Watch, AnimeDetail, etc.)
├── utils/         # Utilidades (subtitles, cache, proxy)
└── sw.js          # Service Worker (PWA)
functions/         # Cloudflare Functions (proxy, rate-limit)
supabase/
├── functions/     # Edge Functions (cors-proxy, notifications, etc.)
└── migrations/    # SQL migrations (17 archivos)
```

## Providers de video

El sistema usa un chain de fallback: **Miruro → Anivexa (Anikoto, Reanime, etc.) → Kenjitsu/Animepahe → VerAnime** para LATAM. Los subtítulos en español se detectan automáticamente por language code, label y patrón de archivo.

## Despliegue

El deploy automático via GitHub Actions: push a `main` → build → deploy a Cloudflare Pages.

Requiere secrets configurados en GitHub:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ANIVEXA_URL`, `VITE_CONSUMET_URL`
- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
