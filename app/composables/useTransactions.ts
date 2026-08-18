import { ref } from 'vue'
import { liveQuery } from 'dexie'
import { useDb } from '~/utils/db'
import {
  TransactionInputSchema,
  type TransactionInputParsed
} from '~/domain/transaction'
import {
  asCompanyId,
  asTransactionId,
  type Transaction,
  type TransactionId
} from '~/types'

export class TransactionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TransactionError'
  }
}

export interface TransactionFilter {
  type?: Transaction['type'][]
  category?: Transaction['category'][]
  from?: number
  to?: number
  fundId?: string
}

function newTxId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `t-${crypto.randomUUID()}`
  }
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function matches(tx: Transaction, filter: TransactionFilter): boolean {
  if (filter.type && filter.type.length > 0 && !filter.type.includes(tx.type)) return false
  if (filter.category && filter.category.length > 0 && !filter.category.includes(tx.category)) return false
  if (filter.from !== undefined && tx.transactionDate < filter.from) return false
  if (filter.to !== undefined && tx.transactionDate > filter.to) return false
  if (filter.fundId && tx.fundId !== filter.fundId) return false
  return true
}

/**
 * Transactions composable — single Dexie `liveQuery` over the company
 * ledger, with a client-side filter applied on each emission. Mutations
 * validate via Zod before writing so the domain cannot be bypassed.
 */
export function useTransactions(getCompanyId: () => string, getFilter: () => TransactionFilter = () => ({})) {
  const db = useDb()
  const list = ref<Transaction[]>([])
  const isLoading = ref(true)
  const error = ref<Error | null>(null)

  const rawQuery = () =>
    db.transactions
      .where('companyId')
      .equals(getCompanyId())
      .toArray()

  const applyFilter = (rows: Transaction[]): Transaction[] => {
    const f = getFilter()
    return rows
      .filter(t => matches(t, f))
      .sort((a, b) => b.transactionDate - a.transactionDate || String(b.id).localeCompare(String(a.id)))
  }

  let subscription: { unsubscribe: () => void } | null = null

  function start() {
    if (subscription) subscription.unsubscribe()
    const observable = liveQuery(async () => rawQuery())
    subscription = observable.subscribe({
      next: (rows) => {
        list.value = applyFilter(rows)
        isLoading.value = false
      },
      error: (err) => {
        error.value = err instanceof Error ? err : new Error(String(err))
        isLoading.value = false
      }
    })
  }

  function stop() {
    subscription?.unsubscribe()
    subscription = null
  }

  // Reactive listing requires calling `start()` (from a page/component setup)
  // so `onMounted`/`onScopeDispose` stay bound to a component instance.
  // `create`/`update`/`remove` work standalone for quick-add and tests.

  async function create(input: Record<string, unknown>): Promise<Transaction> {
    const parsed: TransactionInputParsed = TransactionInputSchema.parse(input)
    const now = Date.now()
    const row: Transaction = {
      id: asTransactionId(newTxId()),
      companyId: asCompanyId(getCompanyId()),
      type: parsed.type,
      category: parsed.category,
      amount: parsed.amount as never,
      transactionDate: parsed.transactionDate,
      ...(parsed.description !== undefined ? { description: parsed.description } : {}),
      ...(parsed.fundId !== undefined ? { fundId: parsed.fundId as never } : {}),
      ...(parsed.assetId !== undefined ? { assetId: parsed.assetId as never } : {}),
      createdAt: now,
      updatedAt: now
    }
    await db.transaction('rw', [db.transactions], async () => {
      await db.transactions.put(row)
    })
    return row
  }

  async function update(id: TransactionId, patch: Record<string, unknown>): Promise<Transaction> {
    let saved: Transaction | null = null
    await db.transaction('rw', [db.transactions], async () => {
      const existing = await db.transactions.get(id as never)
      if (!existing) throw new TransactionError('transaction not found')
      const next: Transaction = { ...existing, ...patch, updatedAt: Date.now() }
      // Validate the merged row against the input schema.
      TransactionInputSchema.parse({
        type: next.type,
        category: next.category,
        amount: next.amount,
        transactionDate: next.transactionDate,
        description: next.description,
        fundId: next.fundId ? String(next.fundId) : undefined,
        assetId: next.assetId ? String(next.assetId) : undefined
      })
      await db.transactions.put(next)
      saved = next
    })
    if (!saved) throw new TransactionError('transaction update failed')
    return saved
  }

  async function remove(id: TransactionId): Promise<void> {
    await db.transaction('rw', [db.transactions], async () => {
      const existing = await db.transactions.get(id as never)
      if (!existing) throw new TransactionError('transaction not found')
      await db.transactions.delete(id as never)
    })
  }

  return { list, error, isLoading, create, update, remove, start, stop }
}

export type UseTransactionsReturn = ReturnType<typeof useTransactions>
