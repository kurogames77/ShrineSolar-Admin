import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

export interface ActivityItem {
  id: string
  userName: string
  action: string
  entityType: string
  entityName: string
  timestamp: string
  details?: string
}

interface ActivityContextType {
  activities: ActivityItem[]
  addActivity: (action: string, entityType: string, entityName: string, details?: string) => void
  isLoading: boolean
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined)

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { profile } = useAuth()

  const fetchActivities = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching activities:', error)
    } else if (data) {
      const formatted = data.map((d: any) => ({
        id: d.id,
        userName: d.user_name || 'Admin User',
        action: d.action,
        entityType: d.entity_type,
        entityName: d.entity_name,
        timestamp: d.created_at,
        details: d.details,
      }))
      setActivities(formatted)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchActivities()
  }, [])

  const addActivity = async (action: string, entityType: string, entityName: string, details?: string) => {
    const userName = profile?.full_name || 'Admin User'

    // Optimistically add to local state
    const newActivity: ActivityItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userName,
      action,
      entityType,
      entityName,
      timestamp: new Date().toISOString(),
      details,
    }
    setActivities(prev => [newActivity, ...prev])

    // Persist to Supabase
    const { error } = await supabase.from('activity_log').insert([{
      user_id: profile?.id,
      user_name: userName,
      action,
      entity_type: entityType,
      entity_name: entityName,
      details,
    }] as any)

    if (error) {
      console.error('Error saving activity:', error)
    }
  }

  return (
    <ActivityContext.Provider value={{ activities, addActivity, isLoading }}>
      {children}
    </ActivityContext.Provider>
  )
}

export function useActivity() {
  const context = useContext(ActivityContext)
  if (context === undefined) {
    throw new Error('useActivity must be used within an ActivityProvider')
  }
  return context
}
