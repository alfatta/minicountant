# 13 — Settings

## Tujuan
Pusat konfigurasi aplikasi: company, security, data, appearance.

## Route

```
/settings
```

## Sections

### 1. Company

| Field        | Editable | Notes                                  |
| ------------ | -------- | -------------------------------------- |
| Name         | Ya       | -                                      |
| Short Name   | Ya       | -                                      |
| Currency     | Locked (MVP) | Perubahan butuh data migration    |
| Timezone     | Ya       | -                                      |
| Description  | Ya       | -                                      |

### 2. Security

| Aksi             | Fungsi                                  |
| ---------------- | --------------------------------------- |
| Change Password  | current → new → confirm                |
| Lock Now         | Trigger manual lock                     |
| Auto-lock Timeout| Slider: 1 min, 5 min, 15 min, 30 min, never |

### 3. Data

| Aksi              | Fungsi                                  |
| ----------------- | --------------------------------------- |
| Download Backup   | → 12-backup-restore                     |
| Restore Backup    | → 12-backup-restore                     |
| Export CSV        | Export per tabel                        |
| Reset Company     | **Destructive** — hapus semua data      |

#### Reset Company

- Konfirmasi 2-step (ketik nama company untuk konfirmasi).
- Auto-backup sebelum reset.
- Kembali ke state `NEW`.

### 4. Appearance

| Opsi      | Values                        |
| --------- | ----------------------------- |
| Theme     | Light, Dark, System           |

- Default: System.
- Pakai Nuxt UI theming.

## Acceptance Criteria

- [x] Semua section accessible dari `/settings`.
- [x] Change password tidak log out user.
- [x] Reset company butuh konfirmasi ganda.
- [x] Theme switch real-time.
- [x] Auto-lock setting langsung berlaku.
