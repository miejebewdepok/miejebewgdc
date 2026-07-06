"use client";

import React from "react";
import { Download, Smartphone, ShieldCheck, CheckCircle2, ChevronRight, HelpCircle } from "lucide-react";
import Link from "next/link";

export default function UnduhPage() {
  const version = "1.2.0-direct-print";
  const lastUpdated = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col justify-between selection:bg-red-500/30 selection:text-red-200">
      {/* Background Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-650/15 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] bg-amber-600/10 rounded-full blur-[130px] pointer-events-none"></div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 w-full z-10 flex-1 flex flex-col justify-center">
        {/* Header Branding */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-red-500/10 border border-red-500/20 rounded-3xl mb-4 shadow-lg shadow-red-500/5 animate-pulse">
            <Smartphone className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase">
            MIE JEBEW GDC <span className="text-red-500">KASIR APP</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base mt-2 max-w-md mx-auto">
            Unduh aplikasi kasir native Android untuk Tablet & HP Android Anda. Mendukung cetak struk langsung via Bluetooth.
          </p>
        </div>

        {/* Download & Info Cards */}
        <div className="grid md:grid-cols-5 gap-6 items-stretch">
          {/* Left Side: Main Download Card */}
          <div className="md:col-span-3 bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col justify-between relative shadow-xl">
            <div className="absolute top-4 right-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-xl tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Siap Unduh
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-1">Aplikasi Android (.APK)</h2>
              <p className="text-xs text-slate-400 font-mono">Versi: {version}</p>
              
              <div className="mt-6 space-y-3.5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-slate-300">
                    Cetak struk thermal langsung via Bluetooth (Opsi 2)
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-slate-300">
                    Performa lebih cepat dibanding web browser
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-slate-300">
                    Optimasi tampilan layar penuh untuk tablet & HP
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5">
              <a
                href="/app-release.apk"
                className="w-full bg-gradient-to-r from-red-650 to-red-550 hover:from-red-600 hover:to-red-500 text-white rounded-2xl py-4 font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-red-600/20 active:scale-[0.98] cursor-pointer"
              >
                <Download className="w-4 h-4" /> UNDUH APK SEKARANG
              </a>
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-3 px-1">
                <span>Ukuran: ~10 MB</span>
                <span>Diperbarui: {lastUpdated}</span>
              </div>
            </div>
          </div>

          {/* Right Side: Setup Guide Card */}
          <div className="md:col-span-2 bg-slate-900/30 backdrop-blur-md border border-white/5 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-2 mb-4 text-red-400">
                <HelpCircle className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Petunjuk Instal</h3>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-slate-350 shrink-0 mt-0.5">1</span>
                  <div>
                    <h4 className="text-xs font-bold text-white">Unduh File</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Tekan tombol unduh merah di sebelah kiri.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-slate-350 shrink-0 mt-0.5">2</span>
                  <div>
                    <h4 className="text-xs font-bold text-white">Izinkan Sumber Lain</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Jika HP menanyakan izin, aktifkan &quot;Izinkan instal dari sumber tidak dikenal&quot;.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-slate-350 shrink-0 mt-0.5">3</span>
                  <div>
                    <h4 className="text-xs font-bold text-white">Sambung Bluetooth</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Pastikan printer Bluetooth RPP02N sudah terhubung (*paired*) di HP/Tablet.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Bebas Virus & Malware
              </span>
              <Link href="/kasir" className="text-[11px] text-red-400 hover:text-red-300 font-bold flex items-center gap-0.5 transition-colors">
                Kembali <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="w-full text-center py-6 border-t border-white/5 z-10">
        <p className="text-[10px] text-slate-550 uppercase tracking-widest">
          © {new Date().getFullYear()} MIE JEBEW GDC. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
