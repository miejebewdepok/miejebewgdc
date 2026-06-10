# Validasi Self-Order, Notes, dan Chat Kasir
**Tujuan:** Pastikan perubahan sebelumnya tetap berfungsi dan tidak ada regresi setelah Antigravity lanjut update.

## 1. Persiapan
- Pull branch terbaru dari repository.
- Jalankan `npm install` jika ada perubahan dependency.
- Pastikan `.env` berisi `OPENROUTER_API_KEY` dan konfigurasi auth yang benar.
- Jalankan `npm run build` dan pastikan exit code 0.

## 2. Cek Dampak Fitur Lain
Pastikan fitur yang ada sebelumnya tetap berfungsi:
- **Kasir:** Operasi kasir sehari-hari (transaksi, struk, riwayat).
- **Self-Order:** Alur self-order dari pilih menu sampai sukses.

## 3. Validasi Alur Self-Order + Notes
- Buka self-order (`/order/[userId]/[tableId]`) di browser.
- Tambahkan catatan di salah satu item keranjang.
- Submit order dan pastikan halaman sukses menampilkan **tombol Chat Kasir** (WA ke cabang sesuai).
- Cek API `/api/public/order` menerima `note` dan menyimpan ke DB (`transaction_items.notes`).
- Cek halaman kasir (CheckoutModal + TransactionHistory) menampilkan catatan tanpa duplikasi.

## 4. Validasi Isolasi Cabang
- Pastikan cabang 1 dan cabang 2 tetap terpisah.
- Cek perubahan di cabang 1 tidak mempengaruhi cabang 2 dan sebaliknya.

## 5. Output yang Diharapkan
- Log `npm run build` dengan exit code 0.
- Screenshoot halaman sukses self-order (pastikan tombol Chat Kasir muncul).
- Catatan singkat apakah ada bug atau regresi.
