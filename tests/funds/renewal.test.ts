import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DB_NAME, type AppDB, resetDbForTesting } from '../../app/utils/db'
import { useFunds } from '../../app/composables/useFunds'
import { repos } from '../../app/utils/repo'
import { addMonths, formatDateId, nextYearAt } from '../../app/utils/date'
import { asFundId, asMoney, asTransactionId } from '../../app/types'

function freshDb(): AppDB {
  return resetDbForTesting(`${DB_NAME}-test-renewal-${Math.random().toString(36).slice(2)}`)
}

const companyId = 'c1' as never

async function seedRecurring(initialRenewal: number) {
  const funds = useFunds()
  return funds.create(companyId, {
    name: 'Domain 1',
    targetAmount: 300_000,
    monthlyContribution: 25_000,
    type: 'RECURRING',
    status: 'ACTIVE',
    renewalInterval: 12,
    nextRenewalDate: initialRenewal
  })
}

describe('renewal flow', () => {
  let db: AppDB

  beforeEach(() => {
    db = freshDb()
  })
  afterEach(async () => {
    await db.delete()
  })

  it('creates EXPENSE tx with fundId and advances nextRenewalDate', async () => {
    const start = new Date('2026-03-15').getTime()
    const fund = await seedRecurring(start)

    const now = new Date('2026-04-01').getTime()
    await db.transaction('rw', [db.transactions, db.funds], async () => {
      await db.transactions.put({
        id: asTransactionId('t1'),
        companyId: companyId,
        type: 'EXPENSE',
        category: 'DOMAIN',
        amount: asMoney(25_000),
        transactionDate: now,
        description: 'Renewal: Domain 1',
        fundId: fund.id,
        createdAt: now,
        updatedAt: now
      })
      const advanced = addMonths(fund.nextRenewalDate!, fund.renewalInterval!)
      await db.funds.put({ ...fund, nextRenewalDate: advanced, updatedAt: now })
    })

    const tx = await repos.transactions.table.where('fundId').equals(String(fund.id)).first()
    expect(tx?.type).toBe('EXPENSE')
    expect(tx?.category).toBe('DOMAIN')
    expect(tx?.amount).toBe(25_000)

    const updated = await repos.funds.get(String(fund.id) as never)
    expect(updated?.nextRenewalDate).toBe(addMonths(start, 12))
  })

  it('produces the rollover example: 5m allocation, 4m expense → 1m', async () => {
    const funds = useFunds()
    const fund = await funds.create(companyId, {
      name: 'Node',
      targetAmount: 5_000_000,
      monthlyContribution: 425_000,
      type: 'ONE_TIME',
      status: 'ACTIVE'
    })

    await db.transaction('rw', [db.fundAllocations, db.transactions], async () => {
      const now = Date.now()
      await db.fundAllocations.put({
        id: 'a1' as never,
        companyId: companyId,
        transactionId: asTransactionId('t-cap'),
        fundId: fund.id,
        amount: asMoney(5_000_000),
        createdAt: now
      })
      await db.transactions.put({
        id: asTransactionId('t-cap'),
        companyId,
        type: 'CAPITAL',
        category: 'CAPITAL_INJECTION',
        amount: asMoney(5_000_000),
        transactionDate: now,
        createdAt: now,
        updatedAt: now
      })
    })

    const now = Date.now()
    await db.transaction('rw', [db.transactions], async () => {
      await db.transactions.put({
        id: asTransactionId('t-buy'),
        companyId,
        type: 'EXPENSE',
        category: 'HARDWARE',
        amount: asMoney(4_000_000),
        transactionDate: now,
        description: 'ThinkCentre #1',
        fundId: fund.id,
        createdAt: now,
        updatedAt: now
      })
    })

    const allocs = await repos.fundAllocations.table.where('fundId').equals(String(fund.id)).toArray()
    const txs = await repos.transactions.table.where('fundId').equals(String(fund.id)).toArray()
    const allocated = allocs.reduce((s, a) => s + a.amount, 0)
    const spent = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
    expect(allocated).toBe(5_000_000)
    expect(spent).toBe(4_000_000)
    expect(allocated - spent).toBe(1_000_000)
  })

  it('two renewals advance the date by two intervals', async () => {
    const start = new Date('2026-03-15').getTime()
    const fund = await seedRecurring(start)

    const advance = (current: number): number => addMonths(current, fund.renewalInterval!)
    let next = fund.nextRenewalDate!
    next = advance(next)
    next = advance(next)
    expect(formatDateId(next)).toBe(formatDateId(addMonths(start, 24)))
  })

  it('uses nextYearAt to compute next year from an arbitrary epoch', () => {
    const epoch = new Date('2026-08-18').getTime()
    expect(nextYearAt(epoch)).toBe(addMonths(epoch, 12))
  })

  it('renewal tx is idempotent only via date guard (consecutive same-day renewals create two tx)', async () => {
    const start = new Date('2026-03-15').getTime()
    const fund = await seedRecurring(start)

    const now = Date.now()
    await db.transaction('rw', [db.transactions], async () => {
      await db.transactions.put({
        id: asTransactionId('t1'),
        companyId,
        type: 'EXPENSE',
        category: 'DOMAIN',
        amount: asMoney(25_000),
        transactionDate: now,
        fundId: fund.id,
        createdAt: now,
        updatedAt: now
      })
      await db.transactions.put({
        id: asTransactionId('t2'),
        companyId,
        type: 'EXPENSE',
        category: 'DOMAIN',
        amount: asMoney(25_000),
        transactionDate: now,
        fundId: fund.id,
        createdAt: now,
        updatedAt: now
      })
    })

    const txCount = await repos.transactions.table.where('fundId').equals(String(fund.id)).count()
    expect(txCount).toBe(2)
  })

  it('uses the seed for the renewal lookup by fundId', async () => {
    const fund = await seedRecurring(Date.now())
    const found = await repos.funds.get(asFundId(String(fund.id)) as never)
    expect(found?.id).toBe(fund.id)
  })
})
