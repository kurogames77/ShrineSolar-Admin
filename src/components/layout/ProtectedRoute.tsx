import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../../contexts/AuthContext'
import { Spinner } from '../ui/Spinner'

export function ProtectedRoute({ children, requireSuperAdmin = false }: { children: ReactNode, requireSuperAdmin?: boolean }) {
  const { user, isLoading, role } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireSuperAdmin && role !== 'super_admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
