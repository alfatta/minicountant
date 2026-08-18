# 12 — Backup & Restore

## Tujuan
Karena data 100% lokal, backup/restore adalah **fitur kritis**. User harus bisa export & restore tanpa kehilangan data.

## Route

```
/settings/backup
```

## Aksi Tersedia

| Aksi             | Fungsi                                                 |
| ---------------- | ------------------------------------------------------ |
| Download Backup  | Export `.hcb` file dengan semua data                   |
| Restore Backup   | Import `.hcb`, replace database                        |
| Export CSV       | Export specific tables ke CSV                          |

## Format Backup

### File

- Extension: `.hcb` (Homelab Company Backup).
- MIME: `application/json`.
- Nama: `homelab-company-YYYY-MM-DD.hcb`.

### Content (JSON)

```json
{
  "format": "homelab-company-backup",
  "version": 1,
  "createdAt": "2026-08-15T10:00:00Z",
  "appVersion": "1.0.0",
  "company": { ... },
  "funds": [ ... ],
  "fundAllocations": [ ... ],
  "transactions": [ ... ],
  "assets": [ ... ],
  "monthlyClosings": [ ... ],
  "settings": { ... }
}
```

## Download Backup Flow

```
User: [Download Backup]
   ↓
Sistem serialize semua tabel → JSON
   ↓
Blob → download sebagai .hcb
```

## Restore Backup Flow

```
User: [Restore Backup] → pilih file .hcb
   ↓
Validasi:
  - format field exists
  - version supported
  - required tables exist
   ↓
Preview:
  Company: Homelab Corp
  Created: 15 Aug 2026
  Transactions: 128
  Assets: 3
  Funds: 4
  
  ⚠️ Restoring will replace current data.
   ↓
[Cancel] [Restore]
   ↓
Safety: export current DB sebagai backup_OLD.hcb (auto)
   ↓
Replace IndexedDB dengan data dari file
   ↓
Reload app
```

## Validation Rules

### Format Validation

- `format === "homelab-company-backup"` → required.
- `version` integer, supported version list.
- `company`, `funds`, `transactions`, `assets` tidak boleh null/undefined.
- Tiap array bisa kosong (`[]`), tapi harus array.

### Schema Compatibility

- `version` saat ini = 1.
- Backup versi lebih tinggi → tolak dengan pesan.
- Backup versi lebih rendah → migrate jika ada logic (MVP: tolak dulu).
- Backup versi sama → restore langsung.

## Restore Safety

1. **Tidak langsung overwrite** — tampilkan preview dulu.
2. **Auto-backup current** sebelum replace.
3. **Confirm destructive** — tombol `Restore` butuh konfirmasi eksplisit (modal).
4. **Rollback** — jika restore gagal di tengah jalan, kembalikan current state.

## CSV Export

Per tabel:

- `transactions.csv`
- `assets.csv`
- `funds.csv`

Format standar: header row + data rows, UTF-8, comma-separated.

## Acceptance Criteria

- [x] Download menghasilkan file valid `.hcb`.
- [x] Restore dari file valid → data kembali sama.
- [x] Restore dari file invalid → error friendly.
- [x] Auto-backup current sebelum restore.
- [x] CSV export per tabel berfungsi.
- [x] Version migration path siap (future-proof).
