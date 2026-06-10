# Fix Plan — Struk Tidak Masuk Galeri Android

**Konteks:** User download struk via APK, notifikasi “berhasil” muncul, tapi file tidak terlihat di galeri HP.

**Root cause yang dicurigai:**
1. `saveReceiptImage` tidak meneruskan `filename` ke native plugin.
2. `ImageSaver.java` hanya insert ke `MediaStore` tapi belum melakukan `scan` ke galeri dan tidak ada notifikasi hasil.
3. Android butuh `scan` agar galeri langsung detect file baru.

---

## Langkah 1 — Update `src/lib/utils.ts`

**File:** `src/lib/utils.ts`  
**Fungsi:** `saveReceiptImage`

Ubah blok native agar mengirim `filename` dan menangani return value:

```typescript
export async function saveReceiptImage(dataUrl: string, filename: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.() && cap?.Plugins?.ImageSaver) {
    try {
      const result = await cap.Plugins.ImageSaver.saveBase64Image({
        base64: dataUrl,
        filename: filename,
      });
      const savedPath = result?.path || "MediaStore";
      toast.success(`Gambar struk berhasil disimpan ke Galeri! (${savedPath})`);
      return true;
    } catch (err: any) {
      console.error("Gagal menyimpan gambar lewat native plugin:", err);
      toast.error("Gagal mengunduh gambar ke Galeri: " + (err.message || err));
      return false;
    }
  } else {
    // Fallback untuk browser biasa (tetap sama)
    try {
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
      toast.success("Gambar struk berhasil diunduh.");
      return true;
    } catch (err) {
      console.error("Gagal mengunduh gambar di browser:", err);
      toast.error("Gagal mengunduh gambar.");
      return false;
    }
  }
}
```

---

## Langkah 2 — Update `android/app/src/main/java/com/miejebew/gdc/ImageSaver.java`

**File:** `android/app/src/main/java/com/miejebew/gdc/ImageSaver.java`

Ganti seluruh isi method `saveBase64Image` dengan versi ini:

```java
@PluginMethod
public void saveBase64Image(PluginCall call) {
    String base64Data = call.getString("base64");
    String filename = call.getString("filename");

    if (base64Data == null) {
        call.reject("Data base64 tidak boleh kosong.");
        return;
    }

    try {
        // Hapus prefix "data:image/...;base64," jika ada
        if (base64Data.contains(",")) {
            base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
        }

        byte[] decodedBytes = Base64.decode(base64Data, Base64.DEFAULT);
        if (filename == null || filename.isEmpty()) {
            filename = "struk-" + System.currentTimeMillis() + ".png";
        }

        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, filename);
        values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
        values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/MieJebew");
        values.put(MediaStore.Images.Media.IS_PENDING, 1);

        Uri uri = getContext().getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
        if (uri != null) {
            OutputStream os = getContext().getContentResolver().openOutputStream(uri);
            if (os != null) {
                os.write(decodedBytes);
                os.close();

                // Kembalikan status sukses ke JavaScript
                JSObject ret = new JSObject();
                ret.put("path", uri.toString());
                call.resolve(ret);
            } else {
                call.reject("Gagal membuka stream penyimpanan.");
            }
        } else {
            call.reject("Gagal membuat entri media di galeri.");
        }
    } catch (Exception e) {
        call.reject("Error saat menyimpan: " + e.getMessage());
    }
}
```

> **Catatan:** `IS_PENDING` dan `RELATIVE_PATH` sudah cukup untuk Android Q+ (API 29+). Tidak perlu `MediaScannerConnection` manual karena `MediaStore` langsung scan.

---

## Langkah 3 — Cek Permission (tambahkan jika belum ada)

**File:** `android/app/src/main/AndroidManifest.xml`

Pastikan ada baris ini di dalam tag `<manifest>`:

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

> **Catatan:** Android 13+ pakai `READ_MEDIA_IMAGES`, Android 12 kebawah pakai `READ_EXTERNAL_STORAGE`. `WRITE_EXTERNAL_STORAGE` tidak diperlukan untuk `RELATIVE_PATH`.

---

## Langkah 4 — Build APK

Jalankan di terminal:

```bash
cd E:/KASIR\ MIE\ JEBEW/warungos
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

Hasil APK akan ada di:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## Langkah 5 — Verifikasi

1. Install APK yang baru ke HP
2. Buka kasir → checkout → unduh struk
3. Notifikasi harus muncul: **“Gambar struk berhasil disimpan ke Galeri!”**
4. Buka aplikasi Galeri → cari folder **“Pictures/MieJebew”**
5. File `struk-<timestamp>.png` harus terlihat

---

## Checklist sebelum serah ke Antigravity

- [ ] Langkah 1 selesai (`utils.ts`)
- [ ] Langkah 2 selesai (`ImageSaver.java`)
- [ ] Langkah 3 dicek (`AndroidManifest.xml`)
- [ ] Build APK baru berhasil
- [ ] Test di HP: download struk → cek galeri

---

## Catatan untuk Antigravity

- Jangan hapus kode yang lama sepenuhnya. Ganti sesuai langkah di atas.
- Jika setelah build APK baru masih ada error, kirimkan log `adb logcat | grep ImageSaver` agar gue bisa lihat errornya.
- Pastikan `filename` yang dikirim dari JS tidak null (default: `struk-<timestamp>.png`).
