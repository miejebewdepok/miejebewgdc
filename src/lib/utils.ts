import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast } from "sonner"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isMobileOrWebView(): boolean {
  if (typeof window === "undefined") return false;
  
  // 1. Capacitor native platform detection
  if ((window as any).Capacitor?.isNativePlatform?.()) return true;
  
  // 2. User Agent checks
  const ua = window.navigator.userAgent.toLowerCase();
  
  // WebView detection (Android wv/version, iOS without Safari)
  const isAndroidWebView = ua.includes('wv') || (ua.includes('android') && ua.includes('version/'));
  const isIOSWebView = (ua.includes('ipad') || ua.includes('iphone')) && !ua.includes('safari') && !ua.includes('crios') && !ua.includes('fxios');
  
  // Generic mobile check to block desktop print/popup interactions on touch/mobile clients
  const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  
  return isAndroidWebView || isIOSWebView || isMobileDevice;
}

export async function saveReceiptImage(dataUrl: string, filename: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.() && cap?.Plugins?.ImageSaver) {
    try {
      await cap.Plugins.ImageSaver.saveBase64Image({ base64: dataUrl });
      toast.success("Gambar struk berhasil diunduh ke Galeri!");
      return true;
    } catch (err: any) {
      console.error("Gagal menyimpan gambar lewat native plugin:", err);
      toast.error("Gagal mengunduh gambar ke Galeri: " + (err.message || err));
      return false;
    }
  } else {
    // Fallback untuk browser biasa
    try {
      const link = document.createElement('a');
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
