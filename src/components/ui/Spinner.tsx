import { Loader2 } from 'lucide-react'
import { cn } from './Button'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  }

  return (
    <div className="flex items-center justify-center h-full w-full">
      <Loader2 
        className={cn('animate-spin text-amber-500', sizes[size], className)} 
      />
    </div>
  )
}
