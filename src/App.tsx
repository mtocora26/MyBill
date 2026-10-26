import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useCategories, useCommitments, useDebts, useMovements, useSettings } from './data/hooks'
import { repo } from './data/repo'
import { AppShell } from './ui/components/AppShell'
import { ToastProvider } from './ui/components/Toast'
import { UpdatePrompt } from './ui/components/UpdatePrompt'
import { CommitmentFormPage } from './ui/pages/CommitmentForm'
import { CommitmentsPage } from './ui/pages/Commitments'
import { DebtFormPage } from './ui/pages/DebtForm'
import { DebtsPage } from './ui/pages/Debts'
import { Home } from './ui/pages/Home'
import { MovementFormPage } from './ui/pages/MovementForm'
import { Movements } from './ui/pages/Movements'
import { Onboarding } from './ui/pages/Onboarding'
import { SettingsPage } from './ui/pages/Settings'
import { PeriodProvider } from './ui/period-context'
import { SettingsContext } from './ui/settings-context'

const Reports = lazy(() => import('./ui/pages/Reports').then((m) => ({ default: m.Reports })))

function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center" aria-busy="true">
      <img src="/favicon.svg" alt="Cargando MyBill" className="size-12 animate-pulse" />
    </div>
  )
}

function AppRoutes() {
  const settings = useSettings()
  const movements = useMovements()
  const categories = useCategories()
  const commitments = useCommitments()
  const debts = useDebts()

  useEffect(() => {
    void repo.ensureSeeded()
  }, [])

  if (!settings || !movements || !categories || !commitments || !debts) return <Loading />
  if (!settings.onboarded) return <Onboarding />

  const data = { movements, categories }
  return (
    <SettingsContext.Provider value={settings}>
      <PeriodProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<Home {...data} commitments={commitments} debts={debts} />} />
            <Route path="/movimientos" element={<Movements {...data} />} />
            <Route path="/movimientos/:id" element={<MovementFormPage categories={categories} commitments={commitments} />} />
            <Route path="/pagos" element={<CommitmentsPage {...data} commitments={commitments} />} />
            <Route path="/pagos/:id" element={<CommitmentFormPage categories={categories} />} />
            <Route path="/deudas" element={<DebtsPage debts={debts} />} />
            <Route path="/deudas/:id" element={<DebtFormPage />} />
            <Route
              path="/reportes"
              element={
                <Suspense fallback={null}>
                  <Reports {...data} />
                </Suspense>
              }
            />
            <Route path="/ajustes" element={<SettingsPage {...data} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </PeriodProvider>
    </SettingsContext.Provider>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <UpdatePrompt />
        <AppRoutes />
      </ToastProvider>
    </BrowserRouter>
  )
}
