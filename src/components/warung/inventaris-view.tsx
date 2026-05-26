"use client";

import { useState, useMemo } from "react";
import { useAppState } from "@/components/providers/app-state-provider";
import ManageProductsModal from "./gdc/ManageProductsModal";

export function InventarisView() {
  const { products, addProduct, updateProduct, deleteProduct } = useAppState();

  // Local storage for categories — synced with kasir using same key & defaults
  const [localCategories, setLocalCategories] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("miejebew_categories_v4");
      return saved ? JSON.parse(saved) : ["Mie Pedas", "Lumpia Beef", "Kebab", "Snack", "Qalla Coffee", "Qalla Tea", "Qalla Juice"];
    }
    return ["Mie Pedas", "Lumpia Beef", "Kebab", "Snack", "Qalla Coffee", "Qalla Tea", "Qalla Juice"];
  });

  // Keep categories updated with any new ones dynamically found in products and sort strictly
  const categories = useMemo(() => {
    const list = Array.from(
      new Set([
        ...localCategories,
        ...products.map((p) => p.category).filter(Boolean),
      ])
    );

    const CATEGORY_WEIGHT: Record<string, number> = {
      'Mie Pedas':    1,
      'Lumpia Beef':  2,
      'Kebab':        3,
      'Snack':        4,
      'Qalla Coffee': 5,
      'Qalla Tea':    6,
      'Qalla Juice':  7,
    };

    list.sort((a, b) => {
      const wA = CATEGORY_WEIGHT[a] !== undefined ? CATEGORY_WEIGHT[a] : 999;
      const wB = CATEGORY_WEIGHT[b] !== undefined ? CATEGORY_WEIGHT[b] : 999;
      return wA - wB;
    });

    return list;
  }, [localCategories, products]);

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
