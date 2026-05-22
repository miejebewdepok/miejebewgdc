// @ts-nocheck
"use client";

import { useAppState } from "@/components/providers/app-state-provider";
import TransactionHistory from "./gdc/TransactionHistory";

export function LaporanView() {
  const { transactions } = useAppState();

  return (
    <div className="w-full h-full flex flex-col">
      <TransactionHistory transactions={transactions} />
    </div>
  );
}
