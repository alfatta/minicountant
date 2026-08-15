# 02 — Onboarding Flow

## Tujuan
First-launch experience yang **singkat, jelas, dan menghasilkan data minimum yang dibutuhkan** agar dashboard langsung berfungsi.

## State

- `NEW` → belum ada company & password.
- `ONBOARDING` → sedang dalam proses setup.
- `READY` → onboarding selesai.

## Alur

```
First Launch
    ↓
[1] Create Company
    ↓
[2] Create Password
    ↓
[3] Configure Initial Funds
    ↓
Finish → Dashboard
```

## Step 1 — Company

### Fields
| Field         | Required | Default          | Constraint                                |
| ------------- | -------- | ---------------- | ----------------------------------------- |
| name          | Ya       | -                | string, 1–100 char                        |
| shortName     | Ya       | -                | string, 2–10 char, uppercase otomatis     |
| currency      | Ya       | `IDR`            | dari list supported (IDR dulu)            |
| timezone      | Ya       | `Asia/Jakarta`   | IANA timezone                             |
| description   | Tidak    | -                | string, max 500 char                      |

### Validation
- `name` tidak boleh kosong setelah trim.
- `shortName` hanya alphanumeric (no spaces).
- Currency harus dari whitelist (MVP: `IDR` saja).

### UX
- 1 screen dengan field di atas.
- Tombol `Continue` nonaktif sampai required valid.
- Back button tidak ada di step 1.

## Step 2 — Password

### Fields
| Field            | Required | Constraint                                |
| ---------------- | -------- | ----------------------------------------- |
| password         | Ya       | min 6 char (MVP), max 128                 |
| confirmPassword  | Ya       | harus match `password`                    |

### Validation
- Password dan confirm harus match.
- Tidak boleh menyimpan plaintext.
- Hasil: hash + salt (lihat `03-security.md`).

### UX
- Field password dengan toggle visibility.
- Inline error jika mismatch.
- Tombol `Continue` nonaktif sampai valid.

## Step 3 — Configure Initial Funds

### Default Funds (Predefined)
| Name     | Target       | Monthly   | Type       | Status |
| -------- | ------------ | --------- | ---------- | ------ |
| Domain 1 | Rp 300.000   | Rp 25.000 | RECURRING  | ACTIVE |
| Domain 2 | Rp 300.000   | Rp 25.000 | RECURRING  | ACTIVE |
| VPS      | Rp 300.000   | Rp 25.000 | RECURRING  | ACTIVE |
| Node     | Rp 5.000.000 | Rp 425.000| ONE_TIME   | ACTIVE |

- Total rekomendasi: **Rp 500.000 / bulan**.

### UX
- Tampilkan 4 fund sebagai list/card editable.
- User boleh edit target, monthly, type, atau skip sama sekali (`Skip` button).
- Tidak ada transaksi otomatis (sesuai spek).
- Tombol `Finish` → simpan semua fund → redirect ke dashboard.

### Rules
- Saldo awal semua fund = 0.
- Tidak ada transaksi otomatis.
- User bisa tambah/hapus fund di step ini.

## App States Setelah Onboarding

```
company      → exists
security     → exists (hash + salt)
funds        → 0..4 (tergantung input user)
transactions → empty
assets       → empty
```

→ State app: `READY`.

## Acceptance Criteria

- [ ] First launch detect `company` tidak ada → tampilkan onboarding.
- [ ] Step 1 validasi name & shortName.
- [ ] Step 2 validasi password match, simpan hash+salt.
- [ ] Step 3 default 4 fund editable, bisa di-skip.
- [ ] Onboarding selesai → state jadi `READY` → redirect `/`.
- [ ] Onboarding tidak bisa di-skip (wajib dilalui).
- [ ] Tidak ada fake financial transaction dibuat.
