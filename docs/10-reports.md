# 10 — Reports

## Tujuan
Historical analysis: monthly summary, cash flow, net worth, fund performance.

## Route

```
/reports
```

## Sections

### 1. Monthly Financial Summary

Filter by month (default: current month).

```
Capital Injection     Rp 500.000
Interest Income       Rp 1.842
Other Income          Rp 0
Operating Expenses    Rp 75.000
Asset Purchases       Rp 0
─────────────────────────────
Net (Capital - Expenses)  Rp 425.000
```

### 2. Cash Flow

Filter by month.

```
Opening Cash          Rp 2.000.000
Capital               Rp 500.000
Income                Rp 1.842
Expenses              Rp 75.000
Asset Purchases       Rp 0
─────────────────────────────
Closing Cash          Rp 2.426.842
```

### 3. Net Worth

Snapshot per bulan.

```
Cash                  Rp 7.200.000
Current Asset Value   Rp 5.250.000
─────────────────────────────
Net Worth             Rp 12.450.000
```

### 4. Fund Performance

Per fund.

```
Fund       Target      Current     Remaining    Progress    Monthly
Node       5.000.000   3.850.000   1.150.000    77%         425.000
Domain 1   300.000     280.000     20.000       93%         25.000
Domain 2   300.000     300.000     0            100%        25.000
VPS        300.000     300.000     0            100%        25.000
```

## Period Filter

- Default: current month.
- Bisa pilih bulan/tahun.
- Range custom (opsional).

## Export

- Tiap report bisa di-export CSV (lihat 12-backup-restore).

## Acceptance Criteria

- [x] Semua nilai derived (tidak disimpan manual).
- [x] Filter bulan/tahun berfungsi.
- [x] Empty state per section.
- [x] Export CSV per section.
