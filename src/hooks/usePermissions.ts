import { useAuth } from '../contexts/AuthContext'

export function usePermissions() {
  const { role } = useAuth()

  // super_admin: full access to everything including user management
  // admin: full access to business data, read-only user management
  // manager: full access to business data, no user management
  // viewer: read-only access to business data

  return {
    isSuperAdmin: role === 'super_admin',
    isAdmin: role === 'admin' || role === 'super_admin',
    isManager: role === 'manager' || role === 'admin' || role === 'super_admin',
    
    canManageUsers: role === 'super_admin',
    canDeleteRecords: role === 'admin' || role === 'super_admin',
    canEditRecords: role === 'manager' || role === 'admin' || role === 'super_admin',
    canCreateRecords: role === 'manager' || role === 'admin' || role === 'super_admin',
  }
}
