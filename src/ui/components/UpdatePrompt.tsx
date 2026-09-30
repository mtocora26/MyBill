import { RefreshCw } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** Avisa cuando hay una version nueva en lugar de recargar sola y perder un formulario a medias. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null
  return (
    <div className="fixed inset-x-0 top-3 z-50 flex justify-center px-4" role="alert">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm shadow-card">
        <RefreshCw className="size-5 shrink-0 text-brand" aria-hidden="true" />
        <p className="flex-1">Hay una nueva versión disponible.</p>
        <button className="font-semibold text-muted hover:text-ink" onClick={() => setNeedRefresh(false)}>
          Luego
        </button>
        <button className="font-semibold text-brand-ink" onClick={() => void updateServiceWorker(true)}>
          Actualizar
        </button>
      </div>
    </div>
  )
}
