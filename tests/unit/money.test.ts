import { describe, it, expect } from 'vitest'
import {
  MoneyOverflowError,
  MoneyParseError,
  MoneyTypeError,
  clampProgress,
  formatCurrency,
  fromMinorUnits,
  parseUserAmount,
  safeAdd,
  safeSub,
  sumAmounts,
  toMinorUnits
} from '../../app/utils/money'

describe('money / round-trip', () => {
  it('toMinorUnits("Rp 500.000") → 500000', () => {
    expect(toMinorUnits('Rp 500.000')).toBe(500000)
  })

  it('fromMinorUnits(500000) → "500.000"', () => {
    expect(fromMinorUnits(500000)).toBe('500.000')
  })

  it('toMinorUnits(fromMinorUnits(500000)) round-trips', () => {
    expect(toMinorUnits(fromMinorUnits(500000))).toBe(500000)
  })
})

describe('money / formatting examples', () => {
  const cases: ReadonlyArray<readonly [number | null | undefined, string]> = [
    [500000, 'Rp 500.000'],
    [4000000, 'Rp 4.000.000'],
    [1842, 'Rp 1.842'],
    [12450000, 'Rp 12.450.000'],
    [0, 'Rp 0'],
    [null, 'Rp 0'],
    [undefined, 'Rp 0'],
    [-1500000, 'Rp -1.500.000'],
    [-1, 'Rp -1'],
    [100, 'Rp 100'],
    [1000, 'Rp 1.000']
  ]
  for (const [amount, expected] of cases) {
    it(`formatCurrency(${String(amount)}) → ${expected}`, () => {
      expect(formatCurrency(amount)).toBe(expected)
    })
  }
})

describe('money / parsing', () => {
  it('"500.000" → 500000', () => {
    expect(parseUserAmount('500.000')).toBe(500000)
  })

  it('toMinorUnits overflow guard throws on input > MAX_SAFE_INTEGER', () => {
    // 99_999_999_999_999_999_999 (> MAX_SAFE_INTEGER when grouped as digits)
    const huge = '99999999999999999999'
    expect(() => toMinorUnits(huge)).toThrow(MoneyOverflowError)
  })

  it('parseUserAmount overflow guard throws on input > MAX_SAFE_INTEGER', () => {
    const huge = '99999999999999999999'
    expect(() => parseUserAmount(huge)).toThrow(MoneyOverflowError)
  })

  it('"500,000" → 500000', () => {
    expect(parseUserAmount('500,000')).toBe(500000)
  })

  it('"500000" → 500000', () => {
    expect(parseUserAmount('500000')).toBe(500000)
  })

  it('"Rp 500.000" → 500000 (toMinorUnits)', () => {
    expect(toMinorUnits('Rp 500.000')).toBe(500000)
  })

  it('"500.5" throws MoneyParseError', () => {
    expect(() => parseUserAmount('500.5')).toThrow(MoneyParseError)
  })

  it('"1e6" throws MoneyParseError', () => {
    expect(() => parseUserAmount('1e6')).toThrow(MoneyParseError)
  })

  it('"" throws MoneyParseError', () => {
    expect(() => parseUserAmount('')).toThrow(MoneyParseError)
  })

  it('mixed separators are rejected', () => {
    expect(() => parseUserAmount('500.000,5')).toThrow(MoneyParseError)
  })

  it('signs are rejected', () => {
    expect(() => parseUserAmount('-500')).toThrow(MoneyParseError)
  })
})

describe('money / arithmetic', () => {
  it('sumAmounts([500000, 300000]) → 800000', () => {
    expect(sumAmounts([500000, 300000])).toBe(800000)
  })

  it('sumAmounts([]) → 0', () => {
    expect(sumAmounts([])).toBe(0)
  })

  it('sumAmounts handles many values without float drift', () => {
    const arr = new Array(1000).fill(1) as number[]
    expect(sumAmounts(arr)).toBe(1000)
  })

  it('safeAdd throws on overflow at MAX_SAFE_INTEGER', () => {
    expect(() => safeAdd(Number.MAX_SAFE_INTEGER, 1)).toThrow(MoneyOverflowError)
  })

  it('safeSub throws on underflow past -MAX_SAFE_INTEGER', () => {
    expect(() => safeSub(-Number.MAX_SAFE_INTEGER, 1)).toThrow(MoneyOverflowError)
  })

  it('safeSub on signed inputs preserves sign', () => {
    expect(safeSub(-500000, 200000)).toBe(-700000)
    expect(safeSub(500000, 200000)).toBe(300000)
  })

  it('non-integer inputs throw MoneyTypeError', () => {
    expect(safeAdd(1, 2)).toBe(3) // sanity
    expect(() => safeAdd(1, 2.5 as unknown as number)).toThrow(MoneyTypeError)
    expect(() => safeSub(2.5 as unknown as number, 1)).toThrow(MoneyTypeError)
    expect(() => safeAdd(Number.NaN as unknown as number, 1)).toThrow(MoneyTypeError)
  })
})

describe('money / progress clamp', () => {
  const cases: ReadonlyArray<readonly [number, number, number]> = [
    [3500000, 5000000, 70], // 3.5m / 5m → 70%
    [6000000, 5000000, 100],
    [0, 5000000, 0],
    [1000000, 0, 0],
    [-100, 5000000, 0]
  ]
  for (const [num, den, expected] of cases) {
    it(`clampProgress(${num}, ${den}) → ${expected}`, () => {
      expect(clampProgress(num, den)).toBe(expected)
    })
  }
})

describe('money / edges', () => {
  it('formatCurrency(null) → "Rp 0"', () => {
    expect(formatCurrency(null)).toBe('Rp 0')
  })

  it('formatCurrency(undefined) → "Rp 0"', () => {
    expect(formatCurrency(undefined)).toBe('Rp 0')
  })

  it('fromMinorUnits(-0) is treated as zero (no "-0" string)', () => {
    expect(fromMinorUnits(0)).toBe('0')
  })

  it('fromMinorUnits handles a single-digit positive value (negative=false branch)', () => {
    expect(fromMinorUnits(7)).toBe('7')
  })

  it('parseUserAmount rejects non-string input', () => {
    expect(() => parseUserAmount(123 as unknown as string)).toThrow(MoneyParseError)
  })

  it('parseUserAmount rejects a separator followed by non-3-digit tail', () => {
    expect(() => parseUserAmount('500.5')).toThrow(MoneyParseError)
    expect(() => parseUserAmount('500.55')).toThrow(MoneyParseError)
    expect(() => parseUserAmount('500.5555')).toThrow(MoneyParseError)
  })

  it('parseUserAmount rejects head longer than 3 digits', () => {
    expect(() => parseUserAmount('1234.567')).toThrow(MoneyParseError)
    expect(() => parseUserAmount('5555.000')).toThrow(MoneyParseError)
  })

  it('parseUserAmount accepts comma as thousands separator', () => {
    expect(parseUserAmount('1.234.567')).toBe(1234567)
    expect(parseUserAmount('1,234,567')).toBe(1234567)
  })

  it('parseUserAmount rejects mixed separators', () => {
    expect(() => parseUserAmount('1.234,567')).toThrow(MoneyParseError)
    expect(() => parseUserAmount('1,234.567')).toThrow(MoneyParseError)
  })

  it('toMinorUnits accepts comma as thousands separator', () => {
    expect(toMinorUnits('1,234,567')).toBe(1234567)
  })

  it('toMinorUnits rejects non-string input', () => {
    expect(() => toMinorUnits(123 as unknown as string)).toThrow(MoneyParseError)
  })

  it('clampProgress negative denominator returns 0', () => {
    expect(clampProgress(100, -5)).toBe(0)
  })

  it('clampProgress numerator over the cap still returns 100', () => {
    expect(clampProgress(9999999, 1)).toBe(100)
  })

  it('parseUserAmount rejects internal whitespace', () => {
    expect(() => parseUserAmount('5 000')).toThrow(MoneyParseError)
  })

  it('parseUserAmount rejects letters anywhere', () => {
    expect(() => parseUserAmount('5a000')).toThrow(MoneyParseError)
  })

  it('safeAdd on negative operands returns negative integer', () => {
    expect(safeAdd(-100, -200)).toBe(-300)
  })

  it('safeSub with identical operands returns 0', () => {
    expect(safeSub(500, 500)).toBe(0)
  })

  it('clampProgress at exactly 100 percent', () => {
    expect(clampProgress(5000000, 5000000)).toBe(100)
  })

  it('clampProgress rounding (e.g. 1/3 → 33)', () => {
    expect(clampProgress(1, 3)).toBe(33)
  })

  it('clampProgress rounding down (e.g. 2/3 → 67)', () => {
    expect(clampProgress(2, 3)).toBe(67)
  })

  it('clampProgress accepts very large integers', () => {
    expect(clampProgress(1000000000, 1000000001)).toBe(100)
    expect(clampProgress(1, 1000000001)).toBe(0)
  })

  it('parseUserAmount accepts multi-group thousands', () => {
    expect(parseUserAmount('1.234.567.890')).toBe(1234567890)
    expect(toMinorUnits('1.234.567.890')).toBe(1234567890)
  })

  it('parseUserAmount rejects mid-string non-3-digit group', () => {
    expect(() => parseUserAmount('12.34.567')).toThrow(MoneyParseError)
    expect(() => toMinorUnits('12.34.567')).toThrow(MoneyParseError)
  })

  it('parseUserAmount rejects empty head before separator', () => {
    expect(() => parseUserAmount('.123')).toThrow(MoneyParseError)
    expect(() => toMinorUnits('Rp .123')).toThrow(MoneyParseError)
  })

  it('toMinorUnits rejects mixed separators', () => {
    expect(() => toMinorUnits('1.234,567')).toThrow(MoneyParseError)
  })

  it('toMinorUnits rejects empty after stripping Rp', () => {
    expect(() => toMinorUnits('Rp ')).toThrow(MoneyParseError)
    expect(() => toMinorUnits('Rp')).toThrow(MoneyParseError)
  })

  it('fromMinorUnits handles negative multi-group', () => {
    expect(fromMinorUnits(-1234567)).toBe('-1.234.567')
  })

  it('fromMinorUnits handles zero via direct call', () => {
    expect(fromMinorUnits(0)).toBe('0')
  })
})
