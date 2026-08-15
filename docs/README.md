# MiniCountant — Feature Logic Docs

Dokumen ini adalah breakdown **logic & business rules** per fitur aplikasi MiniCountant (homelab finance tracker PWA).

> **Tujuan docs**: jadi acuan saat implementasi. Setiap file fokus pada **rules, alur, edge case, dan acceptance criteria** — bukan kode/teknis detail.

## Struktur

| #   | File                                | Topik                                                  |
| --- | ----------------------------------- | ------------------------------------------------------ |
| 00  | [00-core-loop.md](./00-core-loop.md) | Financial loop overview — loop utama aplikasi         |
| 01  | [01-money.md](./01-money.md)         | Representasi uang (integer minor units), formatting    |
| 02  | [02-onboarding.md](./02-onboarding.md) | First launch flow: company → password → funds          |
| 03  | [03-security.md](./03-security.md)   | Local password/lock, auto-lock                         |
| 04  | [04-company.md](./04-company.md)     | Company entity, single-company constraint             |
| 05  | [05-transactions.md](./05-transactions.md) | Ledger: tipe, kategori, validasi                      |
| 06  | [06-capital-allocation.md](./06-capital-allocation.md) | Capital injection + alokasi ke funds                  |
| 07  | [07-funds.md](./07-funds.md)         | Funds: progress, recurring, rollover                  |
| 08  | [08-assets.md](./08-assets.md)       | Assets: purchase, sale, valuation                      |
| 09  | [09-dashboard.md](./09-dashboard.md) | Dashboard metrics & layout                             |
| 10  | [10-reports.md](./10-reports.md)     | Reports (monthly, cash flow, net worth, fund perf)     |
| 11  | [11-monthly-closing.md](./11-monthly-closing.md) | Monthly closing snapshot                             |
| 12  | [12-backup-restore.md](./12-backup-restore.md) | Backup format `.hcb`, restore safety                  |
| 13  | [13-settings.md](./13-settings.md)   | Settings: company, security, data, appearance          |

## Prinsip Lintas-Fitur

1. **Single user, single company** — tidak ada multi-tenant di UI.
2. **Local-first, offline-first** — tidak ada dependency ke network.
3. **Integer money** — tidak boleh ada float untuk nominal.
4. **Derived, never duplicated** — fund balance & net worth dihitung, tidak di-simpan manual.
5. **Explicit destructive actions** — hapus/reset/restore butuh konfirmasi.
6. **Validation di domain layer** — UI boleh longgar, domain wajib ketat.
7. **Future-compatible encryption** — struktur security siap untuk enkripsi kemudian.

## Status Implementasi

_(Diisi saat mulai coding — setiap file `.md` akan punya checklist implementation.)_
