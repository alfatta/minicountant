import type { CompanyId } from './brand'

export type Currency = 'IDR'

export interface Company {
  id: CompanyId
  name: string
  shortName: string
  currency: Currency
  timezone: string
  description?: string
  createdAt: number
  updatedAt: number
}
