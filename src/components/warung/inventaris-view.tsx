"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppState } from "@/components/providers/app-state-provider";
import { useSession } from "@/lib/auth-client";
import ManageProductsModal from "./gdc/ManageProductsModal";

export function InventarisView() {
  const { products, addProduct, updateProduct, deleteProduct, settings, updateSettings } = useAppState();
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
              Maaf, akun Anda (<strong>{userEmail}</strong>) tidak memiliki izin untuk mengelola menu dan produk. Silakan hubungi pemilik restoran untuk informasi lebih lanjut.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const defaultCategories = useMemo(() => {
    if (userEmail === "miejebew.depok@gmail.com") {
      return ["Mie Pedas", "Mie Tek Tek", "Pangsit", "Tea Series", "Delight Series"];
    }
    if (
      userEmail === "taufiqrusdhi.ez@gmail.com" ||
      userEmail === "miejebew.crew@gmail.com"
    ) {
      return ["Mie Pedas", "Lumpia Beef", "Kebab", "Snack", "Qalla Coffee", "Qalla Tea", "Qalla Juice"];
    }
    return [];
  }, [userEmail]);

  // Local storage for categories — synced with kasir using user-isolated keys
  const [localCategories, setLocalCategories] = useState<string[] | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && userEmail !== undefined) {
      const storageKey = userEmail ? `miejebew_categories_v4_${userEmail}` : "miejebew_categories_v4";
      let saved = localStorage.getItem(storageKey);
      
      // Auto-migrate old categories for the main owner if they don't have user-isolated categories yet
      if (!saved && userEmail === "taufiqrusdhi.ez@gmail.com") {
        const oldSaved = localStorage.getItem("miejebew_categories_v4");
        if (oldSaved) {
          saved = oldSaved;
          localStorage.setItem(storageKey, oldSaved);
        }
      }

      if (saved) {
        const parsed = JSON.parse(saved);
        if (userEmail === "miejebew.depok@gmail.com" && !parsed.includes("Mie Pedas")) {
          setLocalCategories(defaultCategories);
          localStorage.setItem(storageKey, JSON.stringify(defaultCategories));
        } else {
          setLocalCategories(parsed);
        }
      } else {
        setLocalCategories(defaultCategories);
      }
    }
  }, [defaultCategories, userEmail]);

  // Keep categories updated with any new ones dynamically found in products and sort strictly
  const categories = useMemo(() => {
    const cats = localCategories !== null ? localCategories : defaultCategories;
    const mappedProductCategories = products.map((p) => {
      if (p.category?.toLowerCase() === "chocolatte") return "Delight Series";
      return p.category;
    });
    const list = Array.from(
      new Set([
        ...cats,
        ...mappedProductCategories.filter(Boolean),
      ])
    );

    const CATEGORY_WEIGHT: Record<string, number> = {
      'Mie Pedas':    1,
      'Mie Tek Tek':  2,
      'Pangsit':      3,
      'Tea Series':   4,
      'Delight Series': 5,
      'Lumpia Beef':  12,
      'Kebab':        13,
      'Snack':        14,
      'Qalla Coffee': 15,
      'Qalla Tea':    16,
      'Qalla Juice':  17,
    };

    list.sort((a, b) => {
      const wA = CATEGORY_WEIGHT[a] !== undefined ? CATEGORY_WEIGHT[a] : 999;
      const wB = CATEGORY_WEIGHT[b] !== undefined ? CATEGORY_WEIGHT[b] : 999;
      return wA - wB;
    });

    return list;
  }, [localCategories, products, defaultCategories]);

  // Sort products according to manual sort order from settings
  const sortedProducts = useMemo(() => {
    const productOrder = settings?.productOrder || [];
    if (productOrder.length === 0) return products;

    const orderMap = new Map<string, number>();
    productOrder.forEach((id, idx) => {
      orderMap.set(id, idx);
    });

    return [...products].sort((a, b) => {
      const aIdx = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
      const bIdx = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;

      if (aIdx !== bIdx) return aIdx - bIdx;

      return products.indexOf(a) - products.indexOf(b);
    });
  }, [products, settings?.productOrder]);

  const handleUpdateCategories = (newCats: string[]) => {
    setLocalCategories(newCats);
    if (typeof window !== "undefined") {
      const storageKey = userEmail ? `miejebew_categories_v4_${userEmail}` : "miejebew_categories_v4";
      localStorage.setItem(storageKey, JSON.stringify(newCats));
    }
  };

  const handleMoveProduct = async (productId: string, direction: 'up' | 'down') => {
    const currentOverallOrder = sortedProducts.map(p => p.id);
    const overallIdx = currentOverallOrder.indexOf(productId);
    if (overallIdx === -1) return;

    let targetOverallIdx = -1;
    if (direction === 'up' && overallIdx > 0) {
      targetOverallIdx = overallIdx - 1;
    } else if (direction === 'down' && overallIdx < currentOverallOrder.length - 1) {
      targetOverallIdx = overallIdx + 1;
    }

    if (targetOverallIdx === -1 || targetOverallIdx === overallIdx) return;

    const newOverallOrder = [...currentOverallOrder];
    const [removed] = newOverallOrder.splice(overallIdx, 1);
    newOverallOrder.splice(targetOverallIdx, 0, removed);

    try {
      await updateSettings({
        ...settings,
        productOrder: newOverallOrder
      });
    } catch (err: any) {
      console.error("Gagal memperbarui urutan menu:", err);
      alert("Gagal memperbarui urutan menu: " + err.message);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-100px)] md:h-[calc(100vh-130px)] flex flex-col overflow-hidden">
      <ManageProductsModal
        products={sortedProducts}
        categories={categories}
        onUpdateCategories={handleUpdateCategories}
        onMoveProduct={handleMoveProduct}
        onAddProduct={async (p: any) => {
          try {
            await addProduct({
              name: p.name,
              category: p.category,
              buyPrice: p.buyPrice !== undefined ? p.buyPrice : (p.price ? Math.round(p.price * 0.7) : 0),
              sellPrice: p.price ?? 0,
              stock: p.stock !== undefined ? p.stock : 50,
              minimumStock: 5,
              description: p.description || "Menu asli Mie Jebew GDC",
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
              buyPrice: p.buyPrice !== undefined ? p.buyPrice : (p.sellPrice ? p.buyPrice : (p.price ? Math.round(p.price * 0.7) : 0)),
              sellPrice: p.price ?? p.sellPrice ?? 0,
              stock: p.stock !== undefined ? p.stock : 50,
              minimumStock: 5,
              description: p.description !== undefined ? p.description : "Menu asli Mie Jebew GDC",
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
