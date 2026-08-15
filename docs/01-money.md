# 01 — Money Representation

## Tujuan
Menjamin **tidak ada floating-point arithmetic** untuk nominal uang, dan formatting konsisten untuk IDR.

## Representasi

- **Tipe data**: integer (Number dalam JavaScript aman karena nilai sampai 2^53).
- **Satuan**: minor units / unit terkecil.
- **IDR = 1 unit = Rp 1** (IDR tidak punya sub-unit seperti sen).

### Contoh Konversi

| Display              | Stored (minor units) |
| -------------------- | -------------------- |
| `Rp 500.000`         | `500000`             |
| `Rp 4.000.000`       | `4000000`            |
| `Rp 1.842`           | `1842`               |
| `Rp 12.450.000`      | `12450000`           |

## Aturan

1. **Input** dari user disimpan sebagai integer (parse + round jika perlu).
2. **Display** selalu lewat formatter terpusat.
3. **Perhitungan** hanya dengan integer:
   - `+`, `-`, `*`, `/` (untuk division, hasil dibulatkan sesuai rules).
4. **Tidak ada** `parseFloat`, `Number("0.1")`, atau `0.1 + 0.2` di kode finansial.
5. **Division** (untuk progress %): clamp 0..100, hasil pembulatan ke integer untuk display.

## Formatting Rules

- Locale: `id-ID`.
- Currency: sesuai company setting (default `IDR`).
- Selalu gunakan prefix `Rp ` (dengan spasi) sesuai spek.
- Pemisah ribuan: `.` (titik) sesuai format Indonesia.

### Contoh Output

```
Rp 500.000
Rp 4.000.000
Rp 1.842
Rp 12.450.000
Rp 0  (untuk nilai kosong/null)
```

## Edge Cases

| Situasi                     | Handling                                  |
| --------------------------- | ----------------------------------------- |
| Nilai 0                     | Tampilkan `Rp 0` (bukan `Rp -` / kosong). |
| Nilai negatif               | Tampilkan dengan tanda `-` di depan.      |
| Nilai null/undefined        | Tampilkan `Rp 0` atau `-` (kontekstual).  |
| Input koma dari user        | Strip → integer (tidak terima float).     |
| Input scientific notation   | Tolak / parse ulang.                      |
| Currency non-IDR (future)   | Format pakai currency code yang relevan.  |

## Validation Rules (Domain Layer)

- Amount **wajib** > 0 untuk transaksi (kecuali `ADJUSTMENT` boleh negatif).
- Amount **wajib** integer.
- Amount **tidak boleh** melebihi limit storage (safety, mis. `Number.MAX_SAFE_INTEGER`).
- Description: optional string, max 500 char.

## Utility API (Konseptual)

```
toMinorUnits(display: string): number        // "Rp 500.000" → 500000
fromMinorUnits(amount: number): string       // 500000 → "Rp 500.000"
formatCurrency(amount: number): string       // display helper
parseUserAmount(input: string): number       // "500000" / "500.000" / "500,000" → 500000
sumAmounts(amounts: number[]): number        // safe integer sum
clampProgress(numerator, denominator): number // 0..100 integer
```

## Acceptance Criteria

- [x] Tidak ada literal float di transaction/asset/fund code path.
- [x] Semua tampilan nominal lewat formatter.
- [x] Test: `Rp500.000 + Rp300.000 = Rp800.000`.
- [x] Test: division progress (3.5m / 5m) → 70%.
- [ ] Format konsisten di seluruh UI (dashboard, list, detail, laporan).
