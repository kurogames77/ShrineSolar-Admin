import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type EntityType = 'customer' | 'order' | 'delivery' | 'installation' | 'user'
type ActionType = 'create' | 'update' | 'delete' | 'login' | 'status_change'

export function useActivityLog() {
  const { user } = useAuth()

  const logActivity = useCallback(
    async (
      action: ActionType,
      entityType: EntityType,
      entityId?: string,
      changes?: any
    ) => {
      if (!user) return

      try {
        await supabase.from('activity_log').insert({
          user_id: user.id,
          action,
          entity_type: entityType,
          entity_id: entityId,
          changes,
        } as any)
      } catch (err) {
        console.error('Failed to log activity:', err)
      }
    },
    [user]
  )

  return { logActivity }
}
