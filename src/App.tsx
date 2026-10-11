import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AuthProvider } from '@/context/AuthContext'
import { FinanceProvider } from '@/context/FinanceContext'
import { ToastProvider } from '@/context/ToastContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import Home from '@/pages/Home'
import Spending from '@/pages/Spending'
import Transactions from '@/pages/Transactions'
import Analysis from '@/pages/Analysis'
import Statements from '@/pages/Statements'
import EMIs from '@/pages/EMIs'
import Investments from '@/pages/Investments'
import Recurring from '@/pages/Recurring'
import Presets from '@/pages/Presets'
import Settings from '@/pages/Settings'
import Login from '@/pages/Login'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <FinanceProvider>
          <ToastProvider>
            <BrowserRouter>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<Login />} />

              {/* Protected authenticated routes */}
              <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                <Route index element={<Home />} />
                <Route path="spending" element={<Spending />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="analysis"   element={<Analysis />} />
                <Route path="investments" element={<Investments />} />
                <Route path="recurring"   element={<Recurring />} />
                <Route path="statements" element={<Statements />} />
                <Route path="emis"       element={<EMIs />} />
                <Route path="presets"    element={<Presets />} />
                <Route path="settings"   element={<Settings />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </FinanceProvider>
    </AuthProvider>
  </ErrorBoundary>
)
}
