// @ts-nocheck
"use client";

import dynamic from "next/dynamic";
import { useAppState } from "@/components/providers/app-state-provider";

const TransactionHistory = dynamic(() => import("./gdc/TransactionHistory"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-red-500/20 border-t-red-500 animate-spin" />
        <span className="text-xs text-slate-500 font-bold font-sans">Memuat Riwayat Penjualan...</span>
      </div>
    </div>
  ),
});

export function LaporanView() {
  const { transactions } = useAppState();

  return (
    <div className="w-full h-full flex flex-col">
      <TransactionHistory transactions={transactions} />
    </div>
  );
}
