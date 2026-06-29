import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DetailSkeleton } from '../components/Skeletons'
import { getCharacterInfo } from '../lib/anilist'
import SeoHead from '../components/SeoHead'
import SafeImage from '../components/SafeImage'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/Toast'

export default function CharacterDetail() {
  const { id } = useParams()
  const [character, setCharacter] = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    getCharacterInfo(id)
      .then((data) => {
        if (!ac.signal.aborted) {
          setCharacter(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!ac.signal.aborted) {
          setLoading(false)
          toast('Error al cargar personaje', 'error')
        }
      })
    return () => ac.abort()
  }, [id, toast])

  if (loading)
    return (
      <>
        <SeoHead title="Cargando..." />
        <DetailSkeleton />
      </>
    )
  if (!character) return <EmptyState icon="🔍" message="Personaje no encontrado." />

  const name = character.name?.full || 'Sin nombre'
  const image = character.image?.large

  return (
    <>
      <SeoHead
        title={name}
        description={character.description?.replace(/<[^>]*>/g, '').slice(0, 160)}
        image={image}
        url={`/character/${id}`}
      />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <div className="flex flex-col sm:flex-row gap-6 mb-10">
          <div className="shrink-0 w-[200px] mx-auto sm:mx-0">
            <SafeImage src={image} alt={name} className="w-full rounded-2xl shadow-lg" fallbackText={name} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold">{name}</h1>
            {character.name?.native && <p className="text-text-secondary text-sm mt-1">{character.name.native}</p>}
            {character.name?.alternative?.length > 0 && (
              <p className="text-xs text-text-secondary mt-1">También conocido como: {character.name.alternative.join(', ')}</p>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              {character.gender && (
                <span className="text-xs bg-surface px-3 py-1 rounded-full text-text-secondary">{character.gender}</span>
              )}
              {character.age && <span className="text-xs bg-surface px-3 py-1 rounded-full text-text-secondary">{character.age} años</span>}
              {character.dateOfBirth?.year && (
                <span className="text-xs bg-surface px-3 py-1 rounded-full text-text-secondary">
                  {character.dateOfBirth.month}/{character.dateOfBirth.day}/{character.dateOfBirth.year}
                </span>
              )}
              {character.dateOfBirth?.month && !character.dateOfBirth?.year && (
                <span className="text-xs bg-surface px-3 py-1 rounded-full text-text-secondary">
                  {character.dateOfBirth.month}/{character.dateOfBirth.day}
                </span>
              )}
              {character.bloodType && (
                <span className="text-xs bg-surface px-3 py-1 rounded-full text-text-secondary">Sangre {character.bloodType}</span>
              )}
              <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-medium">★ {character.favourites}</span>
            </div>

            {character.description && (
              <div className="text-sm text-text-secondary mt-4 leading-relaxed line-clamp-6">
                {character.description.replace(/<[^>]*>/g, '')}
              </div>
            )}
          </div>
        </div>

        {character.media?.edges?.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4">🎬 Apariciones en medios</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {character.media.edges.map((edge) => {
                const media = edge.node
                const title2 = media.title?.romaji || media.title?.english || ''
                const hasVoiceActor = edge.voiceActors?.length > 0
                return (
                  <Link
                    key={media.id}
                    to={media.type === 'ANIME' ? `/anime/${media.id}` : `/manga/${media.id}`}
                    className="group rounded-2xl overflow-hidden bg-surface hover:bg-surface-hover transition-all">
                    <div className="aspect-[3/4] overflow-hidden">
                      <SafeImage
                        src={media.coverImage?.large}
                        alt={title2}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        fallbackText={title2}
                      />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{title2}</p>
                      <p className="text-[10px] text-text-secondary">{edge.role}</p>
                      {hasVoiceActor && (
                        <div className="mt-1 border-t border-white/5 pt-1">
                          {edge.voiceActors.slice(0, 2).map((va) => (
                            <p key={va.id} className="text-[10px] text-accent truncate">
                              🎤 {va.name?.full} ({va.language})
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </motion.div>
    </>
  )
}
