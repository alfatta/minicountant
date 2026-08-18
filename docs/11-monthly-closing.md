# 11 — Monthly Closing

## Tujuan
Snapshot bulanan untuk historical record. **Derived**, bukan sumber kebenaran — data asli tetap di ledger.

## Route

```
/monthly-closing
```

## Entity Shape

```ts
monthlyClosing = {
  id: string,
  companyId: string,
  month: number,             // 1-12
  year: number,
  openingCash: number,
  closingCash: number,
  capitalInjection: number,
  income: number,
  expenses: number,
  assetPurchases: number,
  assetValue: number,
  netWorth: number,
  closedAt?: number,         // null = belum final
  reopenedAt?: number,       // null = tidak pernah reopen
  notes?: string,
  createdAt: number,
  updatedAt: number,
}
```

## Alur

### Tutup Bulan

1. Pilih bulan (default: bulan sebelumnya yang belum ditutup).
2. Sistem hitung semua angka dari ledger.
3. Tampilkan preview:

```
[Closing: August 2026]

Opening Cash       Rp 2.000.000
Capital            Rp 500.000
Interest           Rp 1.842
Expenses           Rp 75.000
Asset Purchases    Rp 0
─────────────
Closing Cash       Rp 2.426.842
Asset Value        Rp 4.000.000
Net Worth          Rp 6.426.842

[Confirm Closing]
```

4. Simpan dengan `closedAt = now`.

### Reopen Bulan

1. Pilih bulan yang sudah ditutup.
2. Konfirmasi (perubahan data historis bisa misleading).
3. Set `closedAt = null`, `reopenedAt = now`.

## Constraints

- Hanya 1 closing per (year, month).
- Closing tidak mengunci transaksi di bulan itu — user tetap bisa input/edit (dengan reopen otomatis jika bulan sudah closed).
- Atau: transaksi di bulan closed → harus reopen dulu.

_(Pick salah satu; recommended: tetap boleh edit, closing sebagai snapshot. Reopen untuk revisi snapshot.)_

## Acceptance Criteria

- [x] Closing adalah snapshot derived, bukan sumber kebenaran.
- [x] Reopen berfungsi dengan audit trail.
- [x] Tidak ada double-closing untuk bulan yang sama.
- [x] List semua closing diurut by year-month desc.
