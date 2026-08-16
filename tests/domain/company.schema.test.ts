import { describe, expect, it } from 'vitest'
import { CompanyInputSchema, CompanyPatchSchema } from '../../app/domain/company.schema'

describe('CompanyInputSchema', () => {
  const base = {
    name: 'Acme',
    shortName: 'AC',
    currency: 'IDR' as const,
    timezone: 'Asia/Jakarta',
    description: undefined
  }

  it('accepts a valid input', () => {
    const r = CompanyInputSchema.parse(base)
    expect(r.shortName).toBe('AC')
    expect(r.description).toBeUndefined()
  })

  it('trims and uppercases shortName', () => {
    const r = CompanyInputSchema.parse({ ...base, shortName: '  ac1  ' })
    expect(r.shortName).toBe('AC1')
  })

  it('rejects empty name', () => {
    expect(() => CompanyInputSchema.parse({ ...base, name: '   ' })).toThrow()
  })

  it('rejects name over 100 chars', () => {
    expect(() => CompanyInputSchema.parse({ ...base, name: 'a'.repeat(101) })).toThrow()
  })

  it('rejects shortName under 2 chars', () => {
    expect(() => CompanyInputSchema.parse({ ...base, shortName: 'A' })).toThrow()
  })

  it('rejects shortName over 10 chars', () => {
    expect(() => CompanyInputSchema.parse({ ...base, shortName: 'A'.repeat(11) })).toThrow()
  })

  it('rejects non-alphanumeric shortName', () => {
    expect(() => CompanyInputSchema.parse({ ...base, shortName: 'A C' })).toThrow()
    expect(() => CompanyInputSchema.parse({ ...base, shortName: 'A-C' })).toThrow()
  })

  it('rejects non-IDR currency', () => {
    // @ts-expect-error invalid literal
    expect(() => CompanyInputSchema.parse({ ...base, currency: 'USD' })).toThrow()
  })

  it('normalises empty description to undefined', () => {
    const r = CompanyInputSchema.parse({ ...base, description: '   ' })
    expect(r.description).toBeUndefined()
  })

  it('rejects description over 500 chars', () => {
    expect(() => CompanyInputSchema.parse({ ...base, description: 'd'.repeat(501) })).toThrow()
  })
})

describe('CompanyPatchSchema', () => {
  it('does not accept currency', () => {
    // @ts-expect-error currency intentionally omitted from patch
    const r = CompanyPatchSchema.parse({
      name: 'Acme',
      shortName: 'AC',
      timezone: 'Asia/Jakarta'
    })
    expect(r.name).toBe('Acme')
  })
})
