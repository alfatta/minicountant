import { describe, expect, it } from 'vitest'
import { escapeField, toCsv } from '../../app/utils/csv'

describe('toCsv', () => {
  it('joins rows with CRLF and fields with comma', () => {
    expect(toCsv([['a', 'b'], ['c', 'd']])).toBe('a,b\r\nc,d')
  })

  it('renders numbers as strings', () => {
    expect(toCsv([['n', 1, 2_500_000]])).toBe('n,1,2500000')
  })

  it('handles empty input', () => {
    expect(toCsv([])).toBe('')
  })
})

describe('escapeField', () => {
  it('passes through simple values', () => {
    expect(escapeField('hello')).toBe('hello')
    expect(escapeField(42)).toBe('42')
  })

  it('quotes fields containing a comma', () => {
    expect(escapeField('a,b')).toBe('"a,b"')
  })

  it('quotes fields containing a double quote and escapes it', () => {
    expect(escapeField('say "hi"')).toBe('"say ""hi"""')
  })

  it('quotes fields containing a newline', () => {
    expect(escapeField('line1\nline2')).toBe('"line1\nline2"')
  })

  it('quotes fields containing a carriage return', () => {
    expect(escapeField('a\rb')).toBe('"a\rb"')
  })
})
