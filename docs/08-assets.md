# 08 — Assets

## Tujuan
Track infrastruktur fisik (ThinkCentre, NAS, router, dll) dari beli sampai retire. Berkontribusi ke Net Worth via `currentValue`.

## Entity Shape

```ts
asset = {
  id: string,
  companyId: string,
  name: string,
  category: 'HARDWARE' | 'NETWORKING' | 'STORAGE' | 'INFRASTRUCTURE' | 'OTHER',
  purchaseDate: number,
  purchasePrice: number,        // minor units
  currentValue: number,         // minor units, editable
  status: 'ACTIVE' | 'SOLD' | 'BROKEN' | 'RETIRED',
  purpose?: string,             // mis. "Kubernetes Node", "NAS Storage"
  description?: string,
  createdAt: number,
  updatedAt: number,
}
```

## Categories

| Category        | Contoh                                |
| --------------- | ------------------------------------- |
| HARDWARE        | ThinkCentre, Mini PC, Raspberry Pi    |
| NETWORKING      | Router, Switch, Access Point          |
| STORAGE         | NAS, HDD, SSD                         |
| INFRASTRUCTURE  | UPS, Rack, KVM                        |
| OTHER           | Lainnya                               |

## Status

| Status     | Arti                                            |
| ---------- | ----------------------------------------------- |
| ACTIVE     | Aktif, masuk perhitungan net worth              |
| SOLD       | Sudah dijual, history tetap ada                 |
| BROKEN     | Rusak, devalue ke 0 atau nominal saja           |
| RETIRED    | Tidak dipakai, masuk / tidak masuk net worth    |

_(MVP: status SOLD/BROKEN/RETIRED tidak dihitung Net Worth)_.

## Asset Purchase Flow

```
User: "Beli ThinkCentre Rp 4.000.000"

Backend logic:
1. Buat asset record:
   - name, category, purchaseDate, purchasePrice = 4.000.000
   - currentValue = 4.000.000 (default)
   - status = ACTIVE

2. Buat transaction:
   - type = ASSET_PURCHASE
   - amount = 4.000.000
   - assetId = asset.id

3. (opsional) Jika dari fund:
   - Expense terkait fund juga dibuat (lihat 07-funds rollover)
```

### Accounting Effect

```
Cash            -Rp 4.000.000
Asset Value     +Rp 4.000.000
Net Worth       unchanged (cash turun, asset naik, total sama)
```

## Asset Sale Flow

```
User: "Jual ThinkCentre Rp 3.500.000"

Backend logic:
1. Update asset:
   - status = SOLD
   - (opsional) record salePrice di field terpisah

2. Buat transaction:
   - type = ASSET_SALE
   - amount = 3.500.000
   - assetId = asset.id
```

_(MVP: gain/loss tidak dihitung kompleks. Sale amount masuk cash seperti income biasa.)_

## Update Current Value

- User bisa edit `currentValue` kapan saja.
- Berkontribusi ke Net Worth.

```
Net Worth = Cash + Σ currentValue (asset.status = ACTIVE)
```

## Validation

- `purchasePrice >= 0`, integer.
- `currentValue >= 0`, integer.
- `purchaseDate` ≤ today.
- Category & status dari enum.

## UX

- List: card per aset dengan current value + delta.
- Detail: full info + transaction history terkait.
- Edit current value inline (untuk update berkala).
- Status badge (ACTIVE/SOLD/dll).

## Acceptance Criteria

- [x] Beli aset → 1 asset record + 1 transaction.
- [x] Net worth update real-time saat current value diubah.
- [x] Jual aset → status SOLD + transaction ASSET_SALE.
- [x] Hapus aset dengan transaction reference → butuh konfirmasi.
