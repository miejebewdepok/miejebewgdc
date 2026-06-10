# Fitur Chat Kasir via WhatsApp — Self-Order

Fitur ini menambahkan tombol **Chat Kasir** di halaman sukses self-order agar customer bisa langsung hubungi kasir lewat WhatsApp tanpa perlu save nomor atau keluar dari alur aplikasi.

## Cara kerja
- Setelah customer submit order dan muncul halaman sukses, tersedia tombol `Chat Kasir`.
- Tombol membuka `https://wa.me/<nomor_kasir>?text=Halo,%20saya%20order%20<id>%20<%20bill>`.
- Nomor kasir dipilih otomatis sesuai cabang:
  - Cabang 1 → `08989419121`
  - Cabang 2 → `081310718192`

## Keamanan
- Bukan kolom chat publik; tetap via WhatsApp personal.
- Nomor kasir tidak diekspos ke API publik; hanya di frontend self-order.
- Pesan awal terisi otomatis (meja + invoice), customer tinggal tambah detail.

## File terkait
- `src/app/order/[userId]/[tableId]/page.tsx` — tombol chat + template pesan.

## Checklist
- Build OK.
- Coba self-order → lihat halaman sukses → tombol Chat Kasir harus buka ke WA cabang yang sesuai.
