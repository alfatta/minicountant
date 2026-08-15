import type { ClosingId, CompanyId, Money } from './brand'

export interface MonthlyClosing {
  id: ClosingId
  companyId: CompanyId
  month: number
  year: number
  openingCash: Money
  closingCash: Money
  capitalInjection: Money
  income: Money
  expenses: Money
  assetPurchases: Money
  assetValue: Money
  netWorth: Money
  closedAt?: number
  reopenedAt?: number
  notes?: string
  createdAt: number
  updatedAt: number
}
