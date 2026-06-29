import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useReviews } from '../hooks/useReviews'
import { useI18n } from '../hooks/useI18n'
import { useToast } from './Toast'
import EmptyState from './EmptyState'
import { Link } from 'react-router-dom'

function timeAgo(dateStr, t) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} ${t('reviews.hours')}`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} ${t('reviews.hours')}`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} ${t('reviews.days')}`
  return `${Math.floor(days / 30)} ${t('reviews.months')}`
}

export default function ReviewSection({ anilistId, mediaType = 'anime' }) {
  const { user } = useAuth()
  const { t } = useI18n()
  const { reviews, userReview, loading, submitting, submitReview, deleteReview, voteReview } = useReviews(anilistId, mediaType)
  const toast = useToast()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ score: 7, content: '', hasSpoilers: false })
  const [formError, setFormError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (form.content.length < 10) {
      setFormError('La reseña debe tener al menos 10 caracteres')
      return
    }
    if (form.content.length > 5000) {
      setFormError('La reseña no puede exceder 5000 caracteres')
      return
    }
    try {
      await submitReview(form)
      setShowForm(false)
      toast(userReview ? 'Reseña actualizada' : 'Reseña publicada', 'success')
    } catch (err) {
      setFormError(err.message)
    }
  }

  function startEdit() {
    if (userReview) {
      setForm({ score: userReview.score, content: userReview.content, hasSpoilers: userReview.has_spoilers })
    }
    setShowForm(true)
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold">
          {t('reviews.title')} ({reviews.length})
        </h3>
        {user && !showForm && (
          <button
            onClick={startEdit}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 transition-colors">
            {userReview ? t('reviews.editReview') : t('reviews.writeReview')}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-2xl bg-surface/50 border border-white/5 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary">{t('reviews.score')}:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, score: n }))}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${form.score === n ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:bg-surface-hover'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder={t('reviews.placeholder')}
            className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-primary/50 transition-colors min-h-[100px] resize-y"
          />
          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={form.hasSpoilers}
              onChange={(e) => setForm((f) => ({ ...f, hasSpoilers: e.target.checked }))}
              className="rounded border-white/20 bg-surface"
            />
            {t('reviews.spoilerWarning')}
          </label>
          {formError && <p className="text-[10px] text-red-400">{formError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-hover transition-colors disabled:opacity-50">
              {submitting ? t('common.loading') : userReview ? t('reviews.update') : t('reviews.submit')}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-surface text-text-secondary rounded-lg text-xs border border-white/10 hover:bg-surface-hover transition-colors">
              {t('comments.cancel')}
            </button>
          </div>
        </form>
      )}

      {!user && reviews.length === 0 && <p className="text-xs text-text-secondary/60 text-center py-4">{t('reviews.loginToReview')}</p>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        !user && <EmptyState message={t('reviews.noReviews')} />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              isOwn={userReview?.id === review.id}
              onDelete={() => deleteReview(review.id)}
              onVote={(v) => voteReview(review.id, v)}
              t={t}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function ReviewCard({ review, isOwn, onDelete, onVote, t }) {
  const [showSpoiler, setShowSpoiler] = useState(false)
  const votes = review.votes?.reduce((s, v) => s + (v.sum || 0), 0) || 0
  const email = review.user?.email?.split('@')[0] || 'Anónimo'

  return (
    <div className="p-4 rounded-2xl bg-surface/50 border border-white/5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary shrink-0">
            {email[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <Link to={`/profile/${review.user_id}`} className="text-xs font-medium hover:text-primary transition-colors truncate block">
              {email}
            </Link>
            <p className="text-[10px] text-text-secondary/50">{timeAgo(review.created_at, t)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-primary">{review.score}/10</span>
          {isOwn && (
            <button
              onClick={onDelete}
              className="p-1 text-text-secondary/50 hover:text-red-400 transition-colors"
              title={t('reviews.delete')}
              aria-label={t('reviews.delete')}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {review.has_spoilers && !showSpoiler ? (
        <div className="relative">
          <p
            className="text-xs text-text-secondary leading-relaxed blur-sm select-none cursor-pointer"
            onClick={() => setShowSpoiler(true)}>
            {review.content.slice(0, 200)}...
          </p>
          <button
            onClick={() => setShowSpoiler(true)}
            className="absolute inset-0 flex items-center justify-center text-[10px] text-accent font-medium bg-surface/50 rounded-lg">
            {t('reviews.spoilerWarning')} — {t('common.seeMore')}
          </button>
        </div>
      ) : (
        <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">{review.content}</p>
      )}

      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
        <span className="text-[10px] text-text-secondary/50">{t('reviews.helpful')}</span>
        <button
          onClick={() => onVote(1)}
          aria-label="Votar positivo"
          className="flex items-center gap-0.5 px-2 py-1 rounded text-[10px] text-text-secondary hover:text-green-400 hover:bg-green-500/10 transition-colors">
          ▲ {votes > 0 ? votes : ''}
        </button>
        <button
          onClick={() => onVote(-1)}
          aria-label="Votar negativo"
          className="flex items-center gap-0.5 px-2 py-1 rounded text-[10px] text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors">
          ▼ {votes < 0 ? Math.abs(votes) : ''}
        </button>
      </div>
    </div>
  )
}
