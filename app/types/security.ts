export type SecurityId = 'singleton'

export interface Security {
  id: SecurityId
  passwordHash: string
  salt: string
  iterations: number
  createdAt: number
  updatedAt: number
}
