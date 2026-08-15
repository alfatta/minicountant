# 07 — Funds

## Tujuan
Fund = **target tabungan / alokasi dana** untuk tujuan tertentu (beli Node, bayar Domain, dll). Saldo selalu **derived** dari ledger.

## Entity Shape

```ts
fund = {
  id: string,
  companyId: string,
  name: string,
  targetAmount: number,           // minor units
  monthlyContribution: number,    // minor units, target bulanan
  targetDate?: number,            // epoch ms, opsional
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED',
  type: 'ONE_TIME' | 'RECURRING',
  renewalInterval?: number,       // bulan, untuk RECURRING
  nextRenewalDate?: number,       // epoch ms, untuk RECURRING
  description?: string,
  createdAt: number,
  updatedAt: number,
}
```

## Tipe Fund

| Type       | Contoh               | Renewal Logic                                      |
| ---------- | -------------------- | -------------------------------------------------- |
| ONE_TIME   | Node, Storage, NAS   | Tidak ada renewal. Target = jumlah penuh.          |
| RECURRING  | Domain, VPS          | Renewal interval (mis. 12 bulan), expense otomatis.|

## Status

| Status     | Arti                                                |
| ---------- | --------------------------------------------------- |
| ACTIVE     | Aktif, menerima alokasi & expense                  |
| PAUSED     | Tidak menerima alokasi baru                        |
| COMPLETED  | Target tercapai (auto atau manual)                 |
| ARCHIVED   | Disembunyikan dari UI, data tetap ada              |

## Default Funds (Onboarding)

```
Domain 1   Target 300.000   Monthly 25.000   RECURRING   ACTIVE
Domain 2   Target 300.000   Monthly 25.000   RECURRING   ACTIVE
VPS        Target 300.000   Monthly 25.000   RECURRING   ACTIVE
Node       Target 5.000.000 Monthly 425.000  ONE_TIME    ACTIVE
```

Total monthly: **Rp 500.000**.

## Fund Balance (Derived — SATU-SATUNYA sumber kebenaran)

```
fundBalance(fund) = 
    Σ fundAllocation.amount WHERE fundId = fund
  - Σ expense.amount WHERE fundId = fund
```

**Tidak ada kolom `balance` di tabel fund**. Semua dihitung on-the-fly / cached invalidation.

## Progress (Display)

```
progress = clamp(0..100, round(fundBalance / targetAmount * 100))
```

- Clamp 0..100 untuk display.
- 0 jika `targetAmount = 0`.

## Recurring Fund Behavior

### Saat Pembayaran Renewal

User trigger "Pay Renewal" atau auto-trigger dari cron-like logic.

**Flow:**
1. Buat transaction:
   ```
   type = EXPENSE
   category = DOMAIN atau VPS
   amount = targetAmount (atau amount yang dibayar)
   fundId = fund.id
   ```
2. Kurangi fund balance (otomatis via rumus di atas).
3. Advance `nextRenewalDate` = `current + renewalInterval * 30 days` (atau calendar month +N).
4. Update status fund jika perlu (`COMPLETED` jika target lunas di tengah siklus — opsional).

### Renewal Interval

- Disimpan dalam **bulan**.
- Contoh: 12 = 1 tahun.
- Bisa custom (1, 3, 6, 12, 24).

## Rollover Rule (CRITICAL)

> Jika aset dibeli di bawah target fund, **sisa tetap tinggal di fund** dan jadi saldo awal untuk pembelian / siklus berikutnya.

### Contoh

```
Node Fund
  Target:      Rp 5.000.000
  Balance:     Rp 5.000.000 (target tercapai)

Beli ThinkCentre:
  Price:       Rp 4.000.000

Fund Balance After:
  Alokasi keluar: -Rp 4.000.000 (lewat ASSET_PURCHASE dengan fundId? atau via allocation reversal)
  
  → Catatan: lihat mekanisme di bawah.
```

### Mekanisme Pengurangan Fund Balance Saat Beli Aset

Opsi A — **Pengeluaran terkait fund** (recommended):
- User membuat expense dengan `fundId = node` sebesar `Rp 4.000.000` (type `EXPENSE`).
- Asset terpisah (ASSET_PURCHASE) tanpa fundId (atau dengan, opsional).
- Fund balance otomatis turun.
- Sisa `Rp 1.000.000` tetap di fund.

Opsi B — **Refund/return alokasi**:
- Lebih kompleks, tidak dipilih untuk MVP.

**Dipilih: Opsi A.**

### Contoh Lanjutan

```
Node Fund  (awal)
  Target: 5.000.000
  Alokasi diterima: 5.000.000
  Balance: 5.000.000

Pembelian ThinkCentre #1:
  Expense dari Node fund: 4.000.000
  Balance: 1.000.000 (SISA TETAP)

Node Fund (lanjutan)
  Alokasi baru diterima: 4.000.000
  Balance: 5.000.000

Pembelian ThinkCentre #2:
  Expense dari Node fund: 4.500.000
  Balance: 500.000

... dst
```

## Validation

- `targetAmount >= 0`.
- `monthlyContribution >= 0`.
- `renewalInterval >= 1` jika `type = RECURRING`.
- `nextRenewalDate` wajib jika `type = RECURRING`.
- Tidak boleh hapus fund jika ada transaction reference (`fundId`).

## UX

- Card per fund: progress bar, nominal, monthly, next renewal (jika recurring).
- Edit modal: ubah semua field.
- "Top up" / "Allocate" shortcut → buka capital injection form dengan fund pre-selected.
- "Pay Renewal" shortcut untuk recurring → buka expense form dengan fund pre-selected.

## Acceptance Criteria

- [ ] Fund balance **tidak pernah** disimpan manual.
- [ ] Edit/hapus alokasi atau expense → balance update.
- [ ] Recurring renewal → transaction + nextRenewalDate update.
- [ ] Rollover: beli aset 4m dari target 5m → sisa 1m tetap.
- [ ] Hapus fund dengan reference → ditolak / minta konfirmasi.
