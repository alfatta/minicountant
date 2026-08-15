import { describe, expect, it } from 'vitest'
import lockMiddleware from '../../app/middleware/lock.global'
import { useLock } from '../../app/composables/useLock'

function callLock(to: string) {
  const toRef = { path: to, fullPath: to } as unknown as Parameters<typeof lockMiddleware>[0]
  // The middleware signature is (to, from). Pass a minimal from.
  const fromRef = { path: '/', fullPath: '/' } as unknown as Parameters<typeof lockMiddleware>[1]
  return lockMiddleware(toRef, fromRef)
}

describe('lock.global middleware', () => {
  it('allows /lock', () => {
    useLock().lock()
    expect(callLock('/lock')).toBeUndefined()
  })

  it('allows /onboarding', () => {
    useLock().lock()
    expect(callLock('/onboarding')).toBeUndefined()
  })

  it('allows /onboarding/anything', () => {
    useLock().lock()
    expect(callLock('/onboarding/step-1')).toBeUndefined()
  })

  it('redirects to /lock when state is LOCKED and route is protected', () => {
    const lock = useLock()
    lock.lock()
    const result = callLock('/dashboard')
    expect(result).toBeDefined()
    // navigateTo returns a route location descriptor
    const r = result as { path: string, query?: Record<string, string> }
    expect(r.path).toBe('/lock')
    expect(r.query?.redirect).toBe('/dashboard')
  })

  it('does not redirect when state is UNLOCKED', () => {
    const lock = useLock()
    lock._resetForTesting()
    // Force UNLOCKED for the middleware check only (test-only escape hatch).
    lock.state.value = 'UNLOCKED'
    expect(callLock('/dashboard')).toBeUndefined()
    lock.lock() // reset for next test
  })
})
