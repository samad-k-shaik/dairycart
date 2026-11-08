/**
 * Unit tests for ALLOWED_TRANSITIONS (#31 testing requirement).
 * Each expectation is one row of the table in functional-requirements.md.
 */
import { describe, expect, it } from 'vitest'
import { ALLOWED_TRANSITIONS, canTransition, getNextStatuses, isFinalStatus, isOrderStatus } from './orderStatus'

describe('ALLOWED_TRANSITIONS', () => {
  it('matches the requirements table', () => {
    expect(ALLOWED_TRANSITIONS).toEqual({
      PLACED: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
      OUT_FOR_DELIVERY: ['DELIVERED'],
      DELIVERED: [],
      CANCELLED: [],
    })
  })

  it('allows forward moves and blocks backward or skipping moves', () => {
    expect(canTransition('PLACED', 'CONFIRMED')).toBe(true)
    expect(canTransition('CONFIRMED', 'CANCELLED')).toBe(true)
    expect(canTransition('DELIVERED', 'PLACED')).toBe(false)
    expect(canTransition('PLACED', 'DELIVERED')).toBe(false)
    expect(canTransition('OUT_FOR_DELIVERY', 'CANCELLED')).toBe(false)
  })

  it('offers no options for final statuses', () => {
    expect(getNextStatuses('DELIVERED')).toEqual([])
    expect(isFinalStatus('DELIVERED')).toBe(true)
    expect(isFinalStatus('CANCELLED')).toBe(true)
    expect(isFinalStatus('PLACED')).toBe(false)
  })
})

describe('isOrderStatus', () => {
  it('accepts only real statuses (used to sanitise ?status= in the URL)', () => {
    expect(isOrderStatus('PLACED')).toBe(true)
    expect(isOrderStatus('placed')).toBe(false)
    expect(isOrderStatus(null)).toBe(false)
  })
})
