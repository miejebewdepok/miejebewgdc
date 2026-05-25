/**
 * Service untuk mengelola integrasi notifikasi WhatsApp.
 * Mendukung pengiriman asli menggunakan penyedia Fonnte API dan fallback simulasi/mock
 * yang mencetak pesan terformat indah ke dalam log server jika kredensial belum dikonfigurasi.
 */

import { formatCurrency } from "../format";

export interface WhatsappSendResult {
  success: boolean;
  provider: "fonnte" | "mock";
  target: string;
  message: string;
  error?: string;
}

/**
 * Mengirim pesan WhatsApp mentah ke nomor tujuan.
 */
export async function sendWhatsappMessage(to: string, message: string): Promise<WhatsappSendResult> {
  const provider = (process.env.WHATSAPP_PROVIDER ?? "mock").toLowerCase();
  const token = process.env.WHATSAPP_API_TOKEN ?? "";
  const target = to.trim();

  // Bersihkan format nomor HP (e.g., hilangkan spasi/strip/tanda tambah)
  let normalizedTarget = target.replace(/[^0-9]/g, "");
  // Ubah awalan '08' menjadi format internasional '628' jika belum
  if (normalizedTarget.startsWith("0")) {
    normalizedTarget = "62" + normalizedTarget.slice(1);
  }

  // Jika penyedia diatur ke fonnte dan token tersedia
  if (provider === "fonnte" && token && token !== "mock-token") {
    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: normalizedTarget,
          message: message,
        }),
      });

      const data = await response.json().catch(() => null) as { status: boolean; detail?: string } | null;

      if (response.ok && data?.status) {
        console.log(`[WHATSAPP-FONNTE] Berhasil dikirim ke ${normalizedTarget}`);
        return {
          success: true,
          provider: "fonnte",
          target: normalizedTarget,
          message,
        };
      } else {
        const errMsg = data?.detail ?? response.statusText ?? "Fonnte API rejection.";
        console.warn(`[WHATSAPP-FONNTE] Gagal mengirim ke ${normalizedTarget}: ${errMsg}`);
        return {
          success: false,
          provider: "fonnte",
          target: normalizedTarget,
          message,
          error: errMsg,
        };
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Network error";
      console.error(`[WHATSAPP-FONNTE] Kesalahan jaringan ke ${normalizedTarget}:`, error);
      return {
        success: false,
        provider: "fonnte",
        target: normalizedTarget,
        message,
        error: errMsg,
      };
    }
  }

  // Fallback MOCK LOGGING dengan desain premium di terminal
const border = "=".repeat(60);
  console.log(`
${border}
📢 [MIE-JEBEW-GDC-SIMULASI-WHATSAPP]
------------------------------------------------------------
Penyedia : MOCK / SIMULASI (Set WHATSAPP_PROVIDER=fonnte & WHATSAPP_API_TOKEN di .env untuk asli)
Tujuan   : ${normalizedTarget} (${target})
Pesan    :
${message}
${border}
`);

  return {
    success: true,
    provider: "mock",
    target: normalizedTarget,
    message,
  };
}

/**
 * Mengirim notifikasi otomatis ke pemilik warung ketika stok produk menipis.
 */
export async function sendStockAlert(
  productName: string,
  currentStock: number,
  threshold: number
): Promise<WhatsappSendResult | null> {
  const receiver = process.env.WHATSAPP_RECEIVER_STOK ?? "";
  if (!receiver || receiver === "-" || receiver.trim().length < 8) {
    console.log("[WHATSAPP] Peringatan stok dilewati karena nomor penerima tidak valid di .env.");
    return null;
  }

  const message = [
    `⚠️ *PERINGATAN STOK MENIPIS — MIE JEBEW GDC*`,
    `Halo Pak/Bu Pemilik Warung, produk berikut ini membutuhkan perhatian Anda:`,
    ``,
    `📦 *Nama Barang:* ${productName}`,
    `📉 *Sisa Stok:* _${currentStock} unit_`,
    `🔔 *Batas Minimum:* ${threshold} unit`,
    ``,
    `Segera hubungi supplier atau lakukan restok agar penjualan di aplikasi kasir tidak terganggu!`,
    `_Dikirim otomatis oleh sistem asisten pintar MIE JEBEW GDC._`,
  ].join("\n");

  return sendWhatsappMessage(receiver, message);
}

/**
 * Mengirim pesan tagihan kasbon yang sopan dan ramah ke WhatsApp pelanggan.
 */
export async function sendDebtReminderAlert(
  borrowerName: string,
  amount: number,
  dueDateStr: string,
  toPhoneNumber: string
): Promise<WhatsappSendResult> {
  // Format tanggal tempo menjadi tampilan yang cantik
  let formattedDueDate = dueDateStr;
  try {
    const d = new Date(dueDateStr);
    formattedDueDate = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    formattedDueDate = dueDateStr.slice(0, 10);
  }

  const message = [
    `Halo kak *${borrowerName}*,`,
    `Semoga sehat selalu ya. 😊`,
    ``,
    `Kami dari pihak pengelola warung ingin menginformasikan perihal catatan kasbon belanja kakak yang terdaftar di sistem kami:`,
    ``,
    `💰 *Jumlah Kasbon:* ${formatCurrency(amount)}`,
    `📅 *Tanggal Jatuh Tempo:* ${formattedDueDate}`,
    ``,
    `Mohon kesediaannya untuk melakukan penyelesaian sebelum atau tepat pada tanggal tersebut demi kelancaran administrasi warung kami. Pembayaran bisa dilakukan langsung di warung (tunai) atau via transfer/QRIS.`,
    ``,
    `Terima kasih banyak atas kerja sama dan pengertiannya! 🙏`,
  ].join("\n");

  return sendWhatsappMessage(toPhoneNumber, message);
}

/**
 * Memeriksa apakah nomor WhatsApp valid dan aktif (jika menggunakan Fonnte).
 * Jika menggunakan mock, kita lakukan validasi regex format Indonesia dan deteksi fraud sederhana.
 */
export async function validateWhatsappNumber(phone: string): Promise<{ valid: boolean; message?: string }> {
  const target = phone.trim();
  const digitsOnly = target.replace(/[^0-9]/g, "");

  // 1. Validasi Regex untuk format nomor seluler Indonesia
  // Awalan harus 08 atau 628 atau +628. Panjang digit harus 10 s.d 13.
  let cleanNum = digitsOnly;
  if (cleanNum.startsWith("0")) {
    cleanNum = "62" + cleanNum.slice(1);
  }

  // Indonesian mobile numbers start with 628... and have 10-13 digits
  const indoMobileRegex = /^628[1-9][0-9]{7,10}$/;
  if (!indoMobileRegex.test(cleanNum)) {
    return {
      valid: false,
      message: "Nomor WhatsApp tidak valid. Format nomor seluler Indonesia yang benar harus diawali 08xx atau 628xx dengan panjang 10-13 digit."
    };
  }

  // Deteksi kecurangan: Angka berulang yang mencurigakan (misal: 6288888888888, 6281212121212)
  if (/^628(\d)\1{6,9}$/.test(cleanNum)) {
    return {
      valid: false,
      message: "Nomor WhatsApp mencurigakan (mengandung pola angka berulang)."
    };
  }
  
  // Pola berurutan seperti 123456 atau 654321
  const sequentialPatterns = ["123456", "234567", "345678", "456789", "987654", "876543", "765432", "654321"];
  for (const pattern of sequentialPatterns) {
    if (cleanNum.includes(pattern)) {
      return {
        valid: false,
        message: "Nomor WhatsApp mencurigakan (mengandung pola angka berurutan)."
      };
    }
  }

  // 2. Hubungi API Fonnte untuk verifikasi nomor aktif sesungguhnya jika provider diatur ke fonnte
  const provider = (process.env.WHATSAPP_PROVIDER ?? "mock").toLowerCase();
  const token = process.env.WHATSAPP_API_TOKEN ?? "";

  if (provider === "fonnte" && token && token !== "mock-token") {
    try {
      const response = await fetch("https://api.fonnte.com/validate", {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: cleanNum,
        }),
      });

      const data = await response.json().catch(() => null) as { status: boolean; registered?: string[]; not_registered?: string[] } | null;

      if (response.ok && data?.status) {
        const isRegistered = data.registered && data.registered.includes(cleanNum);
        if (!isRegistered) {
          return {
            valid: false,
            message: "Nomor WhatsApp ini tidak terdaftar atau tidak aktif di sistem WhatsApp."
          };
        }
      }
    } catch (error) {
      console.error("[WHATSAPP-VALIDASI] Kesalahan jaringan saat validasi:", error);
      // Fallback ke true agar jika Fonnte mati, transaksi pelanggan tidak terganggu (fail-safe)
    }
  }

  return { valid: true };
}
