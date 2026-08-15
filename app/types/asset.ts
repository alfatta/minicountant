import type { AssetId, CompanyId, Money } from './brand'

export type AssetCategory = 'HARDWARE' | 'NETWORKING' | 'STORAGE' | 'INFRASTRUCTURE' | 'OTHER'
export type AssetStatus = 'ACTIVE' | 'SOLD' | 'BROKEN' | 'RETIRED'

export interface Asset {
  id: AssetId
  companyId: CompanyId
  name: string
  category: AssetCategory
  purchaseDate: number
  purchasePrice: Money
  currentValue: Money
  status: AssetStatus
  purpose?: string
  description?: string
  createdAt: number
  updatedAt: number
}
