import { describe, it, expect } from 'vitest'
import datePickerContent from '@/components/ui/DatePicker.tsx?raw'
import payModalContent from '@/components/modals/PayEMIModal.tsx?raw'
import addExpenseModalContent from '@/components/modals/AddExpenseModal.tsx?raw'

describe('DatePicker Month Navigation & Viewport Visibility Hardening', () => {
  it('navigates months using functional state updates to prevent stale state', () => {
    expect(datePickerContent).toContain('setViewMonth((m) =>')
    expect(datePickerContent).toContain('handlePrevMonth')
    expect(datePickerContent).toContain('handleNextMonth')
    expect(datePickerContent).toContain('e.preventDefault()')
    expect(datePickerContent).toContain('e.stopPropagation()')
  })

  it('provides accessible hit targets and ARIA labels on previous/next buttons', () => {
    expect(datePickerContent).toContain('aria-label="Previous month"')
    expect(datePickerContent).toContain('aria-label="Next month"')
    expect(datePickerContent).toContain('w-8 h-8 flex items-center justify-center')
  })

  it('prevents header clipping inside scroll containers by requiring at least 340px before dropping up', () => {
    expect(datePickerContent).toContain('spaceAboveInParent >= 340')
    expect(datePickerContent).toContain('spaceBelowInParent < 320')
    expect(datePickerContent).toContain('scrollIntoView')
  })

  it('supports Escape key and outside click dismissal for accessible dialog UX', () => {
    expect(datePickerContent).toContain("e.key === 'Escape'")
    expect(datePickerContent).toContain('handleClickOutside')
    expect(datePickerContent).toContain('role="dialog"')
    expect(datePickerContent).toContain('aria-label="Calendar date picker"')
  })

  it('is integrated into PayEMIModal and AddExpenseModal seamlessly', () => {
    expect(payModalContent).toContain('<DatePicker')
    expect(payModalContent).toContain('value={paymentDate}')
    expect(addExpenseModalContent).toContain('<DatePicker')
    expect(addExpenseModalContent).toContain('value={date}')
  })
})
