import { createContext, useContext, useState, type ReactNode } from 'react'
import { currentMonthPeriod, type Period } from '../domain/dates'

const PeriodContext = createContext<[Period, (p: Period) => void] | null>(null)

/** Mantiene el periodo elegido al moverse entre Inicio, Movimientos y Reportes. */
export function PeriodProvider({ children }: { children: ReactNode }) {
  const state = useState<Period>(currentMonthPeriod)
  return <PeriodContext.Provider value={state}>{children}</PeriodContext.Provider>
}

export function usePeriod() {
  const ctx = useContext(PeriodContext)
  if (!ctx) throw new Error('PeriodProvider no disponible')
  return ctx
}
