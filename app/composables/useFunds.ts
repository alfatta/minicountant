import { liveQuery } from 'dexie'
import { useDb } from '~/utils/db'
import { repos } from '~/utils/repo'
import {
  FundInputSchema,
  type FundInput,
  type FundParsed
} from '~/domain/fund.schema'
import { canDeleteFund, type FundPatch } from '~/domain/fund'
import { asCompanyId, asFundId, type Fund } from '~/types'

export class FundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FundError'
  }
}

function newFundId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `f-${crypto.randomUUID()}`
  }
  return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function useFunds() {
  const db = useDb()

  function list(companyId: string): Ref<Fund[]> {
    return liveQuery(() =>
      db.funds.where('companyId').equals(companyId).toArray()
    ) as unknown as Ref<Fund[]>
  }

  function byId(companyId: string, id: string): Ref<Fund | undefined> {
    return liveQuery(() => db.funds.get(id as never)) as unknown as Ref<Fund | undefined>
  }

  async function create(companyId: string, input: FundInput): Promise<Fund> {
    const parsed: FundParsed = FundInputSchema.parse(input)
    const now = Date.now()
    const row: Fund = {
      id: asFundId(newFundId()),
      companyId: asCompanyId(companyId),
      name: parsed.name,
      targetAmount: parsed.targetAmount as never,
      monthlyContribution: parsed.monthlyContribution as never,
      ...(parsed.targetDate !== undefined ? { targetDate: parsed.targetDate } : {}),
      status: parsed.status,
      type: parsed.type,
      ...(parsed.renewalInterval !== undefined ? { renewalInterval: parsed.renewalInterval } : {}),
      ...(parsed.nextRenewalDate !== undefined ? { nextRenewalDate: parsed.nextRenewalDate } : {}),
      ...(parsed.description !== undefined ? { description: parsed.description } : {}),
      createdAt: now,
      updatedAt: now
    }
    await db.transaction('rw', [db.funds], async () => {
      await db.funds.put(row)
    })
    return row
  }

  async function update(id: string, patch: FundPatch): Promise<Fund> {
    const db = useDb()
    let saved: Fund | null = null
    await db.transaction('rw', [db.funds], async () => {
      const existing = await db.funds.get(id as never)
      if (!existing) throw new FundError('fund not found')
      const now = Date.now()
      const next: Fund = {
        ...existing,
        ...patch,
        updatedAt: now
      }
      await db.funds.put(next)
      saved = next
    })
    if (!saved) throw new FundError('fund update failed')
    return saved
  }

  /**
   * Archive a fund. Refused if any transaction references it (we use
   * ARCHIVED as the soft-delete state and never silently lose history).
   */
  async function archive(id: string): Promise<Fund> {
    const db = useDb()
    let saved: Fund | null = null
    await db.transaction('rw', [db.funds, db.transactions], async () => {
      const existing = await db.funds.get(id as never)
      if (!existing) throw new FundError('fund not found')
      const refCount = await db.transactions.where('fundId').equals(id).count()
      if (refCount > 0) {
        throw new FundError(`fund has ${refCount} transaction reference(s); cannot archive`)
      }
      const now = Date.now()
      const next: Fund = { ...existing, status: 'ARCHIVED', updatedAt: now }
      await db.funds.put(next)
      saved = next
    })
    if (!saved) throw new FundError('fund archive failed')
    return saved
  }

  /**
   * Hard delete. Refused when there are any expense or allocation
   * references. Use `archive` otherwise.
   */
  async function deleteFund(id: string): Promise<void> {
    const db = useDb()
    await db.transaction('rw', [db.funds, db.transactions, db.fundAllocations], async () => {
      const existing = await db.funds.get(id as never)
      if (!existing) throw new FundError('fund not found')
      const txCount = await db.transactions.where('fundId').equals(id).count()
      const allocCount = await db.fundAllocations.where('fundId').equals(id).count()
      if (!canDeleteFund(txCount, allocCount)) {
        throw new FundError('fund has references; archive instead')
      }
      await db.funds.delete(id as never)
    })
  }

  async function countExpenseReferences(id: string): Promise<number> {
    return repos.transactions.table.where('fundId').equals(id).count()
  }

  async function countAllocationReferences(id: string): Promise<number> {
    return repos.fundAllocations.table.where('fundId').equals(id).count()
  }

  return {
    list,
    byId,
    create,
    update,
    archive,
    delete: deleteFund,
    countExpenseReferences,
    countAllocationReferences
  }
}
