# API Public Order Protection — 2026-06-10

Controller pengambilan pesanan self-order yang sensitif. Jangan hapus bagian ini saat update.

## File utama
- `src/app/api/public/order/route.ts`

## Logic yang harus di-keep
1. Branch detection dari `storeProfiles.businessNotes`
2. De-duplication pesanan ganda untuk table yang sama dalam 15 detik
3. Validasi `userId`, `customerName`, `items`
4. Normalization nama pelanggan / meja

## Rilis dokumen ini
- Build: `npm run build`
- Cabang aman: productName, notes, branchCode
