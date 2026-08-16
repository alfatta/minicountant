import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DB_NAME, resetDbForTesting } from '../../app/utils/db'
import { useCompany } from '../../app/composables/useCompany'
import { asCompanyId } from '../../app/types'

describe('useCompany', () => {
  let db: ReturnType<typeof resetDbForTesting>
  beforeEach(() => {
    db = resetDbForTesting(`${DB_NAME}-test-company-${Math.random().toString(36).slice(2)}`)
  })
  afterEach(async () => {
    await db.delete()
  })

  it('current() returns null when no company exists', async () => {
    const { current } = useCompany()
    expect(await current()).toBeNull()
  })

  it('create() persists the singleton row', async () => {
    const { create, current } = useCompany()
    await create({
      name: 'Acme',
      shortName: 'AC',
      currency: 'IDR',
      timezone: 'Asia/Jakarta'
    })
    const co = await current()
    expect(co).not.toBeNull()
    expect(co?.name).toBe('Acme')
    expect(co?.shortName).toBe('AC')
    expect(co?.currency).toBe('IDR')
  })

  it('create() refuses a duplicate', async () => {
    const { create } = useCompany()
    await create({
      name: 'Acme',
      shortName: 'AC',
      currency: 'IDR',
      timezone: 'Asia/Jakarta'
    })
    await expect(create({
      name: 'Other',
      shortName: 'OT',
      currency: 'IDR',
      timezone: 'Asia/Jakarta'
    })).rejects.toThrow(/exists/)
  })

  it('create() uppercases shortName and trims fields', async () => {
    const { create, current } = useCompany()
    await create({
      name: '  Acme  ',
      shortName: '  ac ',
      currency: 'IDR',
      timezone: 'Asia/Jakarta'
    })
    const co = await current()
    expect(co?.name).toBe('Acme')
    expect(co?.shortName).toBe('AC')
  })

  it('create() normalises blank description to undefined', async () => {
    const { create, current } = useCompany()
    await create({
      name: 'Acme',
      shortName: 'AC',
      currency: 'IDR',
      timezone: 'Asia/Jakarta',
      description: '   '
    })
    const co = await current()
    expect(co?.description).toBeUndefined()
  })

  it('update() bumps updatedAt and patches editable fields', async () => {
    const { create, update, current } = useCompany()
    await create({
      name: 'Acme',
      shortName: 'AC',
      currency: 'IDR',
      timezone: 'Asia/Jakarta'
    })
    const before = await current()
    await new Promise(r => setTimeout(r, 5))
    await update({
      name: 'Acme 2',
      shortName: 'A2',
      timezone: 'Asia/Makassar'
    })
    const after = await current()
    expect(after?.name).toBe('Acme 2')
    expect(after?.shortName).toBe('A2')
    expect(after?.timezone).toBe('Asia/Makassar')
    expect((after?.updatedAt ?? 0) > (before?.updatedAt ?? 0)).toBe(true)
  })

  it('update() refuses when no company exists', async () => {
    const { update } = useCompany()
    await expect(update({
      name: 'x',
      shortName: 'XX',
      timezone: 'Asia/Jakarta'
    })).rejects.toThrow(/exist/)
  })

  it('isReady() reflects company presence', async () => {
    const { isReady, create } = useCompany()
    expect(await isReady()).toBe(false)
    await create({
      name: 'Acme',
      shortName: 'AC',
      currency: 'IDR',
      timezone: 'Asia/Jakarta'
    })
    expect(await isReady()).toBe(true)
  })

  it('uses the singleton id', async () => {
    const { create, current } = useCompany()
    await create({
      name: 'Acme',
      shortName: 'AC',
      currency: 'IDR',
      timezone: 'Asia/Jakarta'
    })
    const co = await current()
    expect(co?.id).toBe(asCompanyId('singleton'))
  })
})
