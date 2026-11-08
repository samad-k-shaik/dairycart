/**
 * Unit tests for integer-paise money maths (#26).
 */
import { describe, expect, it } from 'vitest'
import { fromPaise, multiplyMoney, sumMoney, toPaise } from './money'

describe('toPaise / fromPaise', () => {
  it('converts between rupee strings and integer paise', () => {
    expect(toPaise('60.00')).toBe(6000)
    expect(toPaise('0.29')).toBe(29) // 0.29 * 100 in floating point would be 28.999…
    expect(toPaise('60.5')).toBe(6050)
    expect(toPaise('7')).toBe(700)
    expect(fromPaise(6000)).toBe('60.00')
    expect(fromPaise(5)).toBe('0.05')
  })

  it('rejects text that is not money', () => {
    expect(() => toPaise('abc')).toThrow()
    expect(() => toPaise('1.234')).toThrow()
  })
})

describe('multiplyMoney / sumMoney', () => {
  it('calculates line subtotals and totals exactly', () => {
    expect(multiplyMoney('60.00', 2)).toBe('120.00')
    expect(sumMoney(['120.00', '35.00'])).toBe('155.00')
    expect(sumMoney(['0.10', '0.20'])).toBe('0.30') // floats would give 0.30000000000000004
  })
})
