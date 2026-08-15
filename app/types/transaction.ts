import type { AssetId, CompanyId, FundId, Money, TransactionId } from './brand'

export type TxType
  = | 'CAPITAL'
    | 'INCOME'
    | 'EXPENSE'
    | 'ASSET_PURCHASE'
    | 'ASSET_SALE'
    | 'ADJUSTMENT'

export type Category
  = | 'CAPITAL_INJECTION'
    | 'INTEREST'
    | 'DOMAIN'
    | 'VPS'
    | 'HARDWARE'
    | 'SOFTWARE'
    | 'ELECTRICITY'
    | 'NETWORKING'
    | 'OTHER'

export interface Transaction {
  id: TransactionId
  companyId: CompanyId
  type: TxType
  category: Category
  amount: Money
  transactionDate: number
  description?: string
  fundId?: FundId
  assetId?: AssetId
  createdAt: number
  updatedAt: number
}
