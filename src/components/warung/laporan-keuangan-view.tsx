// @ts-nocheck
"use client";

import dynamic from "next/dynamic";
import { useAppState } from "@/components/providers/app-state-provider";
import { useSession } from "@/lib/auth-client";

const FinancialReport = dynamic(() => import("./gdc/FinancialReport"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-red-500/20 border-t-red-500 animate-spin" />
        <span className="text-xs text-slate-500 font-bold font-sans">Memuat Laporan Keuangan...</span>
      </div>
    </div>
  ),
});

export function LaporanKeuanganView() {
  const { transactions } = useAppState();
  const { data: session } = useSession();
  const userEmail = session?.user?.email;

  if (userEmail === "miejebew.crew@gmail.com") {
    return (
      <div className="w-full h-full flex items-center justify-center p-8 bg-slate-900/10 dark:bg-slate-950/20">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 rounded-[32px] shadow-xl text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center text-red-650 dark:text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Akses Terbatas</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 leading-relaxed">
              Maaf, akun Anda (<strong>{userEmail}</strong>) tidak memiliki izin untuk melihat laporan keuangan restoran. Silakan hubungi pemilik restoran untuk informasi lebih lanjut.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <FinancialReport transactions={transactions} />
    </div>
  );
}
