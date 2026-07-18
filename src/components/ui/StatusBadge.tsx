import { cn } from './Button'

export type StatusVariant = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed' | 'scheduled' | 'in_transit' | 'delivered' | 'site_survey' | 'inspection' | 'on_hold'

interface StatusBadgeProps {
  status: StatusVariant | string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (s: string) => {
    switch (s.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return { label: s.replace('_', ' '), classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
      case 'in_progress':
      case 'in_transit':
      case 'site_survey':
      case 'inspection':
        return { label: s.replace('_', ' '), classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse' }
      case 'pending':
      case 'scheduled':
        return { label: s.replace('_', ' '), classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20' }
      case 'cancelled':
      case 'failed':
      case 'on_hold':
        return { label: s.replace('_', ' '), classes: 'bg-red-500/10 text-red-400 border-red-500/20' }
      default:
        return { label: s.replace('_', ' '), classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20' }
    }
  }

  const config = getStatusConfig(status)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider',
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  )
}
