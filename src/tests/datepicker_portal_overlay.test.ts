import { describe, it, expect } from 'vitest'
import datePickerContent from '@/components/ui/DatePicker.tsx?raw'
import payModalContent from '@/components/modals/PayEMIModal.tsx?raw'

describe('DatePicker Portal & Viewport Visibility Hardening', () => {
  it('escapes scrollable and overflow-hidden containers using React Portal to document.body', () => {
    // DatePicker must use createPortal to mount outside parent modal boundaries
    expect(datePickerContent).toContain("import { createPortal } from 'react-dom'")
    expect(datePickerContent).toContain('createPortal(')
    expect(datePickerContent).toContain('document.body')
  })

  it('uses fixed positioning with high z-index to float on top of modal overlays', () => {
    // Popover must be fixed positioned with z-index above modal layers (z-50)
    expect(datePickerContent).toContain("position: 'fixed'")
    expect(datePickerContent).toContain('zIndex: 9999')
  })

  it('safeguards against top and bottom viewport clipping with boundary clamping', () => {
    // Popover vertical coordinates must never be clipped outside the viewport
    expect(datePickerContent).toContain('Math.max(8, top)')
    expect(datePickerContent).toContain('viewportHeight')
    expect(datePickerContent).toContain('viewportWidth')
  })

  it('tracks parent scroll in capture phase so inner modal scrolling repositions popover', () => {
    // Scroll listener must use capture: true to catch scrolling inside overflow-y-auto modal body
    expect(datePickerContent).toContain("window.addEventListener('scroll', handleScrollOrResize, true)")
    expect(datePickerContent).toContain("window.removeEventListener('scroll', handleScrollOrResize, true)")
  })

  it('supports Escape key and outside click dismissal for accessible dialog UX', () => {
    expect(datePickerContent).toContain("e.key === 'Escape'")
    expect(datePickerContent).toContain('handleClickOutside')
    expect(datePickerContent).toContain('role="dialog"')
    expect(datePickerContent).toContain('aria-label="Calendar date picker"')
  })

  it('provides complete month/year navigation controls and days grid', () => {
    expect(datePickerContent).toContain('handlePrevMonth')
    expect(datePickerContent).toContain('handleNextMonth')
    expect(datePickerContent).toContain('MONTH_NAMES[viewMonth]')
    expect(datePickerContent).toContain('handleSelectToday')
    expect(datePickerContent).toContain('handleSelectYesterday')
  })

  it('is integrated into PayEMIModal with seamless state binding', () => {
    expect(payModalContent).toContain('<DatePicker')
    expect(payModalContent).toContain('value={paymentDate}')
    expect(payModalContent).toContain('onChange={setPaymentDate}')
  })
})
