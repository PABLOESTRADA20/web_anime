import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const REACTIONS = ['😂', '😱', '🔥', '💀', '😭', '👀', '💯', '🤯']

export default function WatchParty({
  participants,
  connected,
  partyId,
  onJoin,
  onLeave,
  amHost,
  hostId,
  messages,
  onSendMessage,
  onSendReaction,
  onReSync,
  onRequestHost,
}) {
  const [showPanel, setShowPanel] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [copied, setCopied] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const chatEndRef = useRef(null)
  const chatInputRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const copyLink = useCallback(() => {
    if (partyId) {
      const url = `${window.location.origin}${window.location.pathname}${window.location.search}&party=${partyId}`
      navigator.clipboard?.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }, [partyId])

  function handleChatSubmit(e) {
    e.preventDefault()
    if (!chatInput.trim()) return
    onSendMessage(chatInput)
    setChatInput('')
  }

  const anyoneConnected = connected || participants.length > 0

  if (!anyoneConnected) {
    return (
      <button
        onClick={onJoin}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/20 transition-colors">
        Iniciar Watch Party
      </button>
    )
  }

  return (
    <>
      {/* Reactions overlay */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-full mb-2 left-0 w-72 p-4 rounded-xl bg-surface border border-white/10 shadow-xl z-50">
            <p className="text-xs font-medium text-text-primary mb-2">Watch Party</p>

            {connected && participants.length > 0 && (
              <div className="space-y-1.5 mb-3 max-h-32 overflow-y-auto">
                <p className="text-[10px] text-text-secondary">Participantes:</p>
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs text-text-secondary">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary shrink-0">
                      {p.email[0].toUpperCase()}
                    </div>
                    <span className="truncate">{p.email}</span>
                    {p.id === hostId && <span className="text-[10px] text-yellow-400 shrink-0">👑</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Reactions bar */}
            {connected && (
              <div className="mb-3">
                <p className="text-[10px] text-text-secondary mb-1.5">Reacciones:</p>
                <div className="flex gap-1 flex-wrap">
                  {REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onSendReaction(emoji)}
                      className="w-7 h-7 rounded-lg bg-surface-hover hover:bg-white/20 transition-colors text-sm flex items-center justify-center">
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat */}
            {connected && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-text-secondary">Chat en vivo:</p>
                  <button onClick={() => setShowChat(!showChat)} className="text-[10px] text-neon-cyan hover:underline">
                    {showChat ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                {showChat && (
                  <div className="space-y-1.5 mb-2 max-h-32 overflow-y-auto">
                    {messages.length === 0 && <p className="text-[10px] text-text-secondary/50">Sin mensajes aún</p>}
                    {messages.map((msg) => (
                      <div key={msg.id} className="text-[11px]">
                        <span className="font-medium text-neon-cyan">{msg.sender}: </span>
                        <span className="text-text-secondary">{msg.text}</span>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}
                <form onSubmit={handleChatSubmit} className="flex gap-1">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    maxLength={200}
                    className="flex-1 px-2 py-1 rounded-lg bg-white/10 text-xs text-text-primary placeholder-text-secondary/50 border border-white/10 focus:outline-none focus:border-neon-cyan/50"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="px-2 py-1 rounded-lg bg-neon-cyan/20 text-neon-cyan text-[10px] font-medium hover:bg-neon-cyan/30 transition-colors disabled:opacity-40">
                    Enviar
                  </button>
                </form>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {connected && !amHost && (
                <button
                  onClick={onRequestHost}
                  className="px-2 py-1 rounded-lg text-[10px] font-medium bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors">
                  Pedir control
                </button>
              )}
              {connected && !amHost && (
                <button
                  onClick={onReSync}
                  className="px-2 py-1 rounded-lg text-[10px] font-medium bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 transition-colors">
                  Re-sincronizar
                </button>
              )}
              {connected ? (
                <>
                  <button
                    onClick={copyLink}
                    className="px-2 py-1 rounded-lg text-[10px] font-medium bg-surface-hover text-text-secondary hover:text-text-primary transition-colors">
                    {copied ? 'Copiado' : 'Copiar link'}
                  </button>
                  <button
                    onClick={onLeave}
                    className="px-2 py-1 rounded-lg text-[10px] font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                    Salir
                  </button>
                </>
              ) : (
                <button
                  onClick={onJoin}
                  className="px-2 py-1 rounded-lg text-[10px] font-medium bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 transition-colors">
                  Unirse
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-2 ${
          connected ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-surface text-text-secondary border-white/10'
        }`}>
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-text-secondary'}`} />
        {connected ? `${participants.length} viendo` : 'Watch Party'}
      </button>
    </>
  )
}
