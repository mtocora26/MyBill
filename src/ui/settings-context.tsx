import { createContext, useContext } from 'react'
import type { AppSettings } from '../domain/types'

export const SettingsContext = createContext<AppSettings | null>(null)

export function useAppSettings(): AppSettings {
  const s = useContext(SettingsContext)
  if (!s) throw new Error('SettingsContext no disponible')
  return s
}
