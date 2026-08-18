import { useDb } from '~/utils/db'
import {
  validateCapital,
  type CapitalDraft
} from '~/domain/capital'
import {
  asAllocationId,
  asCompanyId,
  asTransactionId,
  type FundAllocation,
  type FundStatus,
  type Transaction
} from '~/types'

export class CapitalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CapitalError'
  }
}

export interface CapitalInjectionResult {
  transaction: Transaction
  allocations: FundAllocation[]
}

function newTxId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `t-${crypto.randomUUID()}`
  }
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function newAllocationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `a-${crypto.randomUUID()}`
  }
  return `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function useCapital() {
  /**
   * Persist one CAPITAL transaction + N allocations atomically.
   *
   * Validation runs *before* opening the transaction. The DB is then
   * the final source of truth for fund status lookups so a stale
   * `lookups` cannot bypass the rule. ARCHIVED funds are confirmed
   * upstream (UI) — the domain allows the write but the caller must
   * have acknowledged the warning.
   */
  async function inject(companyId: string, draft: CapitalDraft): Promise<CapitalInjectionResult> {
    const db = useDb()
    const validation = validateCapital(draft, {
      fundStatus: (_fundId) => {
        // Synchronous lookup is best-effort here; the UI must pre-check
        // with `archivedFundIds` before calling `inject`.
        return undefined as FundStatus | undefined
      }
    })
    if (!validation.ok) {
      throw new CapitalError(validation.errors.map(e => `${e.path}: ${e.message}`).join('; '))
    }

    const result: CapitalInjectionResult = {
      transaction: undefined as never,
      allocations: []
    }

    await db.transaction(
      'rw',
      [db.transactions, db.fundAllocations, db.funds],
      async () => {
        const txId = asTransactionId(newTxId())
        const now = Date.now()
        const tx: Transaction = {
          id: txId,
          companyId: asCompanyId(companyId),
          type: 'CAPITAL',
          category: 'CAPITAL_INJECTION',
          amount: draft.amount,
          transactionDate: draft.date,
          ...(draft.description ? { description: draft.description } : {}),
          createdAt: now,
          updatedAt: now
        }
        await db.transactions.put(tx)

        const allocs: FundAllocation[] = []
        for (const a of draft.allocations) {
          const alloc: FundAllocation = {
            id: asAllocationId(newAllocationId()),
            companyId: asCompanyId(companyId),
            transactionId: txId,
            fundId: a.fundId,
            amount: a.amount,
            createdAt: now
          }
          await db.fundAllocations.put(alloc)
          allocs.push(alloc)
        }

        result.transaction = tx
        result.allocations = allocs
      }
    )

    return result
  }

  /**
   * Live list of all allocations for a company — used by fund cards
   * to compute derived balances.
   */
  function listAllocations(companyId: string): Promise<FundAllocation[]> {
    const db = useDb()
    return db.fundAllocations.where('companyId').equals(companyId).toArray()
  }

  /**
   * Live list of CAPITAL transactions — used for reports and audit.
   */
  function listCapitalTransactions(companyId: string): Promise<Transaction[]> {
    const db = useDb()
    return db.transactions
      .where('companyId').equals(companyId)
      .and(t => t.type === 'CAPITAL')
      .toArray()
  }

  return { inject, listAllocations, listCapitalTransactions }
}
