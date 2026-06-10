# Update Guard — 2026-06-10

## Scope
Amankan perubahan terbaru pada aplikasi kasir dan self-order Mie Jebew GDC agar tidak terhapus saat update berikutnya (misal revisit dari Antigravity).

## Dampak perubahan yang tercatat
- Checkout modal: alur download struk kini membedakan mobile/WebView dan desktop
- Transaction history: alur download struk history disamakan perilakunya
- Alamat dan layout receipt:
  - alignment, line-height, max-width pada header alamat dan nomor WA diselaraskan
- Catatan penting: fitur self-order notes dan de-duplikasi tampilan catatan sudah terintegrasi sebelumnya dan tetap berlaku

## Bukti perubahan
- `src/components/warung/gdc/CheckoutModal.tsx` menambah overlay preview gambar struk untuk mobile
- `src/components/warung/gdc/TransactionHistory.tsx` menambah overlay preview gambar struk untuk mobile
- `src/app/receipt/[id]/page.tsx` perbaikan tata letak alamat di struk publik

## Verifikasi cepat
- `npm run build`
- `npm run verify-apk` (opsional)
- Fitur yang harus tetap ada:
  - Tombol unduh di checkout dan history menampilkan preview mobile, auto-download tetap untuk desktop
  - Struk tetap menampilkan `Catatan:` hanya sekali (dengan de-duplication logic)

## Catatan keamanan
- Jangan hapus referensi `item.notes` dan `productName.includes(...)` de-dup detection di checkout/history.
- Jangan hapus overlay preview `mobileReceiptImg` di kedua komponen, atau mobile user kehilangan cara simpan struk.
