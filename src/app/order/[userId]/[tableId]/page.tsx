"use client";

import React, { useState, useEffect, useMemo, use } from "react";
import { 
  Flame, 
  Utensils, 
  Coffee, 
  Sparkles, 
  ShoppingBag, 
  Plus, 
  Minus, 
  X, 
  Check, 
  ArrowRight, 
  Loader2, 
  Store,
  ChevronRight
} from "lucide-react";
import { Toaster, toast } from "sonner";

interface Product {
  id: string;
  name: string;
  category: string;
  sellPrice: number;
  stock: number;
  description: string;
  imageUrl?: string | null;
}

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  spicyLevel: number;
  toppings: string[];
  product: Product;
  sellPrice: number; // configured sell price including surcharges
}

export default function CustomerOrderPage(props: {
  params: Promise<{ userId: string; tableId: string }>;
}) {
  // Resolve params using React.use() to comply with Next.js 15 rules
  const resolvedParams = use(props.params);
  const userId = resolvedParams.userId;
  const rawTableId = resolvedParams.tableId;
  const tableId = decodeURIComponent(rawTableId);

  // States
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState("Mie Jebew GDC");
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("Semua");
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Customizer modal state
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [spicyLevel, setSpicyLevel] = useState<number>(0);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  
  // Cart review & Checkout states
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastBillName, setLastBillName] = useState("");

  const toppingsList = ["Pangsit Goreng", "Pangsit Basah", "Siomay", "Bakso", "Beef Slice", "Keju Slice", "Telur"];

  // Load products catalog from public API
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/public/products?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.products) {
          setProducts(data.products);
        }
        if (data.storeName) {
          setStoreName(data.storeName);
        }
      })
      .catch((err) => {
        console.error("Failed to load catalog", err);
        toast.error("Gagal memuat katalog menu. Silakan segarkan halaman.");
      })
      .finally(() => setLoading(false));
  }, [userId]);

  // Derive unique categories from products (with 'Mie Pedas' first)
  const categories = useMemo(() => {
    const list = new Set<string>();
    products.forEach((p) => {
      if (p.category) list.add(p.category);
    });
    const sortedCats = Array.from(list).sort((a, b) => {
      if (a === "Mie Pedas") return -1;
      if (b === "Mie Pedas") return 1;
      return a.localeCompare(b);
    });
    return ["Semua", ...sortedCats];
  }, [products]);

  // Filtered products list (with 'Mie Pedas' prioritized first under "Semua")
  const filteredProducts = useMemo(() => {
    const list = activeCategory === "Semua"
      ? products
      : products.filter((p) => p.category === activeCategory);
      
    return [...list].sort((a, b) => {
      const isAMie = a.category === "Mie Pedas";
      const isBMie = b.category === "Mie Pedas";
      if (isAMie && !isBMie) return -1;
      if (!isAMie && isBMie) return 1;
      return 0;
    });
  }, [products, activeCategory]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Mie Pedas":
        return <Flame className="w-4 h-4 text-red-500 animate-pulse" />;
      case "Dimsum":
        return <Utensils className="w-4 h-4 text-yellow-400" />;
      case "Minuman Dingin":
      case "Minuman":
        return <Coffee className="w-4 h-4 text-cyan-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-500" />;
    }
  };

  // Surcharge calculator matching cashier logic
  const calculateConfiguredPrice = (product: Product, level: number, toppings: string[]) => {
    const isBypassed = ["Snack", "Camilan", "Qalla Coffee", "Qalla Tea", "Minuman Dingin", "Minuman"].includes(product.category);
    if (isBypassed) return product.sellPrice;

    // Spicy surcharge for lvl 4 & 5
    const spicySurcharge = (level === 4 || level === 5) ? 2000 : 0;

    // Toppings surcharge logic
    const specialToppings = toppings.filter((t) => ["Beef Slice", "Keju Slice", "Telur"].includes(t));
    const standardToppings = toppings.filter((t) => !["Beef Slice", "Keju Slice", "Telur"].includes(t));

    const stdCount = standardToppings.length;
    const stdSurcharge = stdCount === 3 
      ? 5000 
      : (stdCount === 7 
        ? 10000 
        : stdCount * 2000);

    let specialSurcharge = 0;
    specialToppings.forEach((t) => {
      if (t === "Beef Slice") specialSurcharge += 2500;
      else if (t === "Telur") specialSurcharge += 4000;
      else if (t === "Keju Slice") specialSurcharge += 3000;
    });

    return product.sellPrice + spicySurcharge + stdSurcharge + specialSurcharge;
  };

  // Add to cart trigger
  const handleAddClick = (product: Product) => {
    const isBypassed = ["Snack", "Camilan", "Qalla Coffee", "Qalla Tea", "Minuman Dingin", "Minuman"].includes(product.category);
    if (isBypassed) {
      // Direct add to cart bypass customization
      const cartItemId = `${product.id}-lvl0-`;
      setCart((current) => {
        const existingIndex = current.findIndex((item) => item.id === cartItemId);
        if (existingIndex !== -1) {
          const updated = [...current];
          updated[existingIndex].quantity += 1;
          toast.success(`Ditambahkan: ${product.name}`);
          return updated;
        }
        toast.success(`Ditambahkan: ${product.name}`);
        return [
          ...current,
          {
            id: cartItemId,
            productId: product.id,
            quantity: 1,
            spicyLevel: 0,
            toppings: [],
            product,
            sellPrice: product.sellPrice,
          },
        ];
      });
    } else {
      // Open customization modal
      setCustomizingProduct(product);
      setSpicyLevel(0);
      setSelectedToppings([]);
    }
  };

  // Customize submit
  const handleConfirmCustomization = () => {
    if (!customizingProduct) return;
    const product = customizingProduct;
    
    const configuredPrice = calculateConfiguredPrice(product, spicyLevel, selectedToppings);
    const toppingsKey = [...selectedToppings].sort().join(",");
    const cartItemId = `${product.id}-lvl${spicyLevel}-${toppingsKey}`;

    setCart((current) => {
      const existingIndex = current.findIndex((item) => item.id === cartItemId);
      if (existingIndex !== -1) {
        const updated = [...current];
        updated[existingIndex].quantity += 1;
        toast.success(`Ditambahkan: ${product.name}`);
        return updated;
      }
      toast.success(`Ditambahkan: ${product.name}`);
      return [
        ...current,
        {
          id: cartItemId,
          productId: product.id,
          quantity: 1,
          spicyLevel,
          toppings: selectedToppings,
          product,
          sellPrice: configuredPrice,
        },
      ];
    });

    setCustomizingProduct(null);
  };

  // Toggle topping helper
  const handleToggleTopping = (topping: string) => {
    setSelectedToppings((current) =>
      current.includes(topping) ? current.filter((t) => t !== topping) : [...current, topping]
    );
  };

  // Cart quantity handlers
  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Total cart calculation
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.sellPrice * item.quantity, 0);
  }, [cart]);

  // Order submission
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error("Harap masukkan nama Anda.");
      return;
    }
    if (cart.length === 0) {
      toast.error("Keranjang belanja kosong.");
      return;
    }

    setPlacingOrder(true);

    try {
      const response = await fetch("/api/public/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          tableName: tableId,
          customerName: customerName.trim(),
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            spicyLevel: item.spicyLevel,
            toppings: item.toppings,
            sellPrice: item.sellPrice,
            product: {
              id: item.product.id,
              name: item.product.name,
              category: item.product.category,
              sellPrice: item.product.sellPrice,
            },
          })),
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setLastBillName(result.savedBill.name);
        setOrderSuccess(true);
        setCart([]);
        setCartOpen(false);
      } else {
        throw new Error(result.error || "Gagal mengirimkan order");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Terjadi kesalahan sistem saat mengirim order.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans p-6">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-4" />
        <span className="text-sm font-bold tracking-widest text-slate-400 uppercase">Memuat katalog menu...</span>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans relative overflow-hidden select-none">
        {/* Decorative elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] bg-yellow-600/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.15)] scale-110">
          <Check className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight uppercase">PESANAN TERKIRIM!</h2>
        <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
          Pesanan Anda telah berhasil masuk ke antrean dapur kasir dengan rincian identitas:
        </p>

        <div className="bg-white/5 border border-white/5 rounded-2xl p-4.5 my-6 w-full max-w-xs text-left backdrop-blur-xl">
          <div className="flex justify-between items-center border-b border-white/5 pb-2.5 mb-2.5">
            <span className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Nomor Meja</span>
            <span className="text-sm font-extrabold text-red-500">{tableId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-455 uppercase font-black tracking-wider">Identitas Bill</span>
            <span className="text-xs font-bold text-white truncate max-w-[150px]">{lastBillName}</span>
          </div>
        </div>

        <p className="text-[11px] text-yellow-500 font-bold max-w-xs leading-relaxed italic bg-yellow-500/5 border border-yellow-500/10 p-3.5 rounded-2xl">
          Silakan konfirmasi ke meja kasir untuk pembayaran, atau tunggu makanan lezat Anda disajikan langsung di meja!
        </p>

        <button
          onClick={() => setOrderSuccess(false)}
          className="mt-8 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-extrabold cursor-pointer transition-colors"
        >
          Pesan Menu Tambahan
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden select-none pb-24">
      <Toaster position="top-center" theme="dark" />
      {/* Decorative gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute top-[30%] left-[40%] w-[35%] h-[35%] bg-yellow-600/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header bar */}
      <header className="sticky top-0 bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center shadow-md">
            <Store className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-tight text-white uppercase leading-none">{storeName}</h1>
            <span className="text-[9px] text-slate-400 font-bold block mt-0.5 uppercase tracking-widest">Digital Self-Order</span>
          </div>
        </div>
        <div className="px-3 py-1 bg-red-500/10 border border-red-500/25 rounded-full text-[9px] font-black text-red-400 uppercase tracking-widest">
          Meja: {tableId}
        </div>
      </header>

      {/* Category selector */}
      <div className="sticky top-[53px] bg-slate-950/90 backdrop-blur-md py-3 px-4 border-b border-white/5 overflow-x-auto no-scrollbar whitespace-nowrap flex gap-2 z-20">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeCategory === cat
                ? "bg-red-600 text-white shadow-md shadow-red-600/20 border border-red-500"
                : "bg-white/5 border border-white/5 text-slate-450 hover:text-white"
            }`}
          >
            {cat !== "Semua" && getCategoryIcon(cat)}
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Catalog Grid */}
      <main className="p-4 flex flex-col gap-4">
        {filteredProducts.length === 0 ? (
          <div className="py-24 text-center">
            <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <span className="text-sm font-bold text-slate-400 block">Katalog Menu Kosong</span>
            <p className="text-xs text-slate-600 mt-1">Tidak ada produk aktif dalam kategori ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {filteredProducts.map((p) => {
              const isOut = !p.stock || p.stock <= 0;
              return (
                <div
                  key={p.id}
                  onClick={() => !isOut && handleAddClick(p)}
                  className={`bg-white/5 border border-white/5 rounded-3xl p-3 flex flex-col justify-between h-[215px] relative overflow-hidden transition-all duration-300 ${
                    isOut ? "opacity-45 cursor-not-allowed" : "cursor-pointer active:scale-98 hover:border-white/10"
                  }`}
                >
                  <div>
                    {/* Image frame */}
                    <div className="w-full h-24 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden p-1 relative">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="max-w-full max-h-full object-contain rounded-xl" />
                      ) : (
                        <div className="opacity-10 scale-[2.2] absolute">
                          {getCategoryIcon(p.category)}
                        </div>
                      )}
                      {isOut && (
                        <span className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center text-[9px] font-black text-rose-500 uppercase tracking-widest border border-rose-500/20 rounded-xl">
                          Habis
                        </span>
                      )}
                    </div>

                    <span className="text-[7.5px] font-extrabold text-red-500 uppercase tracking-widest font-mono mt-2.5 block leading-none">
                      {p.category}
                    </span>
                    <h3 className="text-xs font-extrabold text-white line-clamp-2 leading-tight mt-1">
                      {p.name}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                    <span className="text-xs font-mono font-black text-yellow-500">
                      {formatRupiah(p.sellPrice)}
                    </span>
                    {!isOut && (
                      <div className="w-5.5 h-5.5 bg-red-600 rounded-md flex items-center justify-center text-white text-[10px] font-black shadow-md">
                        +
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Cart Button (Floating Action Panel) */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3.5 px-4.5 rounded-2xl flex items-center justify-between shadow-xl shadow-red-600/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-black">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </div>
              <span className="text-xs uppercase tracking-wider font-black">Lihat Keranjang</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-mono font-black">{formatRupiah(subtotal)}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </button>
        </div>
      )}

      {/* 1. Customizer Dialog Modal */}
      {customizingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-slate-900 border-t sm:border border-white/10 sm:rounded-3xl p-5 flex flex-col justify-between max-h-[90vh] overflow-y-auto rounded-t-3xl animate-in slide-in-from-bottom duration-300">
            <div>
              <div className="flex justify-between items-start border-b border-white/5 pb-3">
                <div>
                  <span className="text-[8px] font-extrabold text-red-500 uppercase tracking-widest font-mono block">
                    {customizingProduct.category}
                  </span>
                  <h3 className="text-sm font-extrabold text-white mt-1 leading-tight">{customizingProduct.name}</h3>
                  <span className="text-xs font-mono font-bold text-yellow-500 block mt-1">
                    {formatRupiah(customizingProduct.sellPrice)}
                  </span>
                </div>
                <button
                  onClick={() => setCustomizingProduct(null)}
                  className="p-1 bg-white/5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Spicy level selector */}
              <div className="my-5">
                <label className="text-[9px] font-black text-slate-450 uppercase tracking-wider block mb-2.5">
                  Tingkat Kepedasan
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {[0, 1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSpicyLevel(lvl)}
                      className={`py-2.5 border rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                        spicyLevel === lvl
                          ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/25"
                          : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                {(spicyLevel === 4 || spicyLevel === 5) && (
                  <span className="text-[9px] text-yellow-500 font-bold block mt-1.5">
                    * Level 4 & 5 ada biaya tambahan +Rp 2.000
                  </span>
                )}
              </div>

              {/* Toppings selector */}
              <div className="my-5 border-t border-white/5 pt-4">
                <label className="text-[9px] font-black text-slate-455 uppercase tracking-wider block mb-2">
                  Toppings Tambahan
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 no-scrollbar">
                  {toppingsList.map((t) => {
                    const isPremium = ["Beef Slice", "Keju Slice", "Telur"].includes(t);
                    const premiumPrice = t === "Beef Slice" ? 2500 : t === "Telur" ? 4000 : 3000;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleToggleTopping(t)}
                        className={`p-2.5 border rounded-xl text-left text-xs font-semibold flex flex-col justify-between h-14 transition-all cursor-pointer ${
                          selectedToppings.includes(t)
                            ? "bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-sm"
                            : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span className="block leading-none truncate w-full">{t}</span>
                        <span className="text-[9.5px] font-mono font-bold leading-none mt-1 select-none">
                          {isPremium ? `+${formatRupiah(premiumPrice)}` : "+Rp 2.000"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Confirm buttons */}
            <div className="border-t border-white/5 pt-4 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-slate-450 uppercase font-black tracking-wider block">Harga Item</span>
                <span className="text-sm font-mono font-black text-yellow-500">
                  {formatRupiah(calculateConfiguredPrice(customizingProduct, spicyLevel, selectedToppings))}
                </span>
              </div>
              <button
                type="button"
                onClick={handleConfirmCustomization}
                className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-red-600/20 active:scale-[0.98] cursor-pointer"
              >
                Tambahkan Ke Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Cart Drawer Sheet Overlay */}
      {cartOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-slate-900 h-full p-5 flex flex-col justify-between border-l border-white/5 animate-in slide-in-from-right duration-300">
            <div>
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-red-500" />
                  <h3 className="text-sm font-black text-white uppercase">Keranjang Pemesanan</h3>
                </div>
                <button
                  onClick={() => setCartOpen(false)}
                  className="p-1 bg-white/5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Items List */}
              <div className="my-4 overflow-y-auto max-h-[50vh] flex flex-col gap-3 pr-1 no-scrollbar">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white/4 border border-white/5 rounded-2xl flex items-center justify-between gap-3"
                  >
                    <div className="overflow-hidden flex-1">
                      <h4 className="text-xs font-bold text-white truncate">{item.product.name}</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[8px] font-black bg-red-500/10 text-red-400 px-1 py-0.5 rounded uppercase font-mono">
                          Lvl {item.spicyLevel}
                        </span>
                        {item.toppings.length > 0 && (
                          <span className="text-[8px] font-black bg-yellow-500/10 text-yellow-400 px-1 py-0.5 rounded uppercase max-w-[150px] truncate" title={item.toppings.join(", ")}>
                            {item.toppings.join(", ")}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold text-yellow-500 block mt-1">
                        {formatRupiah(item.sellPrice)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        className="w-6.5 h-6.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-mono font-extrabold text-white w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        className="w-6.5 h-6.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom summary and place order form */}
            <div className="border-t border-white/5 pt-4">
              <div className="flex justify-between items-center text-sm font-extrabold mb-4 pb-3 border-b border-dashed border-white/5">
                <span className="text-slate-400">Total Harga</span>
                <span className="text-yellow-500 font-mono text-base">{formatRupiah(subtotal)}</span>
              </div>

              <form onSubmit={handlePlaceOrder} className="flex flex-col gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-450 uppercase tracking-wider block mb-1.5">
                    Nama Pemesan (Untuk Antrean)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Andi, Rina, Meja 5"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 placeholder-slate-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={placingOrder}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-red-600/25 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {placingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Mengirimkan...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Kirim Pesanan Meja
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
