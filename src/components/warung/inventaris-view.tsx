"use client";

import { useState } from "react";
import { useAppState } from "@/components/providers/app-state-provider";
import ManageProductsModal from "./gdc/ManageProductsModal";

export function InventarisView() {
  const { products, addProduct, updateProduct, deleteProduct } = useAppState();

  // Local storage for categories — synced with kasir using same key & defaults
  const [localCategories, setLocalCategories] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("miejebew_categories_v4");
      return saved ? JSON.parse(saved) : ["Mie Pedas", "Lumpia Beef", "Kebab", "Qalla Coffee", "Tea Series", "Snack"];
    }
    return ["Mie Pedas", "Lumpia Beef", "Kebab", "Qalla Coffee", "Tea Series", "Snack"];
  });

  // Keep categories updated with any new ones dynamically found in products
  const categories = Array.from(
    new Set([
      ...localCategories,
      ...products.map((p) => p.category).filter(Boolean),
    ])
  );

  const handleUpdateCategories = (newCats: string[]) => {
    setLocalCategories(newCats);
    localStorage.setItem("miejebew_categories_v4", JSON.stringify(newCats));
  };

  return (
    <div className="w-full h-[calc(100vh-100px)] md:h-[calc(100vh-130px)] flex flex-col overflow-hidden">
      <ManageProductsModal
        products={products}
        categories={categories}
        onUpdateCategories={handleUpdateCategories}
        onAddProduct={async (p: any) => {
          try {
            await addProduct({
              name: p.name,
              category: p.category,
              buyPrice: p.price ? Math.round(p.price * 0.7) : 0,
              sellPrice: p.price ?? 0,
              stock: p.stock !== undefined ? p.stock : 50,
              minimumStock: 5,
              description: "Menu asli Mie Jebew GDC",
              imageUrl: p.image || null,
            });
          } catch (err: any) {
            console.error("Gagal menambahkan produk:", err);
            alert("Gagal menambahkan produk: " + err.message);
          }
        }}
        onUpdateProduct={async (p: any) => {
          try {
            await updateProduct(p.id, {
              name: p.name,
              category: p.category,
              buyPrice: p.price ? Math.round(p.price * 0.7) : 0,
              sellPrice: p.price ?? p.sellPrice ?? 0,
              stock: p.stock !== undefined ? p.stock : 50,
              minimumStock: 5,
              description: "Menu asli Mie Jebew GDC",
              imageUrl: p.image || p.imageUrl || null,
            });
          } catch (err: any) {
            console.error("Gagal memperbarui produk:", err);
            alert("Gagal memperbarui produk: " + err.message);
          }
        }}
        onDeleteProduct={async (id) => {
          try {
            await deleteProduct(id);
          } catch (err: any) {
            console.error("Gagal menghapus produk:", err);
            alert("Gagal menghapus produk: " + err.message);
          }
        }}
      />
    </div>
  );
}
