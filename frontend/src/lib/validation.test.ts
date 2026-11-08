/**
 * Unit tests for checkout validation (#28): name 2–100 chars, phone ^[6-9]\d{9}$.
 */
import { describe, expect, it } from 'vitest'
import { validateName, validatePhone } from './validation'

describe('validateName', () => {
  it('accepts 2–100 characters after trimming', () => {
    expect(validateName('Ravi Kumar')).toBeUndefined()
    expect(validateName('  Al  ')).toBeUndefined()
  })

  it('rejects empty, too short and too long names', () => {
    expect(validateName('   ')).toBeDefined()
    expect(validateName('R')).toBeDefined()
    expect(validateName('x'.repeat(101))).toBeDefined()
  })
})

describe('validatePhone', () => {
  it('accepts 10-digit Indian mobile numbers starting with 6–9', () => {
    expect(validatePhone('9876543210')).toBeUndefined()
    expect(validatePhone('6000000000')).toBeUndefined()
  })

  it('rejects other formats', () => {
    expect(validatePhone('')).toBeDefined()
    expect(validatePhone('5876543210')).toBeDefined() // starts with 5
    expect(validatePhone('987654321')).toBeDefined() // 9 digits
    expect(validatePhone('+919876543210')).toBeDefined() // country code not allowed
  })
})
