/**
 * Unit tests for display formatting (#22).
 * Run with: npm test
 */
import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDateTime, formatOrderId, isTodayInIST } from './format'

describe('formatCurrency', () => {
  it('formats API money strings as rupees', () => {
    expect(formatCurrency('60.00')).toBe('₹60.00')
    expect(formatCurrency('155.00')).toBe('₹155.00') // acceptance criterion of #22
  })

  it('uses Indian digit grouping for large amounts', () => {
    expect(formatCurrency('150000.50')).toBe('₹1,50,000.50')
  })
})

describe('formatDateTime', () => {
  it('shows UTC dates in India Standard Time', () => {
    // 04:30 UTC = 10:00 IST (UTC+5:30)
    expect(formatDateTime('2026-11-07T04:30:00Z')).toMatch(/7 Nov 2026.*10:00/)
  })
})

describe('isTodayInIST', () => {
  const now = new Date('2026-11-08T06:00:00Z') // 8 Nov, 11:30 IST

  it('is true for an order earlier the same IST day', () => {
    expect(isTodayInIST('2026-11-08T01:00:00Z', now)).toBe(true)
  })

  it('counts a late-UTC order as the next IST day', () => {
    // 7 Nov 20:00 UTC = 8 Nov 01:30 IST → today
    expect(isTodayInIST('2026-11-07T20:00:00Z', now)).toBe(true)
  })

  it('is false for yesterday in IST', () => {
    // 7 Nov 18:00 UTC = 7 Nov 23:30 IST → yesterday
    expect(isTodayInIST('2026-11-07T18:00:00Z', now)).toBe(false)
  })
})

describe('formatOrderId', () => {
  it('prefixes a hash', () => {
    expect(formatOrderId(101)).toBe('#101')
  })
})
