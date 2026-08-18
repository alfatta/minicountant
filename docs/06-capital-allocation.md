# 06 — Capital Injection & Fund Allocation

## Tujuan
Mekanisme injeksi modal + alokasi ke beberapa fund dalam satu flow. **Wujud akuntansi double-entry sederhana** — modal dari owner meningkatkan Cash dan Capital.

## Konsep

- Satu transaksi `CAPITAL` bisa punya **banyak alokasi** ke fund.
- Total alokasi **tidak boleh melebihi** amount transaksi.
- Boleh sebagian (sisa = cash umum).

## Entity: Fund Allocation

```ts
fundAllocation = {
  id: string,
  companyId: string,
  transactionId: string,     // ref ke transaction.type = CAPITAL
  fundId: string,            // ref ke fund
  amount: number,            // minor units
  createdAt: number,
}
```

## Alur UI: Tambah Modal

```
[Add Capital]
   ↓
Form:
  - Amount
  - Date (default: today)
  - Description (optional)
   ↓
(opsional) Allocation:
  - Domain 1: Rp 75.000
  - VPS: Rp 75.000
  - Node: Rp 350.000
  - Sisa (unallocated): Rp 0
   ↓
[Save]
   ↓
  - 1 Transaction (CAPITAL)
  - N FundAllocation (sesuai input)
```

## Validation

### Saat Capital Injection

1. **Amount > 0**, integer.
2. **Total alokasi ≤ amount**.
3. Jika alokasi = 0 → tetap boleh (modal umum tanpa alokasi).
4. Setiap `fundId` valid dan status `ACTIVE` (preferred, tidak strict).

### Saat Edit Allocation

- Jika user edit alokasi existing → recompute fund balance via ledger.
- Tidak boleh ada alokasi orphan (transaction dihapus → alokasi ikut hilang).

## Accounting Meaning

```
Capital Injection Rp 500.000

Cash           +Rp 500.000
Capital        +Rp 500.000

Fund Balances:
  Node         +Rp 350.000
  Domain 1     +Rp 75.000
  VPS          +Rp 75.000
```

## Fund Balance (Derived)

Fund balance dihitung dari **akumulasi alokasi** dikurangi **pengeluaran yang terkait fund**.

```
fundBalance(fund) = Σ fundAllocation.amount
                  - Σ expense.amount WHERE tx.fundId = fund
```

_(lihat 07-funds untuk detail lengkap)_

## Edge Cases

| Situasi                                  | Handling                                     |
| ---------------------------------------- | -------------------------------------------- |
| Alokasi lebih besar dari amount          | Tolak dengan pesan error                    |
| Alokasi ke fund yang ARCHIVED            | Konfirmasi / tolak                          |
| Edit modal → ubah alokasi                | Recompute fund balance                      |
| Hapus transaction CAPITAL                | Cascade: hapus semua alokasi terkait        |
| 2 modal injection di hari yang sama      | Boleh (tx terpisah)                         |

## Acceptance Criteria

- [x] Modal injection 1 transaction + N allocations dalam 1 save.
- [x] Validasi total alokasi ≤ amount.
- [x] Fund balance update otomatis.
- [x] Edit allocation → recompute benar.
- [x] Hapus transaction → alokasi ikut bersih (cascade).
