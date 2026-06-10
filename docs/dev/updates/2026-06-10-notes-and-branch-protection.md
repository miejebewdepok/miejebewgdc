# Hard Rules — Self-Order Notes & Branch Isolation

Update terakhir berhasil mengamankan catatan pesanan dan isolasi cabang. Jangan hapus bagian ini saat update berikutnya.

## 1. Self-order notes diaktifkan
- `src/app/order/[userId]/[tableId]/page.tsx` — input catatan per-item sudah aktif
- Catatan dikirim lewat payload JSON `/api/public/order`
- `src/app/api/transactions/route.ts` — menerima `notes`/`note`
- `src/lib/server/app-service.ts` — menyimpan `notes` ke tabel `transaction_items`
- `transaction_items.notes` bertipe `text` nullable, sudah ada di DB produksi

## 2. Tampilan catatan di kasir
- `src/components/warung/gdc/CheckoutModal.tsx` — menampilkan catatan tanpa duplikat
- `src/components/warung/gdc/TransactionHistory.tsx` — sama, pencegahan duplikasi aktif
- Keduanya mengecek apakah `Catatan:` sudah ada di `productName` sebelum menampilkan `item.notes`

## 3. Branch code
- Sumber kebenaran cabang: `storeProfiles.businessNotes.branchCode`
- `src/app/order/[userId]/[tableId]/page.tsx` — cabang ditentukan dari API publik
- `src/lib/server/app-service.ts` — `mapSettings()` memetakan `branchCode`
- Jangan ubah CABANG_1 / CABANG_2 menjadi string lain tanpa update semua file yang menggunakannya

## 4. Anti duplikasi catatan
- Jangan menghapus logika `isAlreadyInName`
- Header receipt & alamat/WA: gunakan layout baru yang sudah dirapikan, jangan kembalikan ke gaya lama

## File yang Wajib Di-keep
- `src/lib/server/app-service.ts` — bagian `createTransaction` (productName + notes)
- `src/components/warung/gdc/CheckoutModal.tsx` — de-dup display + mobile receipt preview
- `src/components/warung/gdc/TransactionHistory.tsx` — sama
- `src/components/providers/app-state-provider.tsx` — cartLines notes mapping

## Checklist Build
- `npm run build` (harus 0 error)
