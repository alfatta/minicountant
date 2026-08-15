import { describe, it, expect } from 'vitest'

describe('phase 0 smoke', () => {
  it('vitest is wired up', () => {
    expect(1 + 1).toBe(2)
  })

  it('fake-indexeddb is available in setup', () => {
    expect(typeof indexedDB).toBe('object')
    expect(indexedDB).not.toBeNull()
    expect(typeof indexedDB.open).toBe('function')
  })
})
