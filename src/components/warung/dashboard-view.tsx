"use client";

import { useAppState } from "@/components/providers/app-state-provider";
import Dashboard from "./gdc/Dashboard";
import { useRouter } from "next/navigation";

export function DashboardView() {
  const { products, transactions, updateProduct, savedBills, loadBill, deleteBill } = useAppState();
  const router = useRouter();

  return (
    <div className="w-full h-full flex flex-col">
      <Dashboard
        products={products}
        transactions={transactions}
        savedBills={savedBills}
        onLoadBill={(id) => {
          loadBill(id);
          router.push("/kasir");
        }}
        onDeleteBill={deleteBill}
        onUpdateProduct={(p) => {
          updateProduct(p.id, {
            name: p.name,
            category: p.category,
            buyPrice: p.buyPrice || 0,
            sellPrice: p.sellPrice || 0,
            stock: p.stock || 0,
            minimumStock: 5,
            description: "",
            imageUrl: p.imageUrl,
          });
        }}
        setActiveTab={(tab) => {
          if (tab === "pos") router.push("/kasir");
          if (tab === "manage") router.push("/inventaris");
          if (tab === "settings") router.push("/pengaturan");
          if (tab === "history") router.push("/laporan");
        }}
      />
    </div>
  );
}
