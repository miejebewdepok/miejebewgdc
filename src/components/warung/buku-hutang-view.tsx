// @ts-nocheck
"use client";

import { useAppState } from "@/components/providers/app-state-provider";
import FinancialReport from "./gdc/FinancialReport";

export function BukuHutangView() {
  const { transactions } = useAppState();

  return (
    <div className="w-full h-full flex flex-col">
      <FinancialReport transactions={transactions} />
    </div>
  );
}
