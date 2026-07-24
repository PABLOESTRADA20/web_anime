import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'AnimeVerse'
const DEFAULT_DESC =
  'AnimeVerse — tu plataforma para ver anime y leer manga online. Descubre las últimas novedades, populares y en emisión.'
const DEFAULT_IMAGE = '/og-default.svg'
const BASE_URL = import.meta.env.VITE_SITE_URL || 'https://anime-app-e8p.pages.dev'

const SITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: BASE_URL,
  description: DEFAULT_DESC,
  applicationCategory: 'EntertainmentApplication',
  operatingSystem: 'All',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  inLanguage: ['es', 'en', 'pt'],
}

function makeJsonLd(title, description, image, url) {
  if (!title) return SITE_SCHEMA
  return {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: title.replace(` — ${SITE_NAME}`, ''),
    description: description || DEFAULT_DESC,
    url: url ? `${BASE_URL}${url}` : BASE_URL,
    image: image || `${BASE_URL}${DEFAULT_IMAGE}`,
    inLanguage: ['es', 'en', 'pt', 'ja'],
    potentialAction: {
      '@type': 'WatchAction',
      target: url ? `${BASE_URL}${url}` : BASE_URL,
    },
  }
}

export default function SeoHead({ title, description, image, url, type = 'website' }) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Anime y manga online`
  const desc = description || DEFAULT_DESC
  const img = image || DEFAULT_IMAGE
  const path = url || '/'

  const jsonLd = makeJsonLd(fullTitle, desc, img, path)

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={img.startsWith('http') ? img : `${BASE_URL}${img}`} />
      <meta property="og:url" content={`${BASE_URL}${path}`} />
      <meta property="og:type" content={type} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img.startsWith('http') ? img : `${BASE_URL}${img}`} />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  )
}
