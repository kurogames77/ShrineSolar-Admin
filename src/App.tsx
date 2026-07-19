import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'

import { ActivityProvider } from './contexts/ActivityContext'

// Pages
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { CustomerListPage } from './pages/customers/CustomerListPage'
import { OrderListPage } from './pages/orders/OrderListPage'

import { InstallationListPage } from './pages/installations/InstallationListPage'
import { ActivityLogPage } from './pages/ActivityLogPage'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ActivityProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/customers" element={<CustomerListPage />} />
                <Route path="/orders" element={<OrderListPage />} />

                <Route path="/installations" element={<InstallationListPage />} />
                
                {/* Admin only routes */}
                <Route path="/activity-log" element={<ActivityLogPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ActivityProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
