import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerProps {
  value: string // YYYY-MM-DD
  onChange: (dateStr: string) => void
  required?: boolean
  id?: string
  placeholder?: string
  minDate?: string
  maxDate?: string
  className?: string
  align?: 'left' | 'right' | 'auto'
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  required,
  id,
  placeholder = 'Select date',
  minDate,
  maxDate,
  className = '',
  align = 'auto',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [dropUp, setDropUp] = useState(false)
  const [isAlignRight, setIsAlignRight] = useState(false)

  // Parse initial or current value (YYYY-MM-DD)
  const parseDate = (str: string) => {
    if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const now = new Date()
      return {
        year: now.getFullYear(),
        month: now.getMonth(),
        day: now.getDate(),
      }
    }
    const [y, m, d] = str.split('-').map(Number)
    return { year: y, month: m - 1, day: d }
  }

  const initial = parseDate(value)
  const [viewYear, setViewYear] = useState(initial.year)
  const [viewMonth, setViewMonth] = useState(initial.month)

  // Sync calendar view month/year when external value changes
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const { year, month } = parseDate(value)
      setViewYear(year)
      setViewMonth(month)
    }
  }, [value])

  const toggleOpen = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()

      // Find scroll parent or modal container if any
      const scrollParent = containerRef.current.closest<HTMLElement>(
        '[role="dialog"], .overflow-y-auto, .overflow-auto, form'
      )

      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect()
        const spaceAboveInParent = rect.top - parentRect.top
        const spaceBelowInParent = parentRect.bottom - rect.bottom

        // Only drop up if there is strictly enough room (>= 340px) above inside the scroll parent,
        // and less than 320px below. Otherwise ALWAYS drop down to prevent month header clipping!
        if (spaceBelowInParent < 320 && spaceAboveInParent >= 340) {
          setDropUp(true)
        } else {
          setDropUp(false)
        }
      } else {
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top
        if (spaceBelow < 320 && spaceAbove >= 340) {
          setDropUp(true)
        } else {
          setDropUp(false)
        }
      }

      // Horizontal alignment
      if (align === 'right') {
        setIsAlignRight(true)
      } else if (align === 'left') {
        setIsAlignRight(false)
      } else {
        const rightBoundary = window.innerWidth - 12
        if (rect.left + 288 > rightBoundary) {
          setIsAlignRight(true)
        } else {
          setIsAlignRight(false)
        }
      }
    }
    setIsOpen((prev) => !prev)
  }

  // Smooth scroll into view if opened near bottom of scroll container
  useEffect(() => {
    if (isOpen && popoverRef.current) {
      popoverRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isOpen])

  // Close calendar on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Navigate months using functional state updates to avoid stale state or rapid-click issues
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1)
        return 11
      }
      return m - 1
    })
  }

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1)
        return 0
      }
      return m + 1
    })
  }

  // Generate days matrix
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

  // Format date helper: YYYY-MM-DD
  const formatYMD = (year: number, monthZeroIndexed: number, day: number) => {
    const y = String(year)
    const m = String(monthZeroIndexed + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Handle day click
  const handleSelectDay = (day: number) => {
    const dateStr = formatYMD(viewYear, viewMonth, day)
    onChange(dateStr)
    setIsOpen(false)
  }

  const handleSelectToday = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const now = new Date()
    const todayStr = formatYMD(now.getFullYear(), now.getMonth(), now.getDate())
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
    onChange(todayStr)
    setIsOpen(false)
  }

  const handleSelectYesterday = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = formatYMD(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
    setViewYear(yesterday.getFullYear())
    setViewMonth(yesterday.getMonth())
    onChange(yStr)
    setIsOpen(false)
  }

  // Display human-readable text
  const displayLabel = value
    ? (() => {
        const parts = value.split('-')
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10)
          const m = parseInt(parts[1], 10) - 1
          const d = parseInt(parts[2], 10)
          if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 0 && m < 12) {
            return `${String(d).padStart(2, '0')} ${MONTH_NAMES[m].slice(0, 3)} ${y}`
          }
        }
        return value
      })()
    : ''

  const today = new Date()
  const todayYMD = formatYMD(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Clickable Display Field */}
      <button
        type="button"
        id={id}
        onClick={toggleOpen}
        className={`w-full px-3.5 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all flex items-center justify-between cursor-pointer text-left select-none ${className}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className={displayLabel ? 'font-medium' : 'text-[var(--text-muted)]'}>
          {displayLabel || placeholder}
        </span>
        <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
          <Calendar size={16} className="text-brand-500 dark:text-brand-400" />
        </div>
      </button>

      {/* Hidden input for HTML form validation if required */}
      <input
        type="text"
        readOnly
        tabIndex={-1}
        className="sr-only"
        value={value}
        required={required}
      />

      {/* Interactive Calendar Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute z-[90] ${
            isAlignRight ? 'right-0' : 'left-0'
          } ${
            dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } w-72 max-w-[calc(100vw-2rem)] p-3 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl shadow-2xl animate-fade-in select-none`}
          role="dialog"
          aria-label="Calendar date picker"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Calendar Header with enlarged click targets */}
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[var(--border)]">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-xs font-bold text-[var(--text-primary)] select-none">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              title="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAY_NAMES.map((d) => (
              <span key={d} className="text-[10px] font-semibold text-[var(--text-muted)]">
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Previous month filler days */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => {
              const dayNum = daysInPrevMonth - firstDayOfWeek + idx + 1
              return (
                <div
                  key={`prev-${idx}`}
                  className="h-8 flex items-center justify-center text-[11px] text-[var(--text-muted)] opacity-35"
                >
                  {dayNum}
                </div>
              )
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1
              const dateStr = formatYMD(viewYear, viewMonth, day)
              const isSelected = value === dateStr
              const isToday = todayYMD === dateStr
              const isDisabled =
                Boolean(minDate && dateStr < minDate) ||
                Boolean(maxDate && dateStr > maxDate)

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 mx-auto flex items-center justify-center rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isDisabled
                      ? 'opacity-30 cursor-not-allowed pointer-events-none'
                      : isSelected
                      ? 'bg-brand-500 text-white font-bold shadow-md scale-105'
                      : isToday
                      ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 font-bold border border-brand-500/30'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Quick Select Shortcuts Footer */}
          <div className="pt-2.5 mt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectToday}
                className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 font-semibold transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleSelectYesterday}
                className="px-2 py-0.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] font-medium transition-colors cursor-pointer"
              >
                Yesterday
              </button>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">{value}</span>
          </div>
        </div>
      )}
    </div>
  )
}
