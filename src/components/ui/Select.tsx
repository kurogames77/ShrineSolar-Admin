import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(event.target as Node)
      const isOutsideDropdown = dropdownRef.current ? !dropdownRef.current.contains(event.target as Node) : true
      
      if (isOutsideContainer && isOutsideDropdown) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const updatePosition = () => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          setPosition({
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
          })
        }
      }
      
      updatePosition()
      
      const handleScroll = (e: Event) => {
        // Ignore scroll events originating from inside the dropdown itself
        if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
          return
        }
        setIsOpen(false)
      }
      
      window.addEventListener('scroll', handleScroll, true)
      window.addEventListener('resize', handleScroll)
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true)
        window.removeEventListener('resize', handleScroll)
      }
    }
  }, [isOpen])

  const selectedOption = options.find(o => o.value === value)

  const dropdownMenu = isOpen && !disabled && (
    <div 
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        zIndex: 9999
      }}
      className="rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 max-h-48 overflow-auto animate-[fadeIn_0.1s_ease-out]"
    >
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
  )

  return (
    <div ref={containerRef} className="relative w-full">
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

      {dropdownMenu && typeof document !== 'undefined'
        ? createPortal(dropdownMenu, document.body)
        : null}
    </div>
  )
}
