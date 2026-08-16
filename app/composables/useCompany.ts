import { useDb } from '~/utils/db'
import { repos } from '~/utils/repo'
import {
  CompanyInputSchema,
  CompanyPatchSchema,
  type CompanyInput,
  type CompanyParsed,
  type CompanyPatch
} from '~/domain/company.schema'
import { asCompanyId, type Company } from '~/types'

export class CompanyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CompanyError'
  }
}

const COMPANY_ID = asCompanyId('singleton')

export function useCompany() {
  async function current(): Promise<Company | null> {
    const row = await repos.companies.get(COMPANY_ID)
    return row ?? null
  }

  /**
   * Strict creation — refuses if a company already exists.
   * Must be called inside an onboarding flow; in normal app use the
   * middleware blocks routes while a company is missing.
   */
  async function create(input: CompanyInput): Promise<Company> {
    const parsed: CompanyParsed = CompanyInputSchema.parse(input)
    const db = useDb()
    let saved: Company | null = null
    await db.transaction('rw', [db.companies], async () => {
      const existing = await db.companies.get(COMPANY_ID)
      if (existing) throw new CompanyError('company already exists')
      const now = Date.now()
      const row: Company = {
        id: COMPANY_ID,
        name: parsed.name,
        shortName: parsed.shortName,
        currency: parsed.currency,
        timezone: parsed.timezone,
        ...(parsed.description !== undefined ? { description: parsed.description } : {}),
        createdAt: now,
        updatedAt: now
      }
      await db.companies.put(row)
      saved = row
    })
    if (!saved) throw new CompanyError('company create failed')
    return saved
  }

  /**
   * Partial update — currency is intentionally NOT updatable here.
   * `updatedAt` is refreshed automatically.
   */
  async function update(patch: CompanyPatch): Promise<Company> {
    const parsed = CompanyPatchSchema.parse(patch)
    const db = useDb()
    let saved: Company | null = null
    await db.transaction('rw', [db.companies], async () => {
      const existing = await db.companies.get(COMPANY_ID)
      if (!existing) throw new CompanyError('company does not exist')
      const now = Date.now()
      const next: Company = {
        ...existing,
        name: parsed.name,
        shortName: parsed.shortName,
        timezone: parsed.timezone,
        ...(parsed.description !== undefined
          ? { description: parsed.description }
          : { description: undefined }),
        updatedAt: now
      }
      await db.companies.put(next)
      saved = next
    })
    if (!saved) throw new CompanyError('company update failed')
    return saved
  }

  /**
   * Helper for the onboarding middleware. True when a `Company` row exists.
   */
  async function isReady(): Promise<boolean> {
    const row = await repos.companies.get(COMPANY_ID)
    return !!row
  }

  return { current, create, update, isReady }
}
