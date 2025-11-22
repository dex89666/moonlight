import { describe, it, expect } from 'vitest'
import { digits, sumDigits, reduceToOne, pathNumber } from './numerology'

describe('numerology', () => {
  it('digits parses date', () => {
    expect(digits('01.12.1990')).toEqual([0,1,1,2,1,9,9,0])
  })
  it('sumDigits works', () => {
    expect(sumDigits([1,2,3])).toBe(6)
  })
  it('reduceToOne works', () => {
    expect(reduceToOne(99)).toBe(9)
  })
  it('pathNumber works', () => {
    expect(typeof pathNumber('10.10.2010')).toBe('number')
  })
})
