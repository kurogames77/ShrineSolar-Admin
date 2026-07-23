import { useState, useRef, useEffect } from 'react'
import { cn } from './Button'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  name?: string
  required?: boolean
}

export function Select({ value, onChange, options, placeholder = 'Select...', disabled, className, name, required }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(o => o.value === value)

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Hidden input for native form submission if needed */}
      <input type="hidden" name={name} value={value} required={required} />
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-lg bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900',
          'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-sm',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      >
        <span className={cn('block truncate', !selectedOption && 'text-slate-400')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 ml-2 shrink-0" />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-[100] mt-1 w-full rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 max-h-48 overflow-auto animate-[fadeIn_0.1s_ease-out]">
          {options.length === 0 ? (
            <div className="relative cursor-default select-none py-2 px-3 text-slate-500">
              No options available
            </div>
          ) : (
            options.map((option) => (
              <div
                key={option.value}
                className={cn(
                  'relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-amber-50 hover:text-amber-900 transition-colors',
                  value === option.value ? 'bg-amber-50 text-amber-900 font-medium' : 'text-slate-900'
                )}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
