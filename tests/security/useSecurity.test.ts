import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DB_NAME, resetDbForTesting } from '../../app/utils/db'
import { useSecurity } from '../../app/composables/useSecurity'

describe('useSecurity', () => {
  let db: ReturnType<typeof resetDbForTesting>
  beforeEach(() => {
    db = resetDbForTesting(`${DB_NAME}-test-security-${Math.random().toString(36).slice(2)}`)
  })
  afterEach(async () => {
    await db.delete()
  })

  it('exists() returns false initially', async () => {
    const { exists } = useSecurity()
    expect(await exists()).toBe(false)
  })

  it('create() persists a security row', async () => {
    const { create, exists } = useSecurity()
    await create('hunter2')
    expect(await exists()).toBe(true)
  })

  it('create() refuses a duplicate', async () => {
    const { create } = useSecurity()
    await create('hunter2')
    await expect(create('hunter3')).rejects.toThrow(/already exists/)
  })

  it('create() refuses empty password', async () => {
    const { create } = useSecurity()
    await expect(create('')).rejects.toThrow(/empty/)
  })

  it('change() verifies current, rotates salt, keeps record', async () => {
    const { create, change, exists } = useSecurity()
    await create('hunter2')
    const row1 = await db.security.get('singleton')
    const salt1 = row1?.salt

    await change('hunter2', 'new-pass-1')

    const row2 = await db.security.get('singleton')
    expect(row2?.salt).not.toBe(salt1)
    expect(row2?.passwordHash).not.toBe(row1?.passwordHash)
    expect(await exists()).toBe(true)
  })

  it('change() rejects wrong current password', async () => {
    const { create, change } = useSecurity()
    await create('hunter2')
    await expect(change('wrong', 'new-pass')).rejects.toThrow(/incorrect/)
  })

  it('change() rejects empty new password', async () => {
    const { create, change } = useSecurity()
    await create('hunter2')
    await expect(change('hunter2', '')).rejects.toThrow(/empty/)
  })

  it('reset() wipes all tables atomically', async () => {
    const { create, reset } = useSecurity()
    await create('hunter2')
    await db.companies.put({
      id: 'c' as never,
      name: 'x',
      shortName: 'X',
      currency: 'IDR',
      timezone: 'Asia/Jakarta',
      createdAt: 1,
      updatedAt: 1
    })
    await db.transactions.put({
      id: 't' as never,
      companyId: 'c' as never,
      type: 'CAPITAL',
      category: 'CAPITAL_INJECTION',
      amount: 1,
      transactionDate: 1,
      createdAt: 1,
      updatedAt: 1
    })
    expect(await db.companies.count()).toBe(1)
    expect(await db.transactions.count()).toBe(1)

    await reset()

    expect(await db.security.count()).toBe(0)
    expect(await db.companies.count()).toBe(0)
    expect(await db.transactions.count()).toBe(0)
    expect(await db.funds.count()).toBe(0)
    expect(await db.fundAllocations.count()).toBe(0)
    expect(await db.assets.count()).toBe(0)
    expect(await db.monthlyClosings.count()).toBe(0)
    expect(await db.settings.count()).toBe(0)
  })

  it('reset() rolls back when the work throws', async () => {
    const { create, reset } = useSecurity()
    await create('hunter2')
    const spy = vi.spyOn(db.companies, 'clear').mockImplementationOnce(() => {
      throw new Error('boom')
    })
    await expect(reset()).rejects.toThrow('boom')
    spy.mockRestore()
    expect(await db.security.count()).toBe(1)
  })
})
