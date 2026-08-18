import { liveQuery } from 'dexie'
import { useDb } from '~/utils/db'
import {
  byYearMonthDesc,
  closingKey,
  computeClosingSnapshot,
  isClosed,
  type ClosingSnapshot
} from '~/domain/monthlyClosing'
import { asClosingId, asCompanyId, type Asset, type MonthlyClosing, type Transaction } from '~/types'

export class ClosingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ClosingError'
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `m-${crypto.randomUUID()}`
  }
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Monthly Closing composable (Phase 9).
 *
 * - `preview` computes the snapshot in-memory (no write) so the user can
 *   review before confirming.
 * - `close` persists the snapshot with `closedAt = now` — refused if a
 *   closing for the same (year, month) already exists.
 * - `reopen` sets `closedAt = null` and `reopenedAt = now` so the audit
 *   trail records the revision.
 */
export function useMonthlyClosing() {
  const db = useDb()

  function list(companyId: string) {
    return liveQuery(() =>
      db.monthlyClosings
        .where('companyId')
        .equals(companyId)
        .toArray()
        .then(rows => rows.sort(byYearMonthDesc))
    ) as unknown as Ref<MonthlyClosing[]>
  }

  async function get(companyId: string, year: number, month: number): Promise<MonthlyClosing | null> {
    const rows = await db.monthlyClosings
      .where('[year+month]')
      .equals([year, month])
      .toArray()
    return rows.find(r => r.companyId === companyId) ?? null
  }

  function preview(
    companyId: string,
    year: number,
    month: number,
    transactions: ReadonlyArray<Transaction>,
    assets: ReadonlyArray<Asset>
  ): ClosingSnapshot {
    return computeClosingSnapshot(year, month, transactions, assets)
  }

  async function close(
    companyId: string,
    snapshot: ClosingSnapshot,
    notes?: string
  ): Promise<MonthlyClosing> {
    const existing = await get(companyId, snapshot.year, snapshot.month)
    if (existing && isClosed(existing)) {
      throw new ClosingError(
        closingKey(companyId, snapshot.year, snapshot.month)
        + ' is already closed — reopen first'
      )
    }

    const now = Date.now()
    const row: MonthlyClosing = {
      id: asClosingId(newId()),
      companyId: asCompanyId(companyId),
      month: snapshot.month,
      year: snapshot.year,
      openingCash: snapshot.openingCash,
      closingCash: snapshot.closingCash,
      capitalInjection: snapshot.capitalInjection,
      income: snapshot.income,
      expenses: snapshot.expenses,
      assetPurchases: snapshot.assetPurchases,
      assetValue: snapshot.assetValue,
      netWorth: snapshot.netWorth,
      closedAt: now,
      ...(notes && notes.trim().length > 0 ? { notes: notes.trim() } : {}),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }

    await db.monthlyClosings.put(row)
    return row
  }

  async function reopen(id: string): Promise<MonthlyClosing> {
    const existing = await db.monthlyClosings.get(id as never)
    if (!existing) throw new ClosingError('closing not found')
    if (!isClosed(existing)) throw new ClosingError('closing is not closed')

    const now = Date.now()
    const next: MonthlyClosing = {
      ...existing,
      closedAt: undefined,
      reopenedAt: now,
      updatedAt: now
    }
    await db.monthlyClosings.put(next)
    return next
  }

  return { list, get, preview, close, reopen }
}
