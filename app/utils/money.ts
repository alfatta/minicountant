/**
 * Money utilities — integer-only arithmetic and formatting.
 *
 * All amounts are stored and operated on as integers in minor units.
 * For IDR, 1 unit = Rp 1 (no sub-unit). No `parseFloat`, no float literals,
 * no `toFixed`, no `Intl.NumberFormat` in this file.
 */

export class MoneyParseError extends Error {
  constructor(input: string) {
    super(`Cannot parse money input: ${JSON.stringify(input)}`)
    this.name = 'MoneyParseError'
  }
}

export class MoneyOverflowError extends Error {
  constructor(a: number, b: number, op: '+' | '-') {
    super(`Money ${op} overflow: ${a} ${op} ${b} exceeds MAX_SAFE_INTEGER`)
    this.name = 'MoneyOverflowError'
  }
}

export class MoneyTypeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MoneyTypeError'
  }
}

const MAX_SAFE = Number.MAX_SAFE_INTEGER

function assertInteger(value: number, name: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new MoneyTypeError(`${name} must be a finite number, got ${String(value)}`)
  }
  if (!Number.isInteger(value)) {
    throw new MoneyTypeError(`${name} must be an integer (got ${value})`)
  }
}

/**
 * Parse a fully formatted display string back to integer minor units.
 * Accepts "Rp <n>" form (with dot thousands) and bare digit strings.
 * Rejects: decimals, scientific notation, signs, non-digit noise.
 */
export function toMinorUnits(display: string): number {
  if (typeof display !== 'string') throw new MoneyParseError(String(display))
  const cleaned = display.replace(/Rp\s?/gi, '').replace(/[\s]/g, '')
  // Reject signs, decimals, exponents, anything not digits/separators.
  if (!/^[\d.,]+$/.test(cleaned) || cleaned === '') throw new MoneyParseError(display)
  // Disallow mixed separators (would be ambiguous).
  if (cleaned.includes('.') && cleaned.includes(',')) throw new MoneyParseError(display)

  const sep = cleaned.includes('.') ? '.' : cleaned.includes(',') ? ',' : ''
  if (sep) {
    const parts = cleaned.split(sep)
    // The head (first part) must be 1 to 3 digits, and every following
    // part must be exactly 3 digits. This rejects true decimal inputs
    // (a non-thousand tail length) while accepting full groupings.
    const [head = '', ...rest] = parts
    if (head.length === 0 || head.length > 3) throw new MoneyParseError(display)
    for (const p of rest) {
      if (p.length !== 3) throw new MoneyParseError(display)
    }
  }

  const digits = cleaned.replace(/[.,]/g, '')
  const n = Number(digits)
  if (n > MAX_SAFE) throw new MoneyOverflowError(n, 0, '+')
  return n
}

/**
 * Insert `.` every 3 digits from the right. No decimals. Integer-safe.
 */
export function fromMinorUnits(amount: number): string {
  assertInteger(amount, 'amount')
  const negative = amount < 0
  let digits = Math.abs(amount).toString()
  let out = ''
  while (digits.length > 3) {
    out = `.${digits.slice(-3)}${out}`
    digits = digits.slice(0, -3)
  }
  out = `${digits}${out}`
  return negative ? `-${out}` : out
}

/**
 * Display helper. Null/undefined → "Rp 0". Negative sign placed after "Rp ".
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'Rp 0'
  assertInteger(amount, 'amount')
  if (amount === 0) return 'Rp 0'
  if (amount < 0) return `Rp -${fromMinorUnits(-amount)}`
  return `Rp ${fromMinorUnits(amount)}`
}

/**
 * Accept both `.` and `,` as thousands separators; reject decimals, exponents,
 * signs, and any non-digit noise. A separator is treated as a thousands mark
 * only when followed by groups of exactly 3 digits to the end of the string;
 * otherwise the input is treated as a decimal and rejected.
 */
export function parseUserAmount(input: string): number {
  if (typeof input !== 'string') throw new MoneyParseError(String(input))
  const trimmed = input.trim()
  // Reject signs, exponents, currency words, whitespace inside.
  if (!/^[\d.,]+$/.test(trimmed) || trimmed === '') throw new MoneyParseError(input)
  // Mixed separators → ambiguous, reject.
  if (trimmed.includes('.') && trimmed.includes(',')) throw new MoneyParseError(input)

  const sep = trimmed.includes('.') ? '.' : trimmed.includes(',') ? ',' : ''
  if (sep) {
    const parts = trimmed.split(sep)
    // The head (first part) must be 1 to 3 digits, and every following
    // part must be exactly 3 digits. This rejects true decimal inputs
    // (a non-thousand tail length) while accepting full groupings.
    const [head = '', ...rest] = parts
    if (head.length === 0 || head.length > 3) throw new MoneyParseError(input)
    for (const p of rest) {
      if (p.length !== 3) throw new MoneyParseError(input)
    }
  }

  const digits = trimmed.replace(/[.,]/g, '')
  const n = Number(digits)
  if (n > MAX_SAFE) throw new MoneyOverflowError(n, 0, '+')
  return n
}

/**
 * Sum an array of integers. Empty array returns 0. No float drift.
 */
export function sumAmounts(amounts: ReadonlyArray<number>): number {
  let acc = 0
  for (const a of amounts) {
    acc = safeAdd(acc, a)
  }
  return acc
}

export function safeAdd(a: number, b: number): number {
  assertInteger(a, 'a')
  assertInteger(b, 'b')
  const result = a + b
  // Integer math: if both inputs are safe integers and sum exceeds MAX_SAFE,
  // result will be a non-safe integer (still representable as Number but unsafe).
  if (result > MAX_SAFE) throw new MoneyOverflowError(a, b, '+')
  return result
}

export function safeSub(a: number, b: number): number {
  assertInteger(a, 'a')
  assertInteger(b, 'b')
  const result = a - b
  if (result < -MAX_SAFE) throw new MoneyOverflowError(a, b, '-')
  return result
}

/**
 * Integer percentage 0..100. Denominator <= 0 → 0.
 * Uses integer division on (numerator * 10000) / denominator, then rounds.
 */
export function clampProgress(numerator: number, denominator: number): number {
  assertInteger(numerator, 'numerator')
  assertInteger(denominator, 'denominator')
  if (denominator <= 0) return 0
  if (numerator <= 0) return 0
  // Compute in tenths of a percent for accurate rounding, then clamp.
  const tenths = Math.floor((numerator * 1000) / denominator)
  const percent = Math.floor((tenths + 5) / 10)
  if (percent > 100) return 100
  return percent
}
