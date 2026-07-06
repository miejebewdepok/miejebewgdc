import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isMobileOrWebView(): boolean {
  if (typeof window === "undefined") return false;

  if ((window as any).Capacitor?.isNativePlatform?.()) return true;

  const ua = window.navigator.userAgent.toLowerCase();
  const isAndroidWebView = ua.includes("wv") || (ua.includes("android") && ua.includes("version/"));
  const isIOSWebView = (ua.includes("ipad") || ua.includes("iphone")) && !ua.includes("safari") && !ua.includes("crios") && !ua.includes("fxios");
  const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);

  return isAndroidWebView || isIOSWebView || isMobileDevice;
}

export async function saveReceiptImage(dataUrl: string, filename: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.() && cap?.Plugins?.ImageSaver) {
    try {
      const result = await cap.Plugins.ImageSaver.saveBase64Image({
        base64: dataUrl,
        filename,
      });

      const savedPath = result?.path || "MediaStore";
      if (savedPath === "MediaStore") {
        toast.success("Gambar struk berhasil disimpan ke Galeri!");
      } else {
        toast.success("Gambar struk berhasil disimpan ke Galeri!");
      }

      return true;
    } catch (err: any) {
      console.error("Gagal menyimpan gambar lewat native plugin:", err);
      toast.error("Gagal mengunduh gambar ke Galeri: " + (err?.message || err));
      return false;
    }
  }

  // Fallback untuk browser biasa
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

export async function triggerPrint(): Promise<void> {
  if (typeof window === "undefined") return;

  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.()) {
    if (cap?.Plugins?.ImageSaver?.printPage) {
      try {
        await cap.Plugins.ImageSaver.printPage();
      } catch (err: any) {
        toast.error("Gagal cetak native: " + (err?.message || err));
      }
    } else {
      toast.error("Fitur cetak native tidak didukung pada aplikasi versi ini.");
    }
  } else {
    try {
      window.print();
    } catch (e: any) {
      toast.error("Gagal membuka jendela cetak.");
    }
  }
}

class EscPosBuilder {
  private buffer: number[] = [];
  private encoder = new TextEncoder();

  init() {
    this.buffer.push(0x1B, 0x40); // ESC @ (Initialize)
    this.buffer.push(0x1B, 0x32); // ESC 2 (Default line spacing)
    return this;
  }

  alignCenter() {
    this.buffer.push(0x1B, 0x61, 0x01);
    return this;
  }

  alignLeft() {
    this.buffer.push(0x1B, 0x61, 0x00);
    return this;
  }

  alignRight() {
    this.buffer.push(0x1B, 0x61, 0x02);
    return this;
  }

  boldOn() {
    this.buffer.push(0x1B, 0x45, 0x01);
    return this;
  }

  boldOff() {
    this.buffer.push(0x1B, 0x45, 0x00);
    return this;
  }

  doubleSizeOn() {
    this.buffer.push(0x1D, 0x21, 0x11); // GS ! 17 (Double width & height)
    return this;
  }

  doubleSizeOff() {
    this.buffer.push(0x1D, 0x21, 0x00);
    return this;
  }

  text(str: string) {
    const bytes = this.encoder.encode(str);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  line(str: string = "") {
    this.text(str + "\n");
    return this;
  }

  feed(lines: number = 1) {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(0x0A);
    }
    return this;
  }

  cut() {
    this.buffer.push(0x1D, 0x56, 0x42, 0x00); // GS V 66 0 (Cut paper)
    return this;
  }

  getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

function formatLeftRight(left: string, right: string, maxLen: number): string {
  const spaceCount = maxLen - left.length - right.length;
  if (spaceCount <= 0) {
    return left + " " + right;
  }
  return left + " ".repeat(spaceCount) + right;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export async function printReceiptBluetooth(tx: any, settings: any): Promise<void> {
  const cap = (window as any).Capacitor;
  if (!cap?.isNativePlatform?.()) {
    toast.error("Pencetakan Bluetooth langsung hanya didukung di HP/Tablet.");
    return;
  }

  try {
    const maxChars = settings?.printerPaperSize === '80mm' ? 48 : 32;

    const builder = new EscPosBuilder();
    builder.init();

    // 1. Header (Centered, Store Name bold/large)
    builder.alignCenter().doubleSizeOn().boldOn();
    builder.line(settings?.merchantName || "MIE JEBEW GDC");
    builder.doubleSizeOff().boldOff();
    
    // Address & Phone
    builder.line(settings?.merchantAddress || "Jl. Boulevard Grand Depok City, Depok");
    builder.line(`Telp / WA: ${settings?.merchantPhone || "0812-xxxx-xxxx"}`);
    builder.feed(1);

    // Dashed Line
    builder.alignLeft();
    builder.line("-".repeat(maxChars));

    // 2. Transaction Details
    builder.line(`Invoice: ${tx.id}`);
    const date = new Date(tx.createdAt);
    const formattedDate = date.toLocaleDateString('id-ID') + " " + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    builder.line(`Tanggal: ${formattedDate}`);
    
    let cashierName = settings?.userProfileName || settings?.ownerName || 'Rania';
    if (cashierName.toLowerCase().includes("mie jebew")) {
      cashierName = "Rania";
    }
    builder.line(`Kasir  : ${cashierName}`);
    
    let custName = tx.customerName || 'Umum';
    custName = custName.replace(/meja/gi, 'Order').replace(/self\s*order/gi, 'Order');
    builder.line(`Pelang  : ${custName}`);
    builder.line(`Metode : ${tx.paymentMethod.toUpperCase()}`);
    builder.line("-".repeat(maxChars));

    // 3. Item List Header
    builder.line(formatLeftRight("Menu", "Total", maxChars));
    builder.line("-".repeat(maxChars));

    // Items
    for (const item of tx.items) {
      const finalPrice = item.sellPrice || item.unitPrice || 0;
      const productName = item.productName || item.product?.name || 'Menu';
      
      // Print product name and variants
      const nameLines = productName.split('\n');
      builder.boldOn();
      builder.line(nameLines[0]);
      builder.boldOff();

      // Print variant details
      for (let i = 1; i < nameLines.length; i++) {
        builder.line(`  >> ${nameLines[i]}`);
      }

      // Print notes if any
      if (item.notes && !productName.toLowerCase().includes(item.notes.toLowerCase())) {
        builder.line(`  * ${item.notes}`);
      }

      // Format qty & price line
      const qtyStr = `${item.quantity} x ${finalPrice.toLocaleString('id-ID')}`;
      const sumStr = (finalPrice * item.quantity).toLocaleString('id-ID');
      builder.line(formatLeftRight(`  ${qtyStr}`, sumStr, maxChars));
    }

    builder.line("-".repeat(maxChars));

    // 4. Summaries
    const subtotal = tx.items.reduce((acc: number, item: any) => {
      const finalPrice = item.sellPrice || item.unitPrice || 0;
      return acc + (finalPrice * item.quantity);
    }, 0);

    builder.line(formatLeftRight("Subtotal:", subtotal.toLocaleString('id-ID'), maxChars));

    if (tx.discountAmount > 0) {
      builder.line(formatLeftRight("Diskon:", "-" + tx.discountAmount.toLocaleString('id-ID'), maxChars));
    }

    const serviceCharge = tx.serviceCharge || 0;
    if (serviceCharge > 0) {
      builder.line(formatLeftRight("Biaya Layanan:", serviceCharge.toLocaleString('id-ID'), maxChars));
    }

    const taxRate = settings?.taxRate || 0;
    if (taxRate > 0) {
      const taxAmount = Math.round(subtotal * (taxRate / 100));
      builder.line(formatLeftRight(`Pajak (${taxRate}%):`, taxAmount.toLocaleString('id-ID'), maxChars));
    }

    builder.line("-".repeat(maxChars));
    builder.boldOn();
    builder.line(formatLeftRight("TOTAL AKHIR:", tx.total.toLocaleString('id-ID'), maxChars));
    builder.boldOff();

    builder.line(formatLeftRight("Bayar:", tx.amountPaid.toLocaleString('id-ID'), maxChars));
    
    const changeAmount = tx.change || 0;
    builder.line(formatLeftRight("Kembali:", changeAmount.toLocaleString('id-ID'), maxChars));
    builder.line("-".repeat(maxChars));

    // 5. Footer greetings
    builder.alignCenter();
    builder.line(settings?.receiptHeader || "TERIMA KASIH");
    builder.line(settings?.receiptFooter || "ATAS KUNJUNGAN ANDA");
    builder.line(`*** IG: @miejebew.gdc ***`);
    builder.feed(4);
    builder.cut();

    // Convert bytes to base64
    const uint8Bytes = builder.getBytes();
    const base64Bytes = uint8ArrayToBase64(uint8Bytes);

    // Call native plugin
    await cap.Plugins.ImageSaver.printBluetooth({ bytes: base64Bytes });
    toast.success("Struk berhasil dikirim ke printer!");

  } catch (err: any) {
    toast.error("Gagal cetak Bluetooth: " + (err?.message || err));
  }
}
