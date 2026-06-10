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
