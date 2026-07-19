import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { cn } from '../components/ui/Button'
import { Activity, Search, Filter } from 'lucide-react'
import { useActivity } from '../contexts/ActivityContext'

const actionColors: Record<string, string> = {
  // Customer actions
  create: 'text-emerald-600 bg-emerald-50',
  update: 'text-blue-600 bg-blue-50',
  delete: 'text-red-600 bg-red-50',
  login: 'text-slate-600 dark:text-slate-300 bg-slate-100',
  // Order statuses
  pending: 'text-amber-600 bg-amber-50',
  completed: 'text-emerald-600 bg-emerald-50',
  cancelled: 'text-red-600 bg-red-50',
  // Installation statuses
  scheduled: 'text-amber-600 bg-amber-50',
  site_survey: 'text-cyan-600 bg-cyan-50',
  in_progress: 'text-blue-600 bg-blue-50',
  on_hold: 'text-red-600 bg-red-50',
  reschedule: 'text-orange-600 bg-orange-50',
}

const entityIcons: Record<string, string> = {
  customer: '👤',
  order: '📦',
  delivery: '🚚',
  installation: '🔧',
  user: '🔐',
}

export function ActivityLogPage() {
  const { activities } = useActivity()
  const [search, setSearch] = useState('')
  const [filterEntity, setFilterEntity] = useState<string>('all')

  const filteredActivities = activities.filter(a => {
    const matchSearch = !search || 
      a.userName.toLowerCase().includes(search.toLowerCase()) ||
      a.entityName.toLowerCase().includes(search.toLowerCase()) ||
      a.details?.toLowerCase().includes(search.toLowerCase())
    const matchEntity = filterEntity === 'all' || a.entityType === filterEntity
    return matchSearch && matchEntity
  })

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffHrs = diffMs / (1000 * 60 * 60)
    if (diffHrs < 1) return `${Math.round(diffMs / (1000 * 60))}m ago`
    if (diffHrs < 24) return `${Math.round(diffHrs)}h ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const entities = ['all', 'customer', 'order', 'installation']

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Activity Log</h2>
        <p className="text-sm text-slate-500 mt-1">Track all actions performed by admin users.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-amber-500" />
              Recent Activity
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                className="h-9 w-full rounded-lg bg-white border border-slate-300 dark:bg-slate-900/50 dark:border-slate-700 dark:text-white pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                placeholder="Search activity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter tabs */}
          <div className="flex flex-col gap-3 mb-6">
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-xs font-semibold uppercase text-slate-400 w-16">Actions:</span>
              {entities.map(e => (
                <button
                  key={e}
                  onClick={() => setFilterEntity(e)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg border transition-all capitalize',
                    filterEntity === e
                      ? 'border-amber-500/30 bg-amber-50 text-amber-600'
                      : 'border-slate-200 bg-white text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:border-slate-300'
                  )}
                >
                  {e === 'all' ? 'All' : e}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-1">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div className="mt-0.5 text-lg">{entityIcons[activity.entityType] || '📋'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{activity.userName}</span>
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider', actionColors[activity.action] || 'text-slate-600 dark:text-slate-300 bg-slate-100')}>
                      {activity.action.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {activity.entityType} <span className="text-amber-600 font-medium">{activity.entityName}</span>
                    </span>
                  </div>
                  {activity.details && (
                    <p className="text-xs text-slate-500 mt-1">{activity.details}</p>
                  )}
                </div>
                <span className="text-xs text-slate-500 whitespace-nowrap">{formatTime(activity.timestamp)}</span>
              </div>
            ))}
            {filteredActivities.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No activity found matching your filters.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
