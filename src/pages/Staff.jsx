import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getStaffInfo } from '../lib/anilist'
import AnimeCard from '../components/AnimeCard'
import { GridSkeleton } from '../components/Skeletons'
import SeoHead from '../components/SeoHead'
import EmptyState from '../components/EmptyState'

export default function Staff() {
  const { id } = useParams()
  const [staff, setStaff] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getStaffInfo(id).then((data) => {
      setStaff(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  if (loading && !staff) return <div className="pt-10"><GridSkeleton count={6} /></div>
  if (!staff) return <EmptyState message="Staff no encontrado" />

  const mediaEdges = staff.staffMedia?.edges || []
  const characters = staff.characters?.edges || []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <SeoHead title={staff.name.full} />
      <div className="flex flex-col sm:flex-row gap-6 mb-10">
        <div className="shrink-0">
          <img src={staff.image?.large} alt={staff.name.full}
            className="w-40 h-56 rounded-2xl object-cover ring-1 ring-white/10"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold mb-1">{staff.name.full}</h1>
          {staff.name.native && <p className="text-sm text-text-secondary mb-2">{staff.name.native}</p>}
          {staff.primaryOccupations?.length > 0 && (
            <p className="text-xs text-primary font-mono uppercase tracking-wider mb-3">{staff.primaryOccupations.join(', ')}</p>
          )}
          <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
            {staff.gender && <span>Género: {staff.gender}</span>}
            {staff.age && <span>Edad: {staff.age}</span>}
            {staff.homeTown && <span>Origen: {staff.homeTown}</span>}
            {staff.bloodType && <span>Blood: {staff.bloodType}</span>}
            {staff.favourites > 0 && <span>{staff.favourites} favoritos</span>}
            {staff.dateOfBirth && (
              <span>Cumpleaños: {[staff.dateOfBirth.month, staff.dateOfBirth.day].filter(Boolean).join('/')}</span>
            )}
          </div>
          {staff.description && (
            <div className="mt-4 text-sm text-text-secondary/80 leading-relaxed line-clamp-6">
              {staff.description.replace(/<[^>]*>/g, '')}
            </div>
          )}
        </div>
      </div>

      {mediaEdges.length > 0 && (
        <section className="mb-12">
          <h2 className="text-lg font-bold mb-5">Anime y manga ({mediaEdges.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {mediaEdges.map((edge) => {
              const m = edge.node
              return (
                <div key={m.id} className="relative">
                  <AnimeCard anime={{ ...m, anilistId: m.id, title: m.title, image: m.coverImage?.large }} index={0} />
                  <p className="text-[10px] text-text-secondary/60 mt-1 text-center truncate">{edge.staffRole}</p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {characters.length > 0 && (
        <section className="mb-12">
          <h2 className="text-lg font-bold mb-5">Personajes interpretados ({characters.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {characters.map((edge) => (
              <div key={edge.node.id} className="group rounded-2xl overflow-hidden bg-surface card-hover">
                <Link to={`/character/${edge.node.id}`} className="block">
                  <div className="aspect-[3/4] overflow-hidden">
                    <img src={edge.node.image?.large} alt={edge.node.name.full} loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="p-2.5 text-center">
                    <p className="text-xs font-medium truncate">{edge.node.name.full}</p>
                    <p className="text-[10px] text-text-secondary truncate">{edge.role}</p>
                    {edge.media && (
                      <p className="text-[10px] text-accent truncate mt-0.5">{edge.media.title?.romaji || edge.media.title?.english}</p>
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/0 group-hover:ring-primary/30 transition-all duration-300" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-4">
        <Link to="/characters" className="text-sm text-text-secondary hover:text-text-primary transition-colors">← Volver a personajes</Link>
      </div>
    </motion.div>
  )
}
