import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
