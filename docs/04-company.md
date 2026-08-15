# 04 — Company

## Tujuan
Entity utama yang jadi "wadah" data. Single-company untuk MVP, tapi schema multi-company ready.

## Entity Shape

```ts
company = {
  id: string,
  name: string,
  shortName: string,
  currency: 'IDR',             // MVP hardcode; extensible
  timezone: string,            // IANA, e.g. 'Asia/Jakarta'
  description?: string,
  createdAt: number,
  updatedAt: number,
}
```

## Constraints

- **Single row**: hanya 1 company untuk MVP.
- Semua entity lain ber-`companyId`.
- Schema mendukung multi-company (ada `companyId`), tapi UI tidak expose.

## Fields Detail

| Field        | Type    | Required | Constraints                           |
| ------------ | ------- | -------- | ------------------------------------- |
| id           | string  | Ya       | UUID                                  |
| name         | string  | Ya       | 1–100 char, trim                       |
| shortName    | string  | Ya       | 2–10 char, alphanumeric, auto-upper   |
| currency     | enum    | Ya       | MVP: IDR only                         |
| timezone     | string  | Ya       | IANA                                  |
| description  | string  | Tidak    | max 500 char                          |
| createdAt    | number  | Ya       | epoch ms                              |
| updatedAt    | number  | Ya       | epoch ms                              |

## Use Cases

### Create
- Hanya sekali: saat onboarding selesai.
- Validasi sama dengan onboarding step 1.

### Update
- Dari Settings → Company.
- Field yang boleh diubah: `name`, `shortName`, `timezone`, `description`.
- `currency` di-lock di MVP (perubahan currency = data migration besar).

### Delete
- Tidak ada delete company di UI normal.
- "Reset company" di Settings = hapus semua data, kembali ke `NEW`.

## Acceptance Criteria

- [ ] Hanya 1 company row bisa ada.
- [ ] `currency` tidak bisa diubah sembarangan (perlu konfirmasi data migration).
- [ ] `updatedAt` auto-update setiap perubahan.
- [ ] Semua entity finansial reference `companyId` valid.
