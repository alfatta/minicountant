import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import onboardingMiddleware from '../../app/middleware/onboarding.global'
import { DB_NAME, resetDbForTesting } from '../../app/utils/db'
import { useCompany } from '../../app/composables/useCompany'

function callOnboarding(to: string): Promise<unknown> {
  const toRef = { path: to, fullPath: to } as unknown as Parameters<typeof onboardingMiddleware>[0]
  const fromRef = { path: '/', fullPath: '/' } as unknown as Parameters<typeof onboardingMiddleware>[1]
  return onboardingMiddleware(toRef, fromRef) as Promise<unknown>
}

describe('onboarding.global middleware', () => {
  let db: ReturnType<typeof resetDbForTesting>
  beforeEach(() => {
    db = resetDbForTesting(`${DB_NAME}-test-onboarding-${Math.random().toString(36).slice(2)}`)
  })
  afterEach(async () => {
    await db.delete()
  })

  it('allows /onboarding when no company exists', async () => {
    const result = await callOnboarding('/onboarding')
    expect(result).toBeUndefined()
  })

  it('redirects non-onboarding routes to /onboarding when no company', async () => {
    const result = await callOnboarding('/dashboard')
    expect(result).toBe('/onboarding')
  })

  it('redirects /onboarding to / when company already exists', async () => {
    await useCompany().create({
      name: 'Acme',
      shortName: 'AC',
      currency: 'IDR',
      timezone: 'Asia/Jakarta'
    })
    const result = await callOnboarding('/onboarding')
    expect(result).toBe('/')
  })

  it('allows non-onboarding routes when company exists', async () => {
    await useCompany().create({
      name: 'Acme',
      shortName: 'AC',
      currency: 'IDR',
      timezone: 'Asia/Jakarta'
    })
    const result = await callOnboarding('/dashboard')
    expect(result).toBeUndefined()
  })
})
