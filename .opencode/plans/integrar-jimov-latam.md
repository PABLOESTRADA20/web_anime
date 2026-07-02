# Plan: Integrar LATAM real vía Jimov API

## Objetivo

Reemplazar el falso "Español Latino" (que actualmente recicla DUB inglés) con audio real en español latino usando la API de Jimov (AnimeLatinoHD / MonosChinos / TioAnime).

## Paso 1: Deployar Jimov API en Fly.io (gratis)

Jimov API es open-source (MIT). Requiere Puppeteer/Chrome → no funciona en Vercel serverless. Fly.io free tier sí corre Docker con Chrome.

### Acciones:

1. Clonar repo `https://github.com/koikiss-dev/jimov_api`
2. Crear `fly.toml` para deploy:
   - Dockerfile ya existe
   - RAM 256MB (free tier)
   - Región cercana (gig71, gru, etc.)
3. Configurar `fly secrets` si necesita vars
4. `fly deploy` → obtener URL (`https://jimov-{app}.fly.dev`)
5. Verificar endpoints:
   - `GET /anime/animelatinohd/name/{slug}` → info + episodios
   - `GET /anime/animelatinohd/episode/{slug}-{ep}` → servers con `file_url`

### Por qué Fly.io y no otro:

| Provider   | Free tier                 | Chrome/Puppeteer |
| ---------- | ------------------------- | ---------------- |
| Fly.io     | 3 VMs de 256MB            | ✅ Sí            |
| Railway    | Trial $5, después no free | ✅ Sí            |
| Vercel     | ∞ serverless              | ❌ No            |
| Cloudflare | ∞ workers                 | ❌ No            |
| Render     | $7/mes                    | ✅ Sí            |

## Paso 2: Crear provider `jimov.js`

Nuevo módulo en `src/lib/jimov.js`:

```js
const BASE = import.meta.env.VITE_JIMOV_URL || 'https://jimov-{app}.fly.dev'

export async function getEpisodes(anilistId, audio) {
  // 1. Obtener slug mapeando anilistId → Spanish title
  //    Usar getSpanishMetadata de animeflv.js (ya existe)
  // 2. GET /anime/animelatinohd/name/{slug}
  //    Si no responde, probar /anime/tioanime/name/{slug}
  //    Si no responde, probar /anime/monoschinos/name/{slug}
  // 3. Devolver { providerEpisodes, dubEpisodes, provider }
}
```

### Mapeo AniList → slug español

Ya existe en `animeflv.js`: `getSlug(title)` con ~270 overrides y slugify. Jimov usa slugs similares (con guiones, a veces con -tv).

Para álbumes con temporadas (Slime 2nd Season, etc.), el slug usa sufijos tipo `-2nd-season`.

## Paso 3: Integrar en la cadena de fallback

### Modificar `api.js`:

- Agregar `jimovGetEpisodes`, `jimovGetWatch` al import
- En `getAnimeEpisodes()`: agregar Jimov después de Anivexa, antes de Consumet
- En `getWatchWithFallback()`: agregar Jimov en la cadena cuando `audio === 'latam'`

### Modificar `detectAudio.js`:

- Reemplazar el flag falso de LATAM (que recicla DUB inglés) con detección real
- Llamar a Jimov API para verificar si tiene episodios con audio español latino
- Si Jimov responde, marcar LATAM como disponible con provider "Jimov"

## Paso 4: Configuración

### `.env` (producción):

```
VITE_JIMOV_URL=https://jimov-tuapp.fly.dev
```

### `.env.example`:

Agregar la variable de entorno con docs.

## Paso 5: Verificación

Probar con Tensei Shitara Slime Datta Ken:

1. `detectAudioOptions(101280)` → `spanish.available = true`, `spanish.provider = 'Jimov'`
2. Watch con audio `latam` → obtiene `file_url` de AnimeLatinoHD
3. Subtítulos en español desde el embed

## Riesgos

- Fly.io free tier: 3 VMs compartidas, pueden estar lentas o ser recicladas si hay alta demanda
- Jimov API puede tener endpoints caídos si el scraper upstream cambia
- No todos los animes tienen LATAM en estos providers (animes menos populares solo SUB)

## Alternativa si Fly.io no funciona

**AnimeFLV scraping directo desde CF Worker**: si el embed de video está en el HTML (no requiere JS), podemos parsearlo sin Puppeteer. Pero la prueba inicial mostró "Actualmente no hay vídeos" en el HTML plano — el contenido probablemente se carga con JS.

## Diagrama de integración

```
Anivexa (allmanga) → SUB/Japones OK
         ↓ fallback
Jimov API (AnimeLatinoHD/MonosChinos) → LATAM real
         ↓ fallback
Kenjitsu (animepahe) → SUB/DUB ENG
         ↓ fallback
Consumet → SUB (si instancia funciona)
```
