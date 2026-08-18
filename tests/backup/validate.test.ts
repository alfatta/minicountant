import { describe, expect, it } from 'vitest'
import { validateBackup, parseBackup, SUPPORTED_VERSIONS } from '../../app/utils/backup.validate'
import { BACKUP_FORMAT, BACKUP_VERSION, type BackupFile } from '../../app/types'

function validBackup(overrides: Partial<BackupFile> = {}): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: '2026-08-15T10:00:00Z',
    appVersion: '0.1.0',
    company: null,
    security: null,
    funds: [],
    fundAllocations: [],
    transactions: [],
    assets: [],
    monthlyClosings: [],
    settings: null,
    ...overrides
  }
}

describe('validateBackup', () => {
  it('accepts a valid empty backup', () => {
    const r = validateBackup(validBackup())
    expect(r.ok).toBe(true)
    expect(r.errors).toEqual([])
  })

  it('rejects a non-object root', () => {
    const r = validateBackup('not-an-object')
    expect(r.ok).toBe(false)
    expect(r.errors.some(e => e.includes('JSON object'))).toBe(true)
  })

  it('rejects a wrong format field', () => {
    const r = validateBackup(validBackup({ format: 'something-else' as never }))
    expect(r.ok).toBe(false)
    expect(r.errors.some(e => e.includes('format'))).toBe(true)
  })

  it('rejects a non-integer version', () => {
    const r = validateBackup(validBackup({ version: 1.5 as never }))
    expect(r.ok).toBe(false)
    expect(r.errors.some(e => e.includes('integer'))).toBe(true)
  })

  it('rejects a newer backup version with an upgrade hint', () => {
    const r = validateBackup(validBackup({ version: 99 as never }))
    expect(r.ok).toBe(false)
    expect(r.errors.some(e => e.includes('newer'))).toBe(true)
  })

  it('rejects a non-array table', () => {
    const bad = validBackup()
    ;(bad as { transactions: unknown }).transactions = null
    const r = validateBackup(bad)
    expect(r.ok).toBe(false)
    expect(r.errors.some(e => e.includes('"transactions" must be an array'))).toBe(true)
  })

  it('accepts empty arrays', () => {
    const r = validateBackup(validBackup({
      funds: [],
      transactions: [],
      assets: []
    }))
    expect(r.ok).toBe(true)
  })

  it('supports version 1 only (MVP)', () => {
    expect(SUPPORTED_VERSIONS).toContain(1)
  })
})

describe('parseBackup', () => {
  it('parses valid JSON into a BackupFile', () => {
    const text = JSON.stringify(validBackup())
    const parsed = parseBackup(text)
    expect(parsed.format).toBe(BACKUP_FORMAT)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseBackup('{not json')).toThrow('not valid JSON')
  })

  it('throws with the first validation error', () => {
    const bad = validBackup({ format: 'wrong' as never })
    expect(() => parseBackup(JSON.stringify(bad))).toThrow('invalid backup')
  })
})
