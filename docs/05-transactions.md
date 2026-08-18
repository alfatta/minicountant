# 05 — Transactions

## Tujuan
Ledger utama — setiap perubahan uang masuk/keluar tercatat di sini. **Sumber kebenaran** untuk cash balance.

## Entity Shape

```ts
transaction = {
  id: string,
  companyId: string,
  type: 'CAPITAL' | 'INCOME' | 'EXPENSE' | 'ASSET_PURCHASE' | 'ASSET_SALE' | 'ADJUSTMENT',
  category: string,             // extensible enum
  amount: number,               // minor units (positive integer)
  transactionDate: number,      // epoch ms
  description?: string,
  fundId?: string,              // opsional, terkait fund (recurring expense)
  assetId?: string,             // opsional, terkait asset (purchase/sale)
  createdAt: number,
  updatedAt: number,
}
```

## Transaction Types

| Type            | Pengaruh ke Cash | Pengaruh ke Capital | Pengaruh ke Asset |
| --------------- | ---------------- | ------------------- | ----------------- |
| CAPITAL         | +                | +                   | -                 |
| INCOME          | +                | -                   | -                 |
| EXPENSE         | -                | -                   | -                 |
| ASSET_PURCHASE  | -                | -                   | +                 |
| ASSET_SALE      | +                | -                   | -                 |
| ADJUSTMENT      | +/-              | +/-                 | -                 |

## Categories (Initial)

```
CAPITAL_INJECTION  (untuk type=CAPITAL)
INTEREST           (untuk type=INCOME)
DOMAIN             (untuk type=EXPENSE)
VPS                (untuk type=EXPENSE)
HARDWARE           (untuk type=EXPENSE)
SOFTWARE           (untuk type=EXPENSE)
ELECTRICITY        (untuk type=EXPENSE)
NETWORKING         (untuk type=EXPENSE)
OTHER              (untuk semua type)
```

**Categories extensible** — di masa depan bisa ditambah user-defined.

## Validation Rules (Domain Layer)

1. **Amount wajib**:
   - `> 0` untuk semua type kecuali `ADJUSTMENT`.
   - `ADJUSTMENT` boleh negatif untuk koreksi.
   - Wajib integer.

2. **Type ↔ Category consistency** (MVP, soft validation):
   - `CAPITAL` → umumnya `CAPITAL_INJECTION`.
   - `INCOME` → umumnya `INTEREST`.
   - `EXPENSE` → `DOMAIN`/`VPS`/dll.
   - Boleh longgar (OTHER selalu valid).

3. **Date**:
   - Tidak boleh di masa depan lebih dari `today + 1 hari` (toleransi zona waktu).
   - Wajib epoch ms.

4. **fundId / assetId**:
   - `fundId` hanya untuk `EXPENSE` (recurring expenses).
   - `assetId` hanya untuk `ASSET_PURCHASE` / `ASSET_SALE`.
   - Wajib valid reference atau null.

5. **description**:
   - Optional.
   - Max 500 char.

## Derived Values

### Cash Balance

```
cash = Σ amount untuk type ∈ {CAPITAL, INCOME, ASSET_SALE, positive ADJUSTMENT}
     - Σ amount untuk type ∈ {EXPENSE, ASSET_PURCHASE, negative ADJUSTMENT}
```

### Total Capital

```
totalCapital = Σ amount untuk type = CAPITAL
```

### Total Interest

```
totalInterest = Σ amount untuk type = INCOME AND category = INTEREST
```

### Operating Expenses

```
opEx = Σ amount untuk type = EXPENSE
```

### Asset Value (Total)

```
assetValue = Σ currentValue untuk asset.status = ACTIVE atau SOLD (last known)
```
_(lihat 08-assets untuk detail)_

## UX Rules

- Quick-add modal untuk interest & capital (≤ 3 tap).
- List transactions: card (mobile) / table (desktop).
- Filter by type, category, date range, fund.
- Default sort: newest first.
- Pagination / virtual scroll untuk ribuan entry.

## Edge Cases

| Situasi                                | Handling                                     |
| -------------------------------------- | -------------------------------------------- |
| Edit transaction                       | Recompute semua derived values               |
| Delete transaction                     | Sama — recompute                             |
| Amount = 0                             | Tolak di domain layer                        |
| Transaction terkait fund yang dihapus | Cegah delete fund jika ada tx reference       |
| Future date                             | Tolak atau konfirmasi                        |

## Acceptance Criteria

- [x] Tidak ada duplikasi balance di storage (semua derived).
- [x] Create/edit/delete satu tx → semua metric update.
- [x] Filter & sort berfungsi di ribuan entries.
- [x] Validation gagal → tampilkan error friendly, tidak crash.
- [x] Domain validation tidak bypass-able dari UI.
