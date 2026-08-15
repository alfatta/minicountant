import type { CompanyId, FundId, Money } from './brand'

export type FundType = 'ONE_TIME' | 'RECURRING'
export type FundStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED'

export interface Fund {
  id: FundId
  companyId: CompanyId
  name: string
  targetAmount: Money
  monthlyContribution: Money
  targetDate?: number
  status: FundStatus
  type: FundType
  renewalInterval?: number
  nextRenewalDate?: number
  description?: string
  createdAt: number
  updatedAt: number
}
