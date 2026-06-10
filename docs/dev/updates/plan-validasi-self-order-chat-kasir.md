# Plan Validasi — Self-Order Notes & Chat Kasir (11 Jun 2026)

**Tujuan:** pastikan alur self-order, catatan per-item, isolasi cabang, dan tombol Chat Kasir tetap berfungsi tanpa regresi.

## Cek Persiapan
- [ ] Pull branch terbaru.
- [ ] `npm install`
- [ ] `.env` sesuai (OPENROUTER_API_KEY + auth)
- [ ] `npm run build` → exit 0

## Cek Dampak ke Fitur Lain
- [ ] Kasir: transaksi, struk, riwayat
- [ ] Self-Order: pilih menu → keranjang → sukses order

## Validasi Self-Order + Notes + Chat Kasir
- [ ] Buka halaman self-order `/order/<userId>/<tableId>`
- [ ] Masukkan catatan di salah satu item keranjang
- [ ] Submit order
- [ ] Halaman sukses menampilkan tombol **Chat Kasir** mengarah ke WA cabang yang sesuai (Cabang 1 / Cabang 2)
- [ ] Cek `/api/public/order` menerima `note` dan `transaction_items.notes` terisi di DB
- [ ] Cek CheckoutModal dan TransactionHistory menampilkan catatan tanpa duplikat

## Validasi Isolasi Cabang
- [ ] Pastikan Cabang 1 dan Cabang 2 tetap terpisah
- [ ] Pastikan perubahan di Cabang 1 tidak mempengaruhi Cabang 2 dan sebaliknya

## Deliverable / Bukti
- [ ] Hasil `npm run build` (exit 0)
- [ ] Screenshoot halaman sukses self-order (tombol Chat Kasir muncul)
- [ ] Catatan singkat jika ada bug atau regresi
