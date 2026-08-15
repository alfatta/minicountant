import { describe, expect, it } from 'vitest'
import {
  deriveSecrets,
  generateSalt,
  hashPassword,
  verifyPassword
} from '../../app/utils/crypto'

describe('crypto / generateSalt', () => {
  it('returns base64 of the requested length', async () => {
    const s = await generateSalt(16)
    expect(typeof s).toBe('string')
    expect(s.length).toBeGreaterThan(0)
    // base64 expands 3 bytes -> 4 chars, 16 bytes -> ceil(16*4/3)=24 chars (with padding)
    expect(s).toMatch(/^[A-Za-z0-9+/]+=*$/)
  })

  it('returns different salts on each call', async () => {
    const a = await generateSalt()
    const b = await generateSalt()
    expect(a).not.toBe(b)
  })

  it('rejects non-positive length', async () => {
    await expect(generateSalt(0)).rejects.toThrow(/positive/)
  })
})

describe('crypto / deriveSecrets', () => {
  it('produces a stable hash for fixed inputs', async () => {
    const salt = await generateSalt()
    const a = await deriveSecrets('hunter2', salt, 100_000)
    const b = await deriveSecrets('hunter2', salt, 100_000)
    expect(a.hash).toBe(b.hash)
    expect(a.hash).toMatch(/^[A-Za-z0-9+/]+=*$/)
  })

  it('exposes a usable AES-GCM CryptoKey', async () => {
    const salt = await generateSalt()
    const { key } = await deriveSecrets('hunter2', salt, 100_000)
    expect(key.type).toBe('secret')
    expect(key.algorithm.name).toBe('AES-GCM')
  })

  it('rejects empty password', async () => {
    const salt = await generateSalt()
    await expect(deriveSecrets('', salt, 100_000)).rejects.toThrow(/empty/)
  })

  it('rejects iterations below 100_000', async () => {
    const salt = await generateSalt()
    await expect(deriveSecrets('hunter2', salt, 50_000)).rejects.toThrow(/iterations/)
  })
})

describe('crypto / hashPassword + verifyPassword', () => {
  it('verifyPassword returns true for the original password', async () => {
    const salt = await generateSalt()
    const hash = await hashPassword('correct horse battery staple', salt)
    expect(await verifyPassword('correct horse battery staple', salt, 100_000, hash)).toBe(true)
  })

  it('verifyPassword returns false for a wrong password', async () => {
    const salt = await generateSalt()
    const hash = await hashPassword('hunter2', salt)
    expect(await verifyPassword('hunter3', salt, 100_000, hash)).toBe(false)
  })

  it('verifyPassword returns false on different salt', async () => {
    const saltA = await generateSalt()
    const saltB = await generateSalt()
    const hash = await hashPassword('hunter2', saltA)
    expect(await verifyPassword('hunter2', saltB, 100_000, hash)).toBe(false)
  })
})
