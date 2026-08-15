# 03 — Security / Lock

## Tujuan
Melindungi akses lokal ke data finansial dengan password. **Penting**: ini bukan proteksi terhadap attacker yang punya akses penuh ke device/browser profile — itu di luar jangkauan client-side password.

## State

```
READY
 ↓ (lock / inactivity)
LOCKED
 ↓ (password OK)
UNLOCKED
 ↓ (lock action / inactivity)
LOCKED
```

## Konsep

- Password **tidak pernah** disimpan plaintext.
- Disimpan: `passwordHash` + `salt`.
- KDF: PBKDF2 atau Argon2 (via Web Crypto API).
- Struktur kode siap untuk **enkripsi data** kemudian (lihat Future-Compat).

## Storage Shape

```ts
security = {
  id: 'singleton',
  passwordHash: string,    // hasil KDF
  salt: string,            // base64
  iterations: number,      // KDF work factor
  createdAt: number,
  updatedAt: number,
}
```

## KDF Rules

- Salt: random 16 bytes per user (base64).
- Iterations: minimal 100.000 (PBKDF2-SHA256) untuk MVP.
- Hash output: base64.

## Future-Compat: Encryption

Struktur kode harus memungkinkan nanti:

```
Password
   ↓
KDF (PBKDF2 / Argon2)
   ↓
Derived Key (32 bytes)
   ↓
Encryption (AES-GCM)
   ↓
Decrypt on unlock
```

Untuk MVP: derived key hanya dipakai untuk **verifikasi** (hash compare), tidak mengenkripsi data. Saat enkripsi diaktifkan, derived key akan jadi key material.

## Unlock Flow

1. User buka app.
2. Jika `security` ada & belum unlock → tampilkan lock screen.
3. User masukkan password.
4. Hash ulang dengan salt + iterations → compare.
5. Jika match → state `UNLOCKED` → tampilkan dashboard.
6. Jika tidak match → tampilkan error "Incorrect password".

## Lock Triggers

| Trigger                       | Setting                | Default   |
| ----------------------------- | ---------------------- | --------- |
| Manual lock (user action)     | selalu aktif           | -         |
| Inactivity timeout            | configurable           | 5 menit   |
| App backgrounded (mobile)     | opsional (future)      | off (MVP) |
| Refresh / tab close           | lock state persist     | -         |

### Auto-lock Rules
- Hitung dari last activity (tap, input, navigation).
- Saat timeout tercapai → state jadi `LOCKED`.
- Saat unlock → activity timestamp di-reset.

## Change Password

1. User harus unlock dulu.
2. Form: current password + new password + confirm.
3. Validasi current benar.
4. Generate salt baru + hash baru.
5. Replace di DB.

## Reset Password (Recovery)

- **Tidak ada** recovery password di MVP (tidak ada backend).
- Opsi: "Reset company" (hapus semua data) di Settings.
- Konsekuensi reset: semua data hilang, kembali ke `NEW`.

## Acceptance Criteria

- [x] Password tidak pernah tampil di UI setelah disimpan.
- [x] Unlock dengan password salah → error friendly.
- [x] Unlock dengan password benar → masuk dashboard.
- [x] Manual lock → kembali ke lock screen.
- [x] Auto-lock setelah inactivity.
- [x] Change password berfungsi tanpa data loss.
- [x] Struktur kode memungkinkan enkripsi data di versi berikutnya.
