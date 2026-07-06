import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './features/auth/LoginPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { PaymentDetailPage } from './features/payments/PaymentDetailPage'
import { QuotePage } from './features/quote/QuotePage'
import { ServicesProvider } from './services'
import { activeTheme, applyTheme } from './theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, retry: 1 },
  },
})

export default function App() {
  useEffect(() => {
    applyTheme(activeTheme)
  }, [])

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
              <Route path="/payments/:id" element={<PaymentDetailPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </ServicesProvider>
    </QueryClientProvider>
  )
}
