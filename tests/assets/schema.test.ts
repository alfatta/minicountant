import { describe, expect, it } from 'vitest'
import {
  AssetInputSchema,
  AssetSaleSchema,
  activeAssetValue,
  canDeleteAsset,
  expenseCategoryForAssetCategory,
  netWorth,
  valueDelta
} from '../../app/domain/asset'
import type { Asset } from '../../app/types'
import { asMoney } from '../../app/types'

const now = Date.now()

function asset(partial: Partial<Asset> & { id: string }): Asset {
  return {
    companyId: 'c1' as never,
    name: 'ThinkCentre',
    category: 'HARDWARE',
    purchaseDate: now,
    purchasePrice: asMoney(4_000_000),
    currentValue: asMoney(4_000_000),
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
    ...partial
  }
}

describe('AssetInputSchema', () => {
  it('accepts a valid purchase input with defaults', () => {
    const parsed = AssetInputSchema.parse({
      name: 'ThinkCentre M720q',
      category: 'HARDWARE',
      purchaseDate: now,
      purchasePrice: 4_000_000
    })
    expect(parsed.name).toBe('ThinkCentre M720q')
    expect(parsed.status).toBe('ACTIVE')
    expect(parsed.currentValue).toBeUndefined()
    expect(parsed.description).toBeUndefined()
  })

  it('accepts an explicit currentValue distinct from purchasePrice', () => {
    const parsed = AssetInputSchema.parse({
      name: 'NAS',
      category: 'STORAGE',
      purchaseDate: now,
      purchasePrice: 5_000_000,
      currentValue: 3_000_000
    })
    expect(parsed.currentValue).toBe(3_000_000)
  })

  it('rejects a blank name', () => {
    expect(() => AssetInputSchema.parse({
      name: '   ',
      category: 'HARDWARE',
      purchaseDate: now,
      purchasePrice: 1
    })).toThrow()
  })

  it('rejects a name longer than 80 chars', () => {
    expect(() => AssetInputSchema.parse({
      name: 'x'.repeat(81),
      category: 'HARDWARE',
      purchaseDate: now,
      purchasePrice: 1
    })).toThrow()
  })

  it('rejects an unknown category', () => {
    expect(() => AssetInputSchema.parse({
      name: 'Widget',
      category: 'GADGETS',
      purchaseDate: now,
      purchasePrice: 1
    })).toThrow()
  })

  it('rejects a negative or non-integer purchase price', () => {
    expect(() => AssetInputSchema.parse({
      name: 'W', category: 'HARDWARE', purchaseDate: now, purchasePrice: -1
    })).toThrow()
    expect(() => AssetInputSchema.parse({
      name: 'W', category: 'HARDWARE', purchaseDate: now, purchasePrice: 1.5
    })).toThrow()
  })

  it('rejects a negative or non-integer current value', () => {
    expect(() => AssetInputSchema.parse({
      name: 'W', category: 'HARDWARE', purchaseDate: now, purchasePrice: 1, currentValue: -5
    })).toThrow()
    expect(() => AssetInputSchema.parse({
      name: 'W', category: 'HARDWARE', purchaseDate: now, purchasePrice: 1, currentValue: 0.5
    })).toThrow()
  })

  it('rejects a purchase date more than a day in the future', () => {
    expect(() => AssetInputSchema.parse({
      name: 'W', category: 'HARDWARE', purchaseDate: now + 3 * 86_400_000, purchasePrice: 1
    })).toThrow()
  })

  it('allows a purchase date one day ahead (timezone tolerance)', () => {
    expect(() => AssetInputSchema.parse({
      name: 'W', category: 'HARDWARE', purchaseDate: now + 86_400_000, purchasePrice: 1
    })).not.toThrow()
  })

  it('normalizes a blank description to undefined', () => {
    const parsed = AssetInputSchema.parse({
      name: 'W', category: 'OTHER', purchaseDate: now, purchasePrice: 1, description: '   '
    })
    expect(parsed.description).toBeUndefined()
  })

  it('rejects an unknown status', () => {
    expect(() => AssetInputSchema.parse({
      name: 'W', category: 'HARDWARE', purchaseDate: now, purchasePrice: 1, status: 'LOST'
    })).toThrow()
  })
})

describe('AssetSaleSchema', () => {
  it('accepts a positive integer sale price', () => {
    const parsed = AssetSaleSchema.parse({ salePrice: 3_500_000 })
    expect(parsed.salePrice).toBe(3_500_000)
    expect(parsed.saleDate).toBeUndefined()
  })

  it('rejects zero, negative, or non-integer sale prices', () => {
    expect(() => AssetSaleSchema.parse({ salePrice: 0 })).toThrow()
    expect(() => AssetSaleSchema.parse({ salePrice: -1 })).toThrow()
    expect(() => AssetSaleSchema.parse({ salePrice: 1.5 })).toThrow()
  })

  it('rejects a sale date in the future', () => {
    expect(() => AssetSaleSchema.parse({
      salePrice: 1, saleDate: now + 3 * 86_400_000
    })).toThrow()
  })
})

describe('selectors', () => {
  const assets = [
    asset({ id: 'a1', currentValue: asMoney(4_000_000) }),
    asset({ id: 'a2', currentValue: asMoney(1_000_000), status: 'SOLD' }),
    asset({ id: 'a3', currentValue: asMoney(999_999), status: 'BROKEN' }),
    asset({ id: 'a4', currentValue: asMoney(500_000), status: 'RETIRED' })
  ]

  it('activeAssetValue only sums ACTIVE assets', () => {
    expect(activeAssetValue(assets)).toBe(4_000_000)
  })

  it('activeAssetValue returns 0 for an empty list', () => {
    expect(activeAssetValue([])).toBe(0)
  })

  it('netWorth = cash + active asset value', () => {
    expect(netWorth(asMoney(1_000_000), assets)).toBe(5_000_000)
  })

  it('valueDelta is current − purchase (integer)', () => {
    expect(valueDelta(asset({
      id: 'a5',
      purchasePrice: asMoney(4_000_000),
      currentValue: asMoney(3_500_000)
    }))).toBe(-500_000)
  })

  it('canDeleteAsset requires zero references', () => {
    expect(canDeleteAsset(0)).toBe(true)
    expect(canDeleteAsset(1)).toBe(false)
  })

  it('expenseCategoryForAssetCategory maps fund-drain categories', () => {
    expect(expenseCategoryForAssetCategory('HARDWARE')).toBe('HARDWARE')
    expect(expenseCategoryForAssetCategory('STORAGE')).toBe('HARDWARE')
    expect(expenseCategoryForAssetCategory('INFRASTRUCTURE')).toBe('HARDWARE')
    expect(expenseCategoryForAssetCategory('NETWORKING')).toBe('NETWORKING')
    expect(expenseCategoryForAssetCategory('OTHER')).toBe('OTHER')
  })
})
