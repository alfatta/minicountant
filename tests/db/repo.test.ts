import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type AppDB, DB_NAME, resetDbForTesting } from '../../app/utils/db'
import { dbTransaction, getRepo, repos } from '../../app/utils/repo'
import { asAssetId, asCompanyId, asFundId, asMoney, asTransactionId } from '../../app/types'
import type { Asset, Company, Fund, Transaction } from '../../app/types'

function freshDb(): AppDB {
  return resetDbForTesting(`${DB_NAME}-test-repo-${Math.random().toString(36).slice(2)}`)
}

const baseCompany = (): Company => ({
  id: asCompanyId('c1'),
  name: 'Acme',
  shortName: 'AC',
  currency: 'IDR',
  timezone: 'Asia/Jakarta',
  createdAt: 1,
  updatedAt: 1
})

const baseFund = (): Fund => ({
  id: asFundId('f1'),
  companyId: asCompanyId('c1'),
  name: 'Server',
  targetAmount: asMoney(5_000_000),
  monthlyContribution: asMoney(500_000),
  status: 'ACTIVE',
  type: 'RECURRING',
  createdAt: 1,
  updatedAt: 1
})

const baseTx = (): Transaction => ({
  id: asTransactionId('t1'),
  companyId: asCompanyId('c1'),
  type: 'CAPITAL',
  category: 'CAPITAL_INJECTION',
  amount: asMoney(1_000_000),
  transactionDate: 1,
  createdAt: 1,
  updatedAt: 1
})

const baseAsset = (): Asset => ({
  id: asAssetId('a1'),
  companyId: asCompanyId('c1'),
  name: 'Router',
  category: 'NETWORKING',
  purchaseDate: 1,
  purchasePrice: asMoney(2_000_000),
  currentValue: asMoney(2_000_000),
  status: 'ACTIVE',
  createdAt: 1,
  updatedAt: 1
})

describe('repo / getRepo CRUD', () => {
  let db: AppDB

  beforeEach(() => {
    db = freshDb()
  })
  afterEach(async () => {
    await db.delete()
  })

  it('put / get round-trip on a fresh table', async () => {
    const repo = getRepo<Company>(db.companies)
    await repo.put(baseCompany())
    const got = await repo.get('c1' as never)
    expect(got?.name).toBe('Acme')
  })

  it('all() returns every row', async () => {
    const repo = getRepo<Company>(db.companies)
    await repo.put({ ...baseCompany(), id: asCompanyId('a') })
    await repo.put({ ...baseCompany(), id: asCompanyId('b') })
    const rows = await repo.all()
    expect(rows).toHaveLength(2)
  })

  it('delete removes a row', async () => {
    const repo = getRepo<Company>(db.companies)
    await repo.put(baseCompany())
    await repo.delete('c1' as never)
    expect(await repo.get('c1' as never)).toBeUndefined()
  })

  it('bulkPut inserts many rows', async () => {
    const repo = getRepo<Fund>(db.funds)
    const rows = Array.from({ length: 10 }, (_, i) => ({
      ...baseFund(),
      id: asFundId(`f-${i}`)
    }))
    await repo.bulkPut(rows)
    expect(await repo.all()).toHaveLength(10)
  })

  it('where(field).equals(value) filters rows', async () => {
    const repo = getRepo<Transaction>(db.transactions)
    await repo.put(baseTx())
    await repo.put({ ...baseTx(), id: asTransactionId('t2'), companyId: asCompanyId('c2') })
    const rows = await repo.where('companyId').equals('c1')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.id).toBe('t1')
  })

  it('where(field).anyOf(values) filters rows', async () => {
    const repo = getRepo<Asset>(db.assets)
    await repo.put(baseAsset())
    await repo.put({ ...baseAsset(), id: asAssetId('a2') })
    const rows = await repo.where('id').anyOf(['a1', 'a2'])
    expect(rows).toHaveLength(2)
  })
})

describe('repo / dbTransaction', () => {
  let db: AppDB

  beforeEach(() => {
    db = freshDb()
  })
  afterEach(async () => {
    await db.delete()
  })

  it('commits writes inside an rw transaction', async () => {
    await dbTransaction('rw', [db.companies, db.funds], async () => {
      await db.companies.put(baseCompany())
      await db.funds.put(baseFund())
    })
    expect(await db.companies.count()).toBe(1)
    expect(await db.funds.count()).toBe(1)
  })

  it('rolls back writes when the function throws', async () => {
    await expect(dbTransaction('rw', [db.companies, db.funds], async () => {
      await db.companies.put(baseCompany())
      await db.funds.put(baseFund())
      throw new Error('boom')
    })).rejects.toThrow('boom')
    expect(await db.companies.count()).toBe(0)
    expect(await db.funds.count()).toBe(0)
  })
})

describe('repo / singletons', () => {
  let db: AppDB

  beforeEach(() => {
    db = freshDb()
  })
  afterEach(async () => {
    await db.delete()
  })

  it('repos.companies proxies to db.companies', async () => {
    await repos.companies.put(baseCompany())
    expect(await repos.companies.get('c1' as never)).toBeDefined()
  })

  it('every entity in repos is wired', () => {
    expect(repos.companies).toBeDefined()
    expect(repos.security).toBeDefined()
    expect(repos.funds).toBeDefined()
    expect(repos.fundAllocations).toBeDefined()
    expect(repos.transactions).toBeDefined()
    expect(repos.assets).toBeDefined()
    expect(repos.monthlyClosings).toBeDefined()
    expect(repos.settings).toBeDefined()
  })
})
