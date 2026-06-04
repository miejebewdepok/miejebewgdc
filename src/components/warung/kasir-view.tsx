"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppState } from "@/components/providers/app-state-provider";
import { useSession } from "@/lib/auth-client";
import { Product, ProductCategory, Transaction } from "@/lib/types";
import { calculateItemUnitPrice, calculateToppingsSurcharge as sharedCalculateToppingsSurcharge } from "@/lib/pricing";
import ProductCard from "./gdc/ProductCard";
import CartSection from "./gdc/CartSection";
import CheckoutModal from "./gdc/CheckoutModal";
import SavedBillsModal from "./gdc/SavedBillsModal";
import { Search, ChevronDown, ChevronUp, ShoppingCart, LayoutGrid, Flame, Utensils, Beef, Coffee, Leaf, Cookie, Clock, X, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

// Custom SVG Strawberry icon in Lucide style (monochrome)
const Strawberry = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 2v2.5M9.5 3c.8.5 1.7 1.5 2.5 1.5s1.7-1 2.5-1.5M7 4.5c1.2 1 2.8 1.5 5 1.5s3.8-.5 5-1.5" />
    <path d="M12 21.5c4.5-4.5 7.5-9.5 7.5-13a5.5 5.5 0 0 0-11 0c0 3.5 3 8.5 7.5 13z" />
    <path d="M9 9h.01M15 9h.01M12 11h.01M9 13h.01M15 13h.01M12 15h.01M10 17h.01M14 17h.01" />
  </svg>
);

// Icon map for each category pill
const CATEGORY_ICON: Record<string, React.ReactNode> = {
  'Semua':        <LayoutGrid className="w-3 h-3" />,
  'Mie Pedas':    <Flame      className="w-3 h-3" />,
  'Lumpia Beef':  <Utensils   className="w-3 h-3" />,
  'Kebab':        <Beef       className="w-3 h-3" />,
  'Qalla Coffee': <Coffee     className="w-3 h-3" />,
  'Qalla Tea':    <Leaf       className="w-3 h-3" />,
  'Qalla Juice':  <Strawberry className="w-3 h-3" />,
  'Snack':        <Cookie     className="w-3 h-3" />,
  'Mie Tek Tek':  <Flame      className="w-3 h-3" />,
  'Pangsit':      <Utensils   className="w-3 h-3" />,
  'Tea Series':   <Leaf       className="w-3 h-3" />,
  'Delight Series': <Coffee   className="w-3 h-3" />,
};

export function KasirView() {
  const {
    products,
    cartLines,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    checkout,
    settings,
    updateSettings,
    saveBill,
    savedBills,
    loadBill,
    deleteBill
  } = useAppState();

  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("miejebew_active_category") || "Semua";
    }
    return "Semua";
  });
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isSavedBillsOpen, setIsSavedBillsOpen] = useState(false);

  // States for Spicy Level and Toppings customization modal
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedSpicyLevel, setSelectedSpicyLevel] = useState<number>(0);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [isToppingsExpanded, setIsToppingsExpanded] = useState<boolean>(false);
  const [selectedFilling, setSelectedFilling] = useState<string>("Beef Slice");
  const [selectedSize, setSelectedSize] = useState<string>("REGULER");

  // Reorder mode states
  const [isArrangeMode, setIsArrangeMode] = useState(false);
  const [productOrder, setProductOrder] = useState<string[]>(() => {
    if (settings?.productOrder && settings.productOrder.length > 0) {
      return settings.productOrder;
    }
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("miejebew_product_order_v4");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("miejebew_active_category", selectedCategory);
  }, [selectedCategory]);

  // Sync state with settings.productOrder, with localStorage as fallback
  useEffect(() => {
    if (settings?.productOrder && settings.productOrder.length > 0) {
      setProductOrder(settings.productOrder);
    } else {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("miejebew_product_order_v4");
        if (saved) {
          try {
            setProductOrder(JSON.parse(saved));
          } catch (e) {
            console.error("Failed to parse saved product order", e);
          }
        }
      }
    }
  }, [settings?.productOrder]);
  
  // Drag and Drop States for catalog sorting
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const { data: session } = useSession();
  const userEmail = session?.user?.email;
  const isCabang2 = settings.branchCode === "CABANG_2";

  const calculateToppingsSurcharge = (toppings: string[]) => {
    const isCabang2 = settings.branchCode === "CABANG_2";
    const branchCode = isCabang2 ? "CABANG_2" : "CABANG_1";
    return sharedCalculateToppingsSurcharge(toppings, branchCode);
  };

  const defaultCategories = useMemo(() => {
    if (settings.branchCode === "CABANG_2") {
      return ["Mie Pedas", "Mie Tek Tek", "Pangsit", "Tea Series", "Delight Series"];
    }
    return ["Mie Pedas", "Lumpia Beef", "Kebab", "Snack", "Qalla Coffee", "Qalla Tea", "Qalla Juice"];
  }, [settings.branchCode, userEmail]);

  // Local categories from localStorage — shared key with Kelola Menu (user-isolated)
  const [localCategories, setLocalCategories] = useState<string[] | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && userEmail !== undefined) {
      const storageKey = userEmail ? `miejebew_categories_v4_${userEmail}` : "miejebew_categories_v4";
      let saved = localStorage.getItem(storageKey);
      
      // Auto-migrate old categories for the main owner if they don't have user-isolated categories yet
      if (!saved && (settings.branchCode === "CABANG_1" || userEmail === "taufiqrusdhi.ez@gmail.com")) {
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

  // Dynamic categories list including default and products from DB
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

    return ["Semua", ...list];
  }, [localCategories, products, defaultCategories]);

  // Sort products according to manual sort order
  const sortedProducts = useMemo(() => {
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
  }, [products, productOrder]);

  const filteredProducts = useMemo(() => {
    return sortedProducts.filter((product) => {
      const displayCategory = product.category?.toLowerCase() === "chocolatte" ? "Delight Series" : product.category;
      const matchCategory = selectedCategory === "Semua" || displayCategory === selectedCategory;
      const matchSearch = product.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                          product.description.toLowerCase().includes(catalogSearch.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [sortedProducts, selectedCategory, catalogSearch]);

  const handleMoveProduct = (
    productId: string, 
    direction: 'up' | 'down' | 'top' | 'bottom' | 'to-target',
    targetProductId?: string
  ) => {
    if (filteredProducts.length <= 1) return;
    
    const idx = filteredProducts.findIndex(p => p.id === productId);
    if (idx === -1) return;

    const currentOverallOrder = sortedProducts.map(p => p.id);
    const overallIdx = currentOverallOrder.indexOf(productId);
    if (overallIdx === -1) return;

    let targetOverallIdx = -1;

    if (direction === 'to-target' && targetProductId) {
      targetOverallIdx = currentOverallOrder.indexOf(targetProductId);
      if (targetOverallIdx === -1) return;
    } else if (direction === 'up' && idx > 0) {
      const prevFiltered = filteredProducts[idx - 1];
      targetOverallIdx = currentOverallOrder.indexOf(prevFiltered.id);
    } else if (direction === 'down' && idx < filteredProducts.length - 1) {
      const nextFiltered = filteredProducts[idx + 1];
      const nextOverallIdx = currentOverallOrder.indexOf(nextFiltered.id);
      if (nextOverallIdx !== -1) {
        targetOverallIdx = nextOverallIdx;
      }
    } else if (direction === 'top') {
      const firstFiltered = filteredProducts[0];
      targetOverallIdx = currentOverallOrder.indexOf(firstFiltered.id);
    } else if (direction === 'bottom') {
      const lastFiltered = filteredProducts[filteredProducts.length - 1];
      targetOverallIdx = currentOverallOrder.indexOf(lastFiltered.id);
    }

    if (targetOverallIdx === -1 || targetOverallIdx === overallIdx) return;

    const newOverallOrder = [...currentOverallOrder];
    const [removed] = newOverallOrder.splice(overallIdx, 1);
    
    // Recalculate target index in the spliced list
    let finalInsertIdx = -1;
    if (direction === 'to-target' && targetProductId) {
      finalInsertIdx = newOverallOrder.indexOf(targetProductId);
    } else if (direction === 'up') {
      const prevFiltered = filteredProducts[idx - 1];
      finalInsertIdx = newOverallOrder.indexOf(prevFiltered.id);
    } else if (direction === 'down') {
      const nextFiltered = filteredProducts[idx + 1];
      finalInsertIdx = newOverallOrder.indexOf(nextFiltered.id) + 1;
    } else if (direction === 'top') {
      const firstFiltered = filteredProducts[0];
      finalInsertIdx = newOverallOrder.indexOf(firstFiltered.id);
    } else if (direction === 'bottom') {
      const lastFiltered = filteredProducts[filteredProducts.length - 1];
      finalInsertIdx = newOverallOrder.indexOf(lastFiltered.id) + 1;
    }

    if (finalInsertIdx === -1) return;

    newOverallOrder.splice(finalInsertIdx, 0, removed);

    setProductOrder(newOverallOrder);
    localStorage.setItem("miejebew_product_order_v4", JSON.stringify(newOverallOrder));
    
    // Sinkronkan ke database untuk sinkronisasi antar perangkat!
    updateSettings({
      ...settings,
      productOrder: newOverallOrder
    }).then(() => {
      toast.success("Posisi menu berhasil diperbarui dan disinkronkan.");
    }).catch(err => {
      console.error("Gagal menyinkronkan urutan menu ke server:", err);
      toast.error("Urutan menu disimpan lokal, gagal sinkronisasi ke server.");
    });
  };

  // Drag and Drop Event Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggedId(id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = (e: React.DragEvent, id: string) => {
    if (dragOverId === id) {
      setDragOverId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain") || draggedId;
    setDraggedId(null);
    setDragOverId(null);
    
    if (!sourceId || sourceId === targetId) return;
    
    handleMoveProduct(sourceId, 'to-target', targetId);
  };

  const subtotal = cartLines.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = 0; // Tax completely disabled/removed for cashier as requested!
  const serviceCharge = settings.enableServiceCharge && settings.serviceChargeRate ? Math.round(subtotal * (settings.serviceChargeRate / 100)) : 0;
  const total = subtotal + tax + serviceCharge;

  const mappedCartItems = cartLines.map(line => {
    const isSpecialCategory = line.product.category === 'Kebab' || line.product.category === 'Lumpia Beef';
    "const isCabang2 = isCabang2;"
    const isBypassed = isCabang2 
      ? (line.product.category === 'Tea Series' || line.product.category === 'Delight Series' || line.product.category?.toLowerCase() === 'chocolatte')
      : ['Snack', 'Qalla Coffee', 'Qalla Tea', 'Qalla Juice'].includes(line.product.category);
    let notesArr: string[] = [];
    
    if (line.spicyLevel !== undefined && !isBypassed) {
      if (isSpecialCategory) {
        if (line.spicyLevel === 0) notesArr.push("Tidak Pedas");
        else if (line.spicyLevel === 1) notesArr.push("Sedang");
        else if (line.spicyLevel === 2) notesArr.push("Pedas");
      } else {
        notesArr.push(`Level ${line.spicyLevel}`);
      }
    }
    if (line.size) {
      const isSpaghetti = line.product.name.toLowerCase().includes("spaghetti");
      if (isSpaghetti) {
        notesArr.push(`Porsi: ${line.size}`);
      } else {
        notesArr.push(`Ukuran: ${line.size}`);
      }
    }
    if (line.filling) {
      if (line.product.name.toLowerCase().includes("risoles")) {
        notesArr.push(`Rasa: ${line.filling}`);
      } else {
        notesArr.push(`Varian Isi: ${line.filling}`);
      }
    }
    if (line.toppings && line.toppings.length > 0 && !isBypassed) {
      const counts: Record<string, number> = {};
      line.toppings.forEach(t => counts[t] = (counts[t] || 0) + 1);
      const toppingStr = Object.entries(counts)
        .map(([name, count]) => count > 1 ? `${name} (x${count})` : name)
        .join(', ');
      notesArr.push(toppingStr);
    }
    
    const customNote = notesArr.join('\n');   
    
    return {
      id: line.id,
      product: line.product,
      productId: line.product.id,
      quantity: line.quantity,
      notes: customNote,
      sellPrice: line.product.sellPrice,
      spicyLevel: line.spicyLevel,
      toppings: line.toppings,
      filling: line.filling,
      size: line.size
    };
  });

  async function handleCheckout() {
    setIsCheckoutModalOpen(true);
  }

  async function handleSuccessCheckout(tx: any): Promise<any> {
    try {
      const transaction = await checkout({
        customerName: tx.customerName,
        paymentMethod: tx.paymentMethod,
        amountPaid: tx.amountPaid,
        change: tx.change,
      });
      if (!transaction) {
        toast.error("Keranjang masih kosong.");
        return null;
      }
      toast.success("Transaksi berhasil disimpan.");
      return transaction;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan transaksi.");
      return null;
    }
  }

  function handleClearCart() {
    if (window.confirm("Batal pesanan ini?")) {
      cartLines.forEach(item => removeFromCart(item.id));
      if (typeof window !== "undefined") {
        localStorage.removeItem("miejebew_checkout_customer_name");
      }
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Canvas */}
      <header className="pb-4 shrink-0">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground dark:text-white tracking-tight shrink-0">
              Kasir
            </h1>
            {savedBills.length > 0 && (
              <button
                onClick={() => setIsSavedBillsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-2xl text-xs font-extrabold text-amber-700 dark:text-amber-400 cursor-pointer transition-all"
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>{savedBills.length} Bill Ditunda</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 max-w-md w-full justify-end">
            <button
              onClick={() => setIsArrangeMode(!isArrangeMode)}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-2xl cursor-pointer border transition-all shrink-0 select-none",
                isArrangeMode
                  ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/25"
                  : "bg-sidebar-accent/30 dark:bg-white/5 border-sidebar-border dark:border-white/10 text-slate-400 hover:text-foreground dark:text-slate-300"
              )}
              title={isArrangeMode ? "Selesai Susun" : "Susun Menu"}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
            <div className="relative flex-1 max-w-xs sm:max-w-sm">
              <input
                type="text"
                placeholder="Cari menu..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full bg-sidebar-accent/30 dark:bg-white/5 border border-sidebar-border dark:border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-foreground dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/40 backdrop-blur-md transition-colors"
              />
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left Side: Product Catalog */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {/* Horizontal Category Selector — full-width breakout scroll on mobile */}
          <div className="relative shrink-0 -mx-4 md:-mx-8">
            {/* Right fade indicator — hints more items to the right */}
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10" />
            <div
              className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth px-4 md:px-8"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold font-sans cursor-pointer transition-all duration-200 shrink-0 whitespace-nowrap",
                    selectedCategory === cat
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/25 border border-red-500/20'
                      : 'bg-sidebar-accent/50 dark:bg-white/5 border border-sidebar-border dark:border-white/10 text-foreground/80 dark:text-slate-300 hover:bg-sidebar-accent dark:hover:bg-white/10'
                  )}
                >
                  {CATEGORY_ICON[cat] ?? null}
                  {cat}
                </button>
              ))}
              {/* Right breathing space before fade */}
              <span className="shrink-0 w-8" />
            </div>
          </div>

          {/* Grid Lists */}
          <div className="flex-1 overflow-y-auto pr-2 pb-20">
            {filteredProducts.length === 0 ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-sidebar-accent/20 dark:bg-white/5 rounded-3xl border border-dashed border-sidebar-border dark:border-white/10">
                <Search className="w-12 h-12 text-muted-foreground mb-3" />
                <h3 className="text-base font-bold text-foreground dark:text-slate-300">Menu Tidak Ditemukan</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">Gunakan kata kunci pencarian lain atau pilih kategori berbeda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
                {filteredProducts.map((product, idx) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isArrangeMode={isArrangeMode}
                    index={idx}
                    onMoveUp={() => handleMoveProduct(product.id, 'up')}
                    onMoveDown={() => handleMoveProduct(product.id, 'down')}
                    onMoveTop={() => handleMoveProduct(product.id, 'top')}
                    onMoveBottom={() => handleMoveProduct(product.id, 'bottom')}
                    // Drag and drop events
                    draggable={isArrangeMode}
                    onDragStart={(e) => handleDragStart(e, product.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, product.id)}
                    onDragEnter={(e) => handleDragEnter(e, product.id)}
                    onDragLeave={(e) => handleDragLeave(e, product.id)}
                    onDrop={(e) => handleDrop(e, product.id)}
                    isDragging={draggedId === product.id}
                    isDragOver={dragOverId === product.id}
                    onAddToCart={() => {
                      "const isCabang2 = isCabang2;"
                      const isBypassedCategory = isCabang2 
                        ? (product.category === 'Tea Series' || product.category === 'Delight Series' || product.category?.toLowerCase() === 'chocolatte')
                        : ['Snack', 'Qalla Coffee', 'Qalla Tea', 'Qalla Juice'].includes(product.category);
                      const isRisoles = product.name.toLowerCase().includes("risoles");
                      if (isBypassedCategory && !isRisoles) {
                        addToCart(product.id, 0, []);
                        toast.success(`${product.name} berhasil ditambahkan ke keranjang.`);
                        return;
                      }
                      const isSpaghetti = product.name.toLowerCase().includes("spaghetti");
                      setCustomizingProduct(product);
                      setSelectedSpicyLevel(0);
                      setSelectedToppings([]);
                      setIsToppingsExpanded(false);
                      setSelectedFilling(isRisoles ? "Mayo" : "Beef Slice");
                      setSelectedSize(isSpaghetti ? "Single" : "REGULER");
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Cart Section */}
        <CartSection
          cartItems={mappedCartItems as any}
          onUpdateQuantity={(id, qty) => updateCartQuantity(id, qty)}
          onUpdateNotes={() => {}}
          onRemoveItem={(id) => removeFromCart(id)}
          onClearCart={handleClearCart}
          onCheckout={handleCheckout}
          onSaveBill={(billName) => {
            saveBill(billName);
            toast.success(`Bill "${billName}" berhasil ditunda!`);
          }}
        />
      </div>

      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        cartItems={mappedCartItems as any}
        subtotal={subtotal}
        tax={tax}
        total={total}
        serviceCharge={serviceCharge}
        settings={settings}
        onSuccessCheckout={handleSuccessCheckout}
      />

      {customizingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all duration-300">
          <div className="glass-morphism rounded-[24px] sm:rounded-3xl bg-sidebar/95 dark:bg-slate-950/95 border border-sidebar-border dark:border-white/10 p-5 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl flex flex-col gap-5 sm:gap-6 text-foreground dark:text-white relative animate-in fade-in zoom-in-95 duration-200">
            {/* Elegant Image Preview */}
            <div className="w-full h-40 relative rounded-2xl overflow-hidden bg-slate-900 border border-white/5 flex items-center justify-center p-2">
              <img 
                src={(() => {
                  if (customizingProduct.name.toLowerCase().includes("risoles")) {
                    let mentaiImg = "/risoles_mentai.png";
                    let ragoutImg = "/risoles_ragout.png";
                    if (customizingProduct.description) {
                      try {
                        if (customizingProduct.description.trim().startsWith("{")) {
                          const parsed = JSON.parse(customizingProduct.description);
                          if (parsed.mentaiImageUrl) mentaiImg = parsed.mentaiImageUrl;
                          if (parsed.ragoutImageUrl) ragoutImg = parsed.ragoutImageUrl;
                        }
                      } catch (e) {}
                    }
                    if (selectedFilling === "Mentai") return mentaiImg;
                    if (selectedFilling === "Ragout") return ragoutImg;
                    return customizingProduct.imageUrl || "https://i.ibb.co.com/bnd8T4c/RISOLES-KAKEK-MAYO.webp";
                  }
                  return customizingProduct.imageUrl || "/logo.png";
                })()} 
                alt={customizingProduct.name} 
                className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl transition-all duration-500 animate-in fade-in zoom-in-95"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 to-transparent pointer-events-none" />
            </div>

            {/* Close Button / Header */}
            <div>
              <span className="text-[10px] font-extrabold text-red-500 uppercase tracking-widest font-mono block mb-1">
                Kustomisasi Menu
              </span>
              <h3 className="text-lg font-black tracking-tight leading-snug">
                {customizingProduct.name.toLowerCase().includes("risoles") 
                  ? `Risoles ${selectedFilling}` 
                  : customizingProduct.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {customizingProduct.name.toLowerCase().includes("risoles")
                  ? "Pilih varian rasa Risoles premium di bawah ini."
                  : "Pilih level kepedasan dan topping tambahan di bawah ini."}
              </p>
            </div>

            {/* Rasa Selection (Only for Risoles) */}
            {customizingProduct.name.toLowerCase().includes("risoles") && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Pilihan Rasa
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Mayo" },
                    { label: "Mentai" },
                    { label: "Ragout" },
                  ].map((flavor) => {
                    const isSelected = selectedFilling === flavor.label;
                    return (
                      <button
                        key={flavor.label}
                        type="button"
                        onClick={() => setSelectedFilling(flavor.label)}
                        className={cn(
                          "py-2.5 px-3 rounded-2xl text-xs font-bold font-sans cursor-pointer transition-all duration-200 flex flex-col items-center justify-center border",
                          isSelected
                            ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/35"
                            : "bg-sidebar-accent/50 dark:bg-white/5 border-sidebar-border dark:border-white/5 text-foreground/80 dark:text-slate-200 hover:bg-sidebar-accent dark:hover:bg-white/10"
                        )}
                      >
                        <span className="text-center leading-tight">{flavor.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Spicy Levels */}
            {!(userEmail === "miejebew.depok@gmail.com"
               ? (customizingProduct.category === "Tea Series" || customizingProduct.category === "Delight Series" || customizingProduct.category?.toLowerCase() === "chocolatte")
               : ['Snack', 'Qalla Coffee', 'Qalla Tea', 'Qalla Juice'].includes(customizingProduct.category)
             ) && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Tingkat Kepedasan {!['Kebab', 'Lumpia Beef'].includes(customizingProduct.category) && "(Level 0 - 5)"}
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(() => {
                    const isSpecial = ['Kebab', 'Lumpia Beef'].includes(customizingProduct.category);
                    const levels = isSpecial 
                      ? [{ lvl: 0, label: "Tidak Pedas" }, { lvl: 1, label: "Sedang" }, { lvl: 2, label: "Pedas" }]
                      : [0, 1, 2, 3, 4, 5].map(lvl => ({ lvl, label: `Lvl ${lvl}` }));

                    return levels.map(({ lvl, label }) => {
                      const hasSurcharge = !isSpecial && (lvl === 4 || lvl === 5);
                      const isSelected = selectedSpicyLevel === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setSelectedSpicyLevel(lvl)}
                          className={cn(
                            "py-2.5 px-3 rounded-2xl text-xs font-bold font-sans cursor-pointer transition-all duration-200 flex flex-col items-center justify-center border",
                            isSelected
                              ? "bg-red-650 border-red-500 text-white shadow-lg shadow-red-600/35"
                              : "bg-sidebar-accent/50 dark:bg-white/5 border-sidebar-border dark:border-white/5 text-foreground/80 dark:text-slate-200 hover:bg-sidebar-accent dark:hover:bg-white/10"
                          )}
                        >
                          <span className="text-center leading-tight">{label}</span>
                          {hasSurcharge && (
                            <span className={cn(
                              "text-[8px] mt-0.5 font-bold",
                              isSelected ? "text-yellow-300" : "text-yellow-600 dark:text-yellow-400"
                            )}>
                              +Rp 2k
                            </span>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Size Selection (Only for Kebab and Spaghetti Goreng) */}
            {(customizingProduct.category === 'Kebab' || customizingProduct.name.toLowerCase().includes('spaghetti')) && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Pilihan Ukuran / Porsi
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(customizingProduct.name.toLowerCase().includes('spaghetti')
                    ? [
                        { label: "Single", surcharge: 0 },
                        { label: "Double", surcharge: 5000 },
                      ]
                    : [
                        { label: "REGULER", surcharge: 0 },
                        { label: "LARGE", surcharge: 5000 },
                      ]
                  ).map((sizeObj) => {
                    const isSelected = selectedSize === sizeObj.label;
                    return (
                      <button
                        key={sizeObj.label}
                        type="button"
                        onClick={() => {
                          setSelectedSize(sizeObj.label);
                          if (customizingProduct.category === 'Kebab') {
                            if (sizeObj.label === 'REGULER' && (selectedFilling === 'Chicken Katsu' || selectedFilling === 'Special')) {
                              setSelectedFilling('Beef');
                            } else if (sizeObj.label === 'LARGE' && selectedFilling === 'Beef Slice') {
                              setSelectedFilling('Beef');
                            }
                          }
                        }}
                        className={cn(
                          "py-2.5 px-3 rounded-2xl text-xs font-bold font-sans cursor-pointer transition-all duration-200 flex flex-col items-center justify-center border",
                          isSelected
                            ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/35"
                            : "bg-sidebar-accent/50 dark:bg-white/5 border-sidebar-border dark:border-white/5 text-foreground/80 dark:text-slate-200 hover:bg-sidebar-accent dark:hover:bg-white/10"
                        )}
                      >
                        <span className="text-center leading-tight">{sizeObj.label}</span>
                        {sizeObj.surcharge > 0 && (
                          <span className={cn(
                            "text-[8px] mt-0.5 font-bold",
                            isSelected ? "text-yellow-300" : "text-yellow-600 dark:text-yellow-400"
                          )}>
                            +Rp {(sizeObj.surcharge / 1000)}k
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filling Selection (Only for Kebab) */}
            {customizingProduct.category === 'Kebab' && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Varian Isi
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Beef Slice", reqLarge: false, reqReguler: true },
                    { label: "Beef", reqLarge: false, reqReguler: false },
                    { label: "Chicken Katsu", reqLarge: true, reqReguler: false },
                    { label: "Special", reqLarge: true, reqReguler: false },
                  ].map((filling) => {
                    const isSelected = selectedFilling === filling.label;
                    const isDisabled = (filling.reqLarge && selectedSize === 'REGULER') || (filling.reqReguler && selectedSize === 'LARGE');
                    let displaySurcharge = 0;
                    if (selectedSize === 'REGULER' && filling.label === 'Beef') displaySurcharge = 2000;
                    if (selectedSize === 'LARGE' && filling.label === 'Special') displaySurcharge = 5000;

                    if (isDisabled) return null;

                    return (
                      <button
                        key={filling.label}
                        type="button"
                        onClick={() => setSelectedFilling(filling.label)}
                        className={cn(
                          "py-2.5 px-3 rounded-2xl text-xs font-bold font-sans cursor-pointer transition-all duration-200 flex flex-col items-center justify-center border",
                          isSelected
                            ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/35"
                            : "bg-sidebar-accent/50 dark:bg-white/5 border-sidebar-border dark:border-white/5 text-foreground/80 dark:text-slate-200 hover:bg-sidebar-accent dark:hover:bg-white/10"
                        )}
                      >
                        <span className="text-center leading-tight">{filling.label}</span>
                        {displaySurcharge > 0 && (
                          <span className={cn(
                            "text-[8px] mt-0.5 font-bold",
                            isSelected ? "text-yellow-300" : "text-yellow-600 dark:text-yellow-400"
                          )}>
                            +Rp {(displaySurcharge / 1000)}k
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filling Selection (Only for Lumpia Beef) */}
            {customizingProduct.category === 'Lumpia Beef' && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Varian Isi
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Beef Slice", surcharge: 0 },
                    { label: "Kornet", surcharge: 0 },
                    { label: "Beef Patty", surcharge: 5000 },
                    { label: "Chicken Katsu", surcharge: 5000 },
                    { label: "Special", surcharge: 10000 },
                  ].map((filling) => {
                    const isSelected = selectedFilling === filling.label;
                    return (
                      <button
                        key={filling.label}
                        type="button"
                        onClick={() => setSelectedFilling(filling.label)}
                        className={cn(
                          "py-2.5 px-3 rounded-2xl text-xs font-bold font-sans cursor-pointer transition-all duration-200 flex flex-col items-center justify-center border",
                          isSelected
                            ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/35"
                            : "bg-sidebar-accent/50 dark:bg-white/5 border-sidebar-border dark:border-white/5 text-foreground/80 dark:text-slate-200 hover:bg-sidebar-accent dark:hover:bg-white/10"
                        )}
                      >
                        <span className="text-center leading-tight">{filling.label}</span>
                        {filling.surcharge > 0 && (
                          <span className={cn(
                            "text-[8px] mt-0.5 font-bold",
                            isSelected ? "text-yellow-300" : "text-yellow-600 dark:text-yellow-400"
                          )}>
                            +Rp {(filling.surcharge / 1000)}k
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Toppings Selection Accordion Header */}
             {!(userEmail === "miejebew.depok@gmail.com"
               ? (customizingProduct.category === "Tea Series" || customizingProduct.category === "Delight Series" || customizingProduct.category?.toLowerCase() === "chocolatte")
               : ['Kebab', 'Lumpia Beef', 'Snack', 'Qalla Coffee', 'Qalla Tea', 'Qalla Juice'].includes(customizingProduct.category)
             ) && (
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setIsToppingsExpanded(!isToppingsExpanded)}
                className={cn(
                  "w-full flex items-center justify-between py-2.5 px-3.5 rounded-2xl border font-bold cursor-pointer transition-all duration-200 text-left select-none",
                  isToppingsExpanded
                    ? "bg-sidebar-accent/60 dark:bg-white/8 border-sidebar-border dark:border-white/10 text-foreground"
                    : "bg-sidebar-accent/30 dark:bg-white/4 border-sidebar-border/30 dark:border-white/5 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 dark:hover:bg-white/8"
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Pilihan Topping Tambahan
                  </span>
                  {selectedToppings.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-black bg-yellow-500 text-slate-950 uppercase shrink-0">
                      {selectedToppings.length} Terpilih
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-muted-foreground min-w-0 max-w-[50%] justify-end">
                  {!isToppingsExpanded && selectedToppings.length > 0 && (
                    <span className="text-[8.5px] truncate text-yellow-600 dark:text-yellow-400 font-extrabold mr-1 uppercase">
                      {(() => {
                        const counts: Record<string, number> = {};
                        for (const t of selectedToppings) {
                          counts[t] = (counts[t] || 0) + 1;
                        }
                        return Object.entries(counts)
                          .map(([topping, count]) => (count > 1 ? `${topping} (${count}x)` : topping))
                          .join(", ");
                      })()}
                    </span>
                  )}
                  {isToppingsExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 shrink-0 text-foreground" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Description & Promo Info */}
              {isToppingsExpanded && (
                <span className="text-[9px] font-extrabold text-muted-foreground/75 uppercase tracking-wider pl-1 select-none animate-feed">
                  Banyak Pilihan • +Rp 2k/top • Promo: 3 top = Rp 5rb, 7 top = Rp 10rb
                </span>
              )}

              {/* Grid Toppings with smooth slide transition */}
              <div
                className={cn(
                  "transition-all duration-300 ease-in-out overflow-hidden",
                  isToppingsExpanded ? "max-h-[450px] opacity-100 mt-1" : "max-h-0 opacity-0 pointer-events-none"
                )}
              >
                <div className="grid grid-cols-3 gap-2 py-1">
                  {(settings.branchCode === "CABANG_2"
                    ? [
                        "Bakso",
                        "Sosis",
                        "Nugget",
                        "Otak-Otak",
                        "Cireng",
                        "Ceker",
                        "Kulit Ayam",
                        "Pangsit Goreng",
                        "Telur",
                      ]
                    : [
                        "Bakso",
                        "Bakso Ikan",
                        "Sosis",
                        "Nugget",
                        "Kornet",
                        "Otak-Otak",
                        "Tahu Aci",
                        "Scallop",
                        "Cireng",
                        "Beef Slice",
                        "Keju Slice",
                        "Telur",
                      ]
                  ).map((topping) => {
                    const count = selectedToppings.filter((t) => t === topping).length;
                    return (
                      <div
                        key={topping}
                        className={cn(
                          "p-2 rounded-2xl text-[11px] font-bold border transition-all duration-200 flex flex-col justify-between h-[64px]",
                          count > 0
                            ? "bg-yellow-650/10 dark:bg-yellow-600/20 border-yellow-500/40 text-yellow-600 dark:text-yellow-400"
                            : "bg-sidebar-accent/50 dark:bg-white/5 border-sidebar-border dark:border-white/5 text-foreground/80 dark:text-slate-200 hover:bg-sidebar-accent dark:hover:bg-white/10"
                        )}
                      >
                        <div className="flex flex-col text-left leading-tight min-w-0">
                          <span className="truncate block font-extrabold text-[10px]">{topping}</span>
                          {(() => {
                            "const isCabang2 = isCabang2;"
                            if (topping === "Telur") {
                              return (
                                <span className="text-[8px] font-black text-yellow-500 leading-none mt-0.5 animate-pulse">
                                  +Rp 5k (Premium)
                                </span>
                              );
                            }
                            if (isCabang2) {
                              if (["Ceker", "Kulit Ayam", "Pangsit Goreng"].includes(topping)) {
                                return (
                                  <span className="text-[8px] font-black text-amber-600 dark:text-amber-500 leading-none mt-0.5">
                                    +Rp 2.5k
                                  </span>
                                );
                              }
                            } else {
                              if (topping === "Beef Slice") {
                                return (
                                  <span className="text-[8px] font-black text-yellow-500 leading-none mt-0.5">
                                    +Rp 2.5k (Premium)
                                  </span>
                                );
                              }
                              if (topping === "Keju Slice") {
                                return (
                                  <span className="text-[8px] font-black text-yellow-500 leading-none mt-0.5">
                                    +Rp 3k (Premium)
                                  </span>
                                );
                              }
                            }
                            return (
                              <span className="text-[8px] font-black text-slate-550 dark:text-slate-400 leading-none mt-0.5">
                                +Rp 2k
                              </span>
                            );
                          })()}
                        </div>
                        
                        {count === 0 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedToppings([...selectedToppings, topping])}
                            className="w-full text-[9px] uppercase tracking-wider text-center py-1 mt-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer font-extrabold"
                          >
                            + Pilih
                          </button>
                        ) : (
                          <div className="flex items-center justify-between mt-1 gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const index = selectedToppings.indexOf(topping);
                                if (index > -1) {
                                  const newToppings = [...selectedToppings];
                                  newToppings.splice(index, 1);
                                  setSelectedToppings(newToppings);
                                }
                              }}
                              className="w-6 h-5 flex items-center justify-center bg-red-500/10 dark:bg-red-500/25 border border-red-500/30 hover:bg-red-500 hover:text-white rounded-md text-xs font-black text-red-650 dark:text-red-400 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-100">
                              {count}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedToppings([...selectedToppings, topping])}
                              className="w-6 h-5 flex items-center justify-center bg-yellow-500/10 dark:bg-yellow-500/20 border border-yellow-500/30 hover:bg-yellow-500 hover:text-slate-950 rounded-md text-xs font-black text-yellow-600 dark:text-yellow-400 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            )}

{/* Live Pricing Preview Panel */}
            <div className="bg-sidebar-accent/30 dark:bg-white/4 border border-sidebar-border/30 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-muted-foreground font-sans">
                <span>Harga Dasar Menu</span>
                <span className="font-mono">Rp {customizingProduct.sellPrice.toLocaleString('id-ID')}</span>
              </div>
              {(!(settings.branchCode === "CABANG_2"
                ? (customizingProduct.category === "Tea Series" || customizingProduct.category === "Delight Series" || customizingProduct.category?.toLowerCase() === "chocolatte")
                : ['Kebab', 'Lumpia Beef', 'Snack', 'Qalla Coffee', 'Qalla Tea', 'Qalla Juice'].includes(customizingProduct.category)
              ) && (selectedSpicyLevel === 4 || selectedSpicyLevel === 5)) && (
                <div className="flex justify-between text-xs text-yellow-600 dark:text-yellow-400 font-sans">
                  <span>Tambahan Level {selectedSpicyLevel}</span>
                  <span className="font-mono">+ Rp 2.000</span>
                </div>
              )}
              {/* Size Pricing (Kebab & Spaghetti) */}
              {customizingProduct.category === 'Kebab' && selectedSize === 'LARGE' && (
                <div className="flex justify-between text-xs text-yellow-600 dark:text-yellow-400 font-sans">
                  <span>Ukuran LARGE</span>
                  <span className="font-mono">+ Rp 5.000</span>
                </div>
              )}
              {customizingProduct.name.toLowerCase().includes("spaghetti") && selectedSize === 'Double' && (
                <div className="flex justify-between text-xs text-yellow-600 dark:text-yellow-400 font-sans">
                  <span>Porsi Double</span>
                  <span className="font-mono">+ Rp 5.000</span>
                </div>
              )}
              {/* Filling Pricing (Kebab) */}
              {customizingProduct.category === 'Kebab' && (
                <>
                  {selectedSize === 'REGULER' && selectedFilling === 'Beef' && (
                    <div className="flex justify-between text-xs text-yellow-600 dark:text-yellow-400 font-sans">
                      <span>Varian Isi Beef</span>
                      <span className="font-mono">+ Rp 2.000</span>
                    </div>
                  )}
                  {selectedSize === 'LARGE' && selectedFilling === 'Special' && (
                    <div className="flex justify-between text-xs text-yellow-600 dark:text-yellow-400 font-sans">
                      <span>Varian Isi Special</span>
                      <span className="font-mono">+ Rp 5.000</span>
                    </div>
                  )}
                </>
              )}
              {customizingProduct.category === 'Lumpia Beef' && !['Beef Slice', 'Kornet'].includes(selectedFilling) && (
                <div className="flex justify-between text-xs text-yellow-600 dark:text-yellow-400 font-sans">
                  <span>Varian Isi {selectedFilling}</span>
                  <span className="font-mono">+ Rp {(selectedFilling === 'Special' ? 10000 : 5000).toLocaleString('id-ID')}</span>
                </div>
              )}
              {selectedToppings.length > 0 && (() => {
                const totalSurcharge = calculateToppingsSurcharge(selectedToppings);
                "const isCabang2 = isCabang2;"
                const premiumKeys = isCabang2 
                  ? ["Telur"] 
                  : ["Beef Slice", "Keju Slice", "Telur"];
                const premiumToppings = selectedToppings.filter((t) => premiumKeys.includes(t));
                const standardToppings = selectedToppings.filter((t) => !premiumKeys.includes(t));
                const stdCount = standardToppings.length;
                return (
                  <div className="flex justify-between text-xs text-yellow-600 dark:text-yellow-400 font-sans">
                    <span>
                      Tambahan {selectedToppings.length} Topping 
                      {stdCount > 0 && ` (${stdCount} Std${stdCount === 3 ? " Paket 3" : stdCount === 7 ? " Paket 7" : ""})`}
                      {premiumToppings.length > 0 && ` (${premiumToppings.length} Premium)`}
                    </span>
                    <span className="font-mono">
                      + Rp {totalSurcharge.toLocaleString('id-ID')}
                    </span>
                  </div>
                );
              })()}
              <div className="flex justify-between text-sm font-bold border-t border-sidebar-border/30 dark:border-white/5 pt-2 mt-1">
                <span>Harga Unit</span>
                <span className="text-red-650 dark:text-red-400 font-mono font-extrabold">
                  Rp {calculateItemUnitPrice(
                    customizingProduct.sellPrice,
                    customizingProduct.category,
                    customizingProduct.name,
                    { 
                      spicyLevel: selectedSpicyLevel, 
                      toppings: selectedToppings, 
                      filling: selectedFilling, 
                      size: selectedSize 
                    },
                    settings.branchCode === "CABANG_2" || userEmail === "miejebew.depok@gmail.com" ? "CABANG_2" : "CABANG_1"
                  ).toLocaleString('id-ID')}                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCustomizingProduct(null)}
                className="flex-1 py-3 bg-sidebar-accent/60 dark:bg-white/5 border border-sidebar-border dark:border-white/10 rounded-2xl text-xs font-bold hover:bg-sidebar-accent dark:hover:bg-white/10 text-muted-foreground dark:text-slate-300 transition-colors cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const isRisoles = customizingProduct.name.toLowerCase().includes("risoles");
                  const fillingToPass = (customizingProduct.category === 'Lumpia Beef' || customizingProduct.category === 'Kebab' || isRisoles) ? selectedFilling : undefined;
                  const isSpaghetti = customizingProduct.name.toLowerCase().includes("spaghetti");
                  const sizeToPass = (customizingProduct.category === 'Kebab' || isSpaghetti) ? selectedSize : undefined;
                  addToCart(customizingProduct.id, selectedSpicyLevel, selectedToppings, fillingToPass, sizeToPass);
                  const displayName = isRisoles ? `Risoles ${selectedFilling}` : customizingProduct.name;
                  toast.success(`${displayName} ditambah.`);
                  setCustomizingProduct(null);
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-red-600/35 transition-all duration-200 cursor-pointer text-center animate-pulse-subtle"
              >
                Tambah Pesanan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Mobile Cart Summary Bar */}
      {cartLines.length > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 bg-red-650/95 backdrop-blur-xl border border-red-500/30 text-white p-4 rounded-2xl flex items-center justify-between shadow-[0_10px_35px_rgba(220,38,38,0.35)] animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl text-yellow-450">
              <ShoppingCart className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-red-200">Pesanan Aktif</p>
              <p className="text-sm font-black text-yellow-350 font-mono mt-0.5">
                {cartLines.reduce((sum, item) => sum + item.quantity, 0)} Menu • Rp {subtotal.toLocaleString('id-ID')}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileCartOpen(true)}
            className="bg-white text-red-750 px-4 py-2.5 rounded-xl text-xs font-black shadow-lg hover:bg-slate-100 transition-colors uppercase tracking-wider cursor-pointer active:scale-95 transition-transform"
          >
            Lihat
          </button>
        </div>
      )}

      {/* Mobile Cart Slide-over Drawer Backdrop */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md h-full relative animate-in slide-in-from-right duration-250">
            <CartSection
              cartItems={mappedCartItems as any}
              onUpdateQuantity={(id, qty) => updateCartQuantity(id, qty)}
              onUpdateNotes={() => {}}
              onRemoveItem={(id) => removeFromCart(id)}
              onClearCart={handleClearCart}
              onCheckout={() => {
                setIsMobileCartOpen(false);
                handleCheckout();
              }}
              onSaveBill={(billName) => {
                setIsMobileCartOpen(false);
                saveBill(billName);
                toast.success(`Bill "${billName}" berhasil ditunda!`);
              }}
              onCloseMobile={() => setIsMobileCartOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Saved Bills Modal Dialog */}
      {isSavedBillsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl h-[85vh] bg-sidebar/95 dark:bg-slate-950/90 rounded-[32px] border border-sidebar-border dark:border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setIsSavedBillsOpen(false)}
              className="absolute top-6 right-6 p-2 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 rounded-full cursor-pointer transition-colors z-50"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex-1 overflow-hidden p-2">
              <SavedBillsModal
                savedBills={savedBills}
                onLoadBill={(id) => {
                  loadBill(id);
                  setIsSavedBillsOpen(false);
                  toast.success("Bill berhasil dipulihkan!");
                }}
                onDeleteBill={(id) => {
                  deleteBill(id);
                  toast.success("Bill berhasil dihapus!");
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
