# 00 — Core Financial Loop

Loop utama yang jadi **inti produk MiniCountant**. Semua fitur dirancang untuk melayani loop ini.

## Visual Loop

```
Inject Capital
      ↓
Allocate to Funds
      ↓
Earn Interest
      ↓
Pay Expenses
      ↓
Purchase Assets
      ↓
Track Asset Value
      ↓
Monthly Closing
      ↓
Track Net Worth
      ↓
Continue Saving
      ↓
Next Asset
```

## Tahapan Loop

### 1. Inject Capital
- User menambahkan modal dari pribadi ke "perusahaan".
- Tercatat sebagai transaksi `CAPITAL` / kategori `CAPITAL_INJECTION`.
- Menaikkan **Cash** dan **Total Capital**.
- Bersifat opsional — bisa multi-allocation (lihat 06).

### 2. Allocate to Funds
- Dana yang masuk dipecah ke beberapa fund (mis. Node, Domain, VPS).
- Tidak wajib 1:1 — bisa sebagian atau semua.
- Bisa dilakukan saat capital injection atau nanti.

### 3. Earn Interest
- User mencatat bunga bank manual per bulan.
- Transaksi `INCOME` / kategori `INTEREST`.
- Menaikkan Cash.
- Tidak dihitung otomatis (MVP).

### 4. Pay Expenses
- Pengeluaran operasional: domain, VPS, listrik, dll.
- Transaksi `EXPENSE` dengan kategori terkait.
- Mengurangi Cash.
- Untuk recurring fund (Domain/VPS), terkait ke fund (lihat 07).

### 5. Purchase Assets
- Beli infrastruktur (ThinkCentre, NAS, dll).
- Membuat:
  - Asset record baru
  - Transaksi `ASSET_PURCHASE`
- Mengurangi Cash, menaikkan Asset Value.
- **BUKAN** operating expense.

### 6. Track Asset Value
- User update `currentValue` per aset secara berkala.
- Berkontribusi ke Net Worth.

### 7. Monthly Closing
- Snapshot bulanan: opening/closing cash, asset value, net worth.
- Wujud historical record.
- Bisa di-reopen untuk koreksi.

### 8. Track Net Worth
- Formula: `Cash + Total Current Asset Value`.
- Ditampilkan di dashboard sebagai angka utama.

### 9. Continue Saving
- Setelah beli aset, sisa target fund **TETAP ADA** (rollover rule — 07).
- Loop berulang dengan target baru.

### 10. Next Asset
- Fund target baru / aset baru berikutnya.

## Aturan Inti Loop

| Rule                                          | Penjelasan                                                              |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| Capital ≠ Income                              | Modal dari owner bukan pendapatan, dipisah di UI dan reporting.         |
| Expense ≠ Asset Purchase                      | Pembelian aset tidak masuk operating expense.                           |
| Fund rollover                                 | Sisa target fund setelah pembelian tetap jadi saldo awal berikutnya.   |
| Net worth = Cash + Asset Value                | Bukan cuma cash, aset dihitung berdasarkan current value.               |
| Derived values                                | Cash balance, fund balance, net worth selalu dihitung, tidak di-store. |

## Pertanyaan yang Harus Dijawab Dashboard (Quick View)

1. Berapa cash saat ini?
2. Berapa total modal disetor?
3. Berapa total bunga yang sudah masuk?
4. Berapa total pengeluaran?
5. Aset apa saja yang dimiliki?
6. Berapa net worth?
7. Saldo tiap fund?
8. Seberapa dekat ke pembelian aset berikutnya?
9. Kapan domain/VPS renewal berikutnya?
10. Kapan terakhir backup?

## Acceptance Criteria Loop

- [x] User bisa injeksi modal + langsung alokasi ke fund dalam 1 flow.
- [x] User bisa catat bunga dalam ≤ 3 tap.
- [x] User bisa catat expense recurring (VPS/Domain) yang auto-advance renewal date.
- [x] User bisa beli aset dan otomatis terbentuk asset + transaksi.
- [x] Dashboard update real-time tanpa refresh.
- [x] Monthly closing menghasilkan snapshot akurat.
- [x] Net worth konsisten setelah pembelian aset (cash turun, asset naik, total sama di titik beli).
