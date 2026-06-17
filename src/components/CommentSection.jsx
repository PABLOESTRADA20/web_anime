import { useState } from 'react'
import { motion } from 'framer-motion'
import { useComments } from '../hooks/useComments'
import { useAuth } from '../hooks/useAuth'
import { Link } from 'react-router-dom'

function CommentItem({ comment, onDelete, onReply, onLike, user, depth = 0 }) {
  const [showReply, setShowReply] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const isOwner = user?.id === comment.user_id
  const email = comment.user?.email || 'Anónimo'
  const username = email.split('@')[0]
  const date = new Date(comment.created_at).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${depth > 0 ? 'ml-6 pl-4 border-l border-white/10' : ''}`}
    >
      <div className="p-3 rounded-xl bg-surface/50">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-primary">{username}</span>
          <span className="text-[10px] text-text-secondary">{date}</span>
        </div>
        {comment.rating && (
          <span className="inline-block text-xs bg-primary/20 text-primary px-2 py-0.5 rounded mb-1.5">★ {comment.rating}/10</span>
        )}
        <p className="text-sm text-text-primary leading-relaxed">{comment.content}</p>
        <div className="flex gap-3 mt-2">
          {user && (
            <button onClick={() => setShowReply(!showReply)} className="text-[11px] text-text-secondary hover:text-text-primary transition-colors">
              Responder
            </button>
          )}
          {isOwner && (
            <button onClick={() => onDelete(comment.id)} className="text-[11px] text-red-400 hover:text-red-300 transition-colors">
              Eliminar
            </button>
          )}
        </div>
      </div>

      {showReply && user && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (replyContent.trim()) {
              onReply(comment.id, replyContent)
              setReplyContent('')
              setShowReply(false)
            }
          }}
          className="mt-2 ml-6 flex gap-2"
        >
          <input
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Escribe una respuesta..."
            className="flex-1 px-3 py-1.5 rounded-lg bg-surface border border-white/10 text-xs placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50 transition-colors"
          />
          <button type="submit" className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium">Enviar</button>
        </form>
      )}

      {comment.replies?.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} onDelete={onDelete} onReply={onReply} onLike={onLike} user={user} depth={depth + 1} />
          ))}
        </div>
      )}
    </motion.div>
  )
}

export default function CommentSection({ anilistId, mediaType = 'anime' }) {
  const { user } = useAuth()
  const { comments, loading, addComment, deleteComment, toggleLike } = useComments(anilistId, mediaType)
  const [content, setContent] = useState('')
  const [rating, setRating] = useState(0)
  const [sending, setSending] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim()) return
    setSending(true)
    try {
      await addComment(content, rating > 0 ? rating : null)
      setContent('')
      setRating(0)
    } catch (e) { console.error('Comment error:', e) }
    setSending(false)
  }

  async function handleReply(parentId, replyContent) {
    try {
      await addComment(replyContent, null, parentId)
    } catch (e) { console.error('Reply error:', e) }
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold mb-4">💬 Comentarios ({comments.length})</h2>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-xl bg-surface">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe un comentario..."
            rows={3}
            maxLength={2000}
            className="w-full px-3 py-2 rounded-lg bg-background border border-white/10 text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50 transition-colors resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <span className="text-xs text-text-secondary">Puntuación:</span>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(rating === n ? 0 : n)}
                  className={`text-xs w-6 h-6 rounded-full transition-colors ${
                    rating >= n ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={sending || !content.trim()}
              className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {sending ? 'Enviando...' : 'Comentar'}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-4 rounded-xl bg-surface text-center">
          <p className="text-sm text-text-secondary">
            <Link to="/login" className="text-primary hover:underline">Inicia sesión</Link> para comentar.
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-text-secondary text-sm">No hay comentarios aún. ¡Sé el primero!</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onDelete={deleteComment}
              onReply={handleReply}
              onLike={toggleLike}
              user={user}
            />
          ))}
        </div>
      )}
    </section>
  )
}
