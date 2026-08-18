# 09 — Dashboard

## Tujuan
Layar utama yang menjawab **10 pertanyaan kritis** tentang kondisi finansial saat ini (lihat 00-core-loop).

## Route

```
/   →  Dashboard (mobile-first)
```

## Layout — Mobile Priority

```
1. Net Worth         (hero)
2. Available Cash
3. Active Funds      (cards)
4. Recent Transactions (5 latest)
5. Assets (count + total value)
```

## Metric Cards

| Card               | Formula                                            |
| ------------------ | -------------------------------------------------- |
| Net Worth          | Cash + Σ currentValue (asset ACTIVE)               |
| Cash               | Σ tx (CAPITAL + INCOME + ASSET_SALE - EXPENSE - ASSET_PURCHASE) |
| Total Capital      | Σ tx.amount WHERE type = CAPITAL                   |
| Interest Earned    | Σ tx.amount WHERE type = INCOME AND category = INTEREST |
| Operating Expenses | Σ tx.amount WHERE type = EXPENSE                   |
| Asset Value        | Σ currentValue WHERE status = ACTIVE               |
| Monthly Delta      | Net Worth this month - last month                  |

## Fund Cards

```
[ Node Fund ]
Rp 3.850.000 / Rp 5.000.000
[██████████████░░░░] 77%
Monthly: Rp 425.000
Next Renewal: - (ONE_TIME)
```

Atau untuk recurring:

```
[ VPS ]
Rp 280.000 / Rp 300.000
[████████████░░░░░] 93%
Monthly: Rp 25.000
Next Renewal: 12 Sep 2026
```

## Recent Transactions

- 5 transaksi terakhir.
- Compact card (mobile).
- Show: date, type icon, amount (with sign), description.
- Tap → detail.

## Assets Section

- Count of active assets.
- Total current value.
- "View all" → assets page.

## Charts (Sederhana)

3 chart, masing-masing line/bar sederhana:

| Chart                   | Data                                          |
| ----------------------- | --------------------------------------------- |
| Net Worth Over Time     | Net worth per month (snapshot)                |
| Cash Over Time          | Closing cash per month                        |
| Capital Injected Over Time | Σ capital per bulan                          |

- Library: Nuxt UI compatible (lightweight).
- Tidak lebih dari 3 chart di dashboard.

## Empty States

### Belum Ada Transaksi

```
[Belum ada transaksi]
Mulai dengan catat modal pertama Anda.
[+ Tambah Modal]
```

### Belum Ada Fund

```
[Belum ada fund]
Atur target tabungan untuk VPS, Domain, dll.
[+ Buat Fund]
```

### Belum Ada Asset

```
[Belum ada aset]
ThinkCentre pertama bisa disimpan di sini.
[+ Tambah Aset]
```

## Loading States

- Skeleton cards saat initial load.
- Inline spinner saat refresh / mutate.

## Acceptance Criteria

- [x] Dashboard load < 1 detik (dengan data ribuan).
- [x] Mobile-first: scroll vertikal, card-based.
- [x] Desktop: grid multi-column.
- [x] Semua metric update real-time setelah transaksi baru.
- [x] Empty state untuk fund/asset/transaction masing-masing.
