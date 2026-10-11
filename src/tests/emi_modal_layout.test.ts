import { describe, it, expect } from 'vitest'
import addModalContent from '@/components/modals/AddEMIModal.tsx?raw'
import editModalContent from '@/components/modals/EditEMIModal.tsx?raw'
import payModalContent from '@/components/modals/PayEMIModal.tsx?raw'

describe('Phase 1 Verification: EMI Modal Overflow & 3-Region Layout Audit', () => {
  it('enforces bounded height, rounded corners, and overflow-hidden on AddEMIModal container', () => {
    // Modal container must have overflow-hidden, max-h-[90vh], and flex flex-col
    expect(addModalContent).toContain('max-h-[90vh]')
    expect(addModalContent).toContain('overflow-hidden')
    expect(addModalContent).toContain('rounded-2xl')
    expect(addModalContent).toContain('flex flex-col')
  })

  it('structures AddEMIModal with distinct Header, Scrollable Body, and Pinned Footer', () => {
    // Region A: Header with shrink-0 and border-b
    expect(addModalContent).toContain('shrink-0 bg-[var(--bg-surface)]')
    expect(addModalContent).toContain('border-b border-[var(--border)]')

    // Region B: Scrollable body with flex-1, min-h-0, overflow-y-auto
    expect(addModalContent).toContain('flex-1 min-h-0 overflow-y-auto')

    // Region C: Pinned footer with shrink-0, border-t, and Cancel/Save buttons
    expect(addModalContent).toContain('border-t border-[var(--border)] shrink-0')
    expect(addModalContent).toContain('Cancel')
    expect(addModalContent).toContain('Add Loan')
  })

  it('contains Notes input inside the scrollable body before the footer in AddEMIModal', () => {
    const notesIdx = addModalContent.indexOf('Notes (Optional)')
    const footerIdx = addModalContent.indexOf('Region C: Footer')

    expect(notesIdx).toBeGreaterThan(0)
    expect(footerIdx).toBeGreaterThan(0)
    // Notes MUST appear before footer inside Region B
    expect(notesIdx).toBeLessThan(footerIdx)
  })

  it('provides inline field validation without relying on native browser popups', () => {
    // Must use noValidate to prevent browser popup overlays
    expect(addModalContent).toContain('noValidate')
    expect(addModalContent).toContain('fieldErrors')
    expect(addModalContent).toContain('nameInputRef')
    expect(addModalContent).toContain('lenderInputRef')
  })

  it('enforces 3-region bounded layout on EditEMIModal and PayEMIModal', () => {
    expect(editModalContent).toContain('max-h-[90vh]')
    expect(editModalContent).toContain('overflow-hidden')
    expect(editModalContent).toContain('flex-1 min-h-0 overflow-y-auto')
    expect(editModalContent).toContain('shrink-0')

    expect(payModalContent).toContain('max-h-[90vh]')
    expect(payModalContent).toContain('overflow-hidden')
    expect(payModalContent).toContain('flex-1 min-h-0 overflow-y-auto')
    expect(payModalContent).toContain('shrink-0')
  })

  it('renders custom product name text box when Category is Other in EditEMIModal and AddEMIModal', () => {
    expect(editModalContent).toContain("category === 'Other'")
    expect(editModalContent).toContain('Product / Item Name *')
    expect(editModalContent).toContain('placeholder="e.g. Shoes, Watch, Bicycle, Headphones"')
    expect(addModalContent).toContain("category === 'Other'")
    expect(addModalContent).toContain('Product / Item Name *')
  })
})
