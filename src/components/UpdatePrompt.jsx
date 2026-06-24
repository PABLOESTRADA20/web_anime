import { useState, useEffect } from 'react'

export default function UpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const trackInstalling = (worker) => {
      if (!worker) return
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          setUpdateAvailable(true)
          setRegistration(worker)
        }
      })
    }

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      trackInstalling(reg.installing)
      reg.addEventListener('updatefound', () => trackInstalling(reg.installing))
    })

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }, [])

  function handleUpdate() {
    if (registration) {
      registration.postMessage({ type: 'SKIP_WAITING' })
    }
    setUpdateAvailable(false)
  }

  if (!updateAvailable) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] bg-primary text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-primary-hover">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Nueva versión disponible</p>
        <p className="text-xs text-white/70">Actualiza para ver los últimos cambios</p>
      </div>
      <button
        onClick={handleUpdate}
        className="shrink-0 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-medium transition-colors">
        Actualizar
      </button>
      <button onClick={() => setUpdateAvailable(false)} className="shrink-0 p-2 rounded-xl hover:bg-white/10 transition-colors text-xs">
        ✕
      </button>
    </div>
  )
}
