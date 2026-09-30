export type PersistState = 'persisted' | 'not-persisted' | 'unsupported'

export async function getPersistState(): Promise<PersistState> {
  if (!navigator.storage?.persisted) return 'unsupported'
  return (await navigator.storage.persisted()) ? 'persisted' : 'not-persisted'
}

/** Pide almacenamiento persistente. El navegador puede negarlo; no reemplaza un respaldo. */
export async function requestPersistence(): Promise<PersistState> {
  if (!navigator.storage?.persist) return 'unsupported'
  try {
    return (await navigator.storage.persist()) ? 'persisted' : 'not-persisted'
  } catch {
    return 'not-persisted'
  }
}

export function downloadText(content: string, fileName: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Comparte un archivo con el menu del sistema (util en el celular para guardarlo en OneDrive). */
export async function shareFile(content: string, fileName: string, mime: string): Promise<'shared' | 'cancelled' | 'unsupported'> {
  const file = new File([content], fileName, { type: mime })
  if (!navigator.canShare?.({ files: [file] })) return 'unsupported'
  try {
    await navigator.share({ files: [file], title: fileName })
    return 'shared'
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    throw e
  }
}

export function canShareFiles(): boolean {
  try {
    const f = new File(['x'], 'x.json', { type: 'application/json' })
    return !!navigator.canShare?.({ files: [f] })
  } catch {
    return false
  }
}
