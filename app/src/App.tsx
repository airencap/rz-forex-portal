import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ApprovalsPage } from './features/approvals/ApprovalsPage'
import { LoginPage } from './features/auth/LoginPage'
import { BeneficiariesPage } from './features/beneficiaries/BeneficiariesPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ForwardsPage } from './features/forwards/ForwardsPage'
import { PaymentDetailPage } from './features/payments/PaymentDetailPage'
import { PaymentsListPage } from './features/payments/PaymentsListPage'
import { QuotePage } from './features/quote/QuotePage'
import { SettingsPage } from './features/settings/SettingsPage'
import { StatementsPage } from './features/statements/StatementsPage'
import { ServicesProvider } from './services'
import { useTheme } from './store/theme'
import { applyTheme } from './theme'

// ops console carries the charting library — only ops users pay for it
const OpsPage = lazy(() => import('./features/ops/OpsPage').then((m) => ({ default: m.OpsPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, retry: 1 },
  },
})

export default function App() {
  const theme = useTheme((s) => s.theme)
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <QueryClientProvider client={queryClient}>
      <ServicesProvider>
        {/* HashRouter: works on GitHub Pages without a 404 rewrite */}
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AppShell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/quote" element={<QuotePage />} />
              <Route path="/payments" element={<PaymentsListPage />} />
              <Route path="/payments/:id" element={<PaymentDetailPage />} />
              <Route path="/beneficiaries" element={<BeneficiariesPage />} />
              <Route path="/forwards" element={<ForwardsPage />} />
              <Route path="/statements" element={<StatementsPage />} />
              <Route path="/approvals" element={<ApprovalsPage />} />
              <Route
                path="/ops"
                element={
                  <Suspense fallback={<div className="p-6 text-sm text-gray-400">Loading ops console…</div>}>
                    <OpsPage />
                  </Suspense>
                }
              />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </ServicesProvider>
    </QueryClientProvider>
  )
}
