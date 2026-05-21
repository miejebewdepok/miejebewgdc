"use client";

import { useState, useMemo } from "react";
import { AlertCircle, BanknoteArrowDown, Coffee, CreditCard, Flame, Minus, PackageSearch, Plus, ReceiptText, Search, ShoppingBasket, Sparkles, Trash2, Utensils, Wheat, X } from "lucide-react";
import { toast } from "sonner";
import { useAppState } from "@/components/providers/app-state-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/format";
import { PaymentMethod, Product, ProductCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const paymentLabels: Record<PaymentMethod, string> = {
  Tunai: "Tunai",
  QRIS: "QRIS",
  Transfer: "Transfer",
};

const categoryLabels: Array<{ value: "Semua" | ProductCategory; label: string }> = [
  { value: "Semua", label: "Semua" },
  { value: "Makanan", label: "Makanan" },
  { value: "Minuman", label: "Minuman" },
  { value: "Sembako", label: "Sembako" },
  { value: "Kebutuhan Harian", label: "Harian" },
];

const getCategoryGradient = (category: string) => {
  if (category === 'Makanan') {
    return 'from-red-950/50 via-red-900/15 to-zinc-950';
  } else if (category === 'Minuman') {
    return 'from-cyan-950/45 via-blue-900/10 to-zinc-950';
  } else if (category === 'Sembako') {
    return 'from-yellow-950/45 via-yellow-900/15 to-zinc-950';
  }
  return 'from-zinc-900/40 via-zinc-800/20 to-zinc-950';
};

function getCategoryIcon(category: string) {
  if (category === 'Makanan') return <Flame className="size-5 text-red-500 animate-pulse" />;
  if (category === 'Minuman') return <Coffee className="size-5 text-cyan-400" />;
  if (category === 'Sembako') return <Wheat className="size-5 text-yellow-400" />;
  return <Sparkles className="size-5 text-amber-500" />;
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const isAvailable = product.stock > 0;
  const gradient = getCategoryGradient(product.category);

  return (
    <div 
      onClick={() => isAvailable && onAdd()}
      className={cn(
        "glass-morphism rounded-3xl flex flex-col h-[275px] overflow-hidden transition-all duration-300 relative group select-none border border-white/10",
        isAvailable 
          ? "cursor-pointer hover:border-red-500/40 hover:bg-white/5 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] active:scale-[0.98]" 
          : "opacity-45 cursor-not-allowed border-rose-500/5"
      )}
    >
      <div className="w-full h-[150px] relative overflow-hidden shrink-0 bg-slate-900 border-b border-white/5">
        {product.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-full h-full object-cover transition-all duration-500 scale-100 group-hover:scale-110 brightness-[0.98] group-hover:brightness-105 group-hover:contrast-[1.05]"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent" />
          </>
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-80 group-hover:opacity-100 transition-opacity`}></div>
        )}

        <div className="absolute top-3 left-3">
          <div className="p-1.5 bg-slate-950/80 rounded-xl border border-white/10 backdrop-blur-md">
            {getCategoryIcon(product.category)}
          </div>
        </div>

        <div className="absolute top-3 right-3">
          {isAvailable ? (
            <span className={cn(
              "text-[9px] font-mono font-bold px-2 py-1 rounded-lg uppercase tracking-wider block backdrop-blur-md",
              product.stock <= product.minimumStock 
                ? "bg-amber-600/90 text-white border border-amber-400 animate-pulse" 
                : "bg-slate-950/80 text-slate-300 border border-white/15"
            )}>
              Stok: {product.stock}
            </span>
          ) : (
            <span className="flex items-center gap-1 bg-zinc-950 border border-white/15 backdrop-blur-md text-[9px] uppercase font-bold text-slate-400 px-2 py-1 rounded-lg">
              <AlertCircle className="w-3 h-3 text-slate-500" /> Habis
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col justify-between flex-1 relative z-10 bg-slate-950/20 dark:bg-transparent">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-extrabold text-red-500 uppercase tracking-widest font-mono">
            {product.category}
          </span>
          <h3 className="font-extrabold text-foreground group-hover:text-red-400 transition-colors line-clamp-2 text-[13px] md:text-sm leading-snug">
            {product.name}
          </h3>
        </div>
        
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
          <p className="text-sm md:text-base font-black text-yellow-500 font-mono flex items-baseline gap-0.5">
            {formatCurrency(product.sellPrice)}
          </p>
          <div className="w-6 h-6 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 text-xs font-bold group-hover:bg-red-600 group-hover:text-white transition-colors">
            +
          </div>
        </div>
      </div>

      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-red-600/5 rounded-full blur-xl group-hover:bg-red-500/10 transition-all"></div>
    </div>
  );
}

export function KasirView() {
  const {
    products,
    cartLines,
    cartTotal,
    paymentMethod,
    settings,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    setPaymentMethod,
    checkout,
  } = useAppState();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"Semua" | ProductCategory>("Semua");

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const queryMatch =
        query.length === 0 ||
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase());
      const categoryMatch = category === "Semua" || product.category === category;
      return queryMatch && categoryMatch;
    });
  }, [products, query, category]);

  async function handleCheckout() {
    try {
      const transaction = await checkout();
      if (!transaction) {
        toast.error("Keranjang masih kosong.");
        return;
      }

      const lowProducts = transaction.items.reduce<Product[]>((items, item) => {
        const product = products.find((candidate) => candidate.id === item.productId);
        if (!product) return items;
        if (product.stock - item.quantity <= product.minimumStock) {
          items.push(product);
        }
        return items;
      }, []);

      toast.success("Transaksi berhasil disimpan.", {
        description: `${transaction.items.length} produk masuk ke penjualan ${paymentLabels[transaction.paymentMethod]}.`,
      });

      if (lowProducts.length > 0) {
        toast.warning("Ada produk yang mendekati stok minimum.", {
          description: `Siapkan restok untuk ${lowProducts.slice(0, 2).map((item) => item.name).join(", ")}.`,
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan transaksi.");
    }
  }

  return (
    <div className="grid h-full gap-4 xl:grid-cols-[1.7fr_0.95fr] overflow-hidden">
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header kasir dengan glassmorphism */}
        <div className="glass-morphism rounded-3xl p-5 mb-4 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="font-heading text-2xl font-black text-foreground flex items-center gap-2">
              Kasir Aktif <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Tap produk untuk menambah ke keranjang belanja.</p>
          </div>
          <div className="relative w-full max-w-sm">
            <input
              type="text"
              placeholder="Cari produk..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40 backdrop-blur-md"
            />
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground" />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-3 text-xs bg-white/10 hover:bg-white/20 text-muted-foreground px-1.5 py-0.5 rounded-md cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Kategori horizontal overflow */}
        <div className="flex gap-2.5 overflow-x-auto pb-4 shrink-0 select-none no-scrollbar">
          {categoryLabels.map((item) => (
            <button
              key={item.value}
              onClick={() => setCategory(item.value)}
              className={cn(
                "px-5 py-2.5 rounded-2xl text-xs font-bold font-sans cursor-pointer transition-all duration-200 shrink-0 border",
                category === item.value
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/25 border-red-500/20"
                  : "bg-white/5 border-white/10 text-foreground/70 hover:bg-white/10"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Grid Produk */}
        <ScrollArea className="flex-1 overflow-y-auto pr-2">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 pb-20">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={() => {
                    addToCart(product.id);
                    toast.success(`${product.name} ditambahkan ke keranjang.`, {
                      description: `Stok tersedia ${product.stock} pcs.`,
                    });
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
              <PackageSearch className="w-12 h-12 text-muted-foreground mb-3" />
              <h3 className="text-base font-bold text-foreground">Produk Tidak Ditemukan</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">Gunakan kata kunci pencarian lain atau pilih kategori berbeda.</p>
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="h-full flex flex-col overflow-hidden pb-4">
        <div className="glass-morphism h-full flex flex-col rounded-[32px] overflow-hidden shadow-[0_32px_80px_-40px_rgba(220,38,38,0.25)]">
          <div className="p-6 pb-4 border-b border-white/10 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-xl font-black">Keranjang</h3>
                <p className="text-xs text-muted-foreground mt-1">{cartLines.length} item siap dibayar</p>
              </div>
              <div className="p-2 bg-red-500/10 rounded-xl text-red-500">
                <ShoppingBasket className="w-5 h-5" />
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 px-4 py-2">
            {cartLines.length > 0 ? (
              <div className="space-y-3 mt-2">
                {cartLines.map((line) => (
                  <div key={line.product.id} className="glass-morphism-medium rounded-2xl p-3 relative group">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                        {line.product.imageUrl ? (
                          <img src={line.product.imageUrl} alt={line.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className={cn("w-full h-full bg-gradient-to-br flex items-center justify-center", getCategoryGradient(line.product.category))}>
                            <Utensils className="w-5 h-5 text-white/50" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-sm line-clamp-1">{line.product.name}</p>
                          <button
                            onClick={() => removeFromCart(line.product.id)}
                            className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatCurrency(line.product.sellPrice)} / item</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="font-bold text-yellow-500 text-sm">{formatCurrency(line.lineTotal)}</p>
                          <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1 border border-white/5">
                            <button
                              onClick={() => updateCartQuantity(line.product.id, line.quantity - 1)}
                              className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold w-4 text-center">{line.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(line.product.id, line.quantity + 1)}
                              className="w-6 h-6 rounded bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center opacity-60">
                <ReceiptText className="size-10 text-muted-foreground mb-3" />
                <p className="font-heading font-bold text-lg">Keranjang Kosong</p>
                <p className="text-xs text-muted-foreground max-w-[200px] mt-1">
                  Pilih menu di sebelah kiri untuk menambah pesanan.
                </p>
              </div>
            )}
          </ScrollArea>

          <div className="p-5 border-t border-white/10 bg-black/10 shrink-0">
            <div className="space-y-3 mb-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Metode Pembayaran</p>
              <div className="grid grid-cols-3 gap-2">
                {settings.enabledPayments.map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={cn(
                      "py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 transition-all",
                      paymentMethod === method
                        ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] border border-red-500"
                        : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10"
                    )}
                  >
                    {method === "Tunai" ? <BanknoteArrowDown className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    {paymentLabels[method]}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-red-600/10 border border-red-500/20 rounded-2xl p-4 mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-red-400 font-bold mb-0.5">Total Tagihan</p>
                <p className="text-2xl font-black text-white">{formatCurrency(cartTotal)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase">Item</p>
                <p className="font-bold text-lg">{cartLines.reduce((sum, line) => sum + line.quantity, 0)}</p>
              </div>
            </div>

            <button
              onClick={() => void handleCheckout()}
              disabled={cartLines.length === 0}
              className="w-full py-4 rounded-2xl font-black text-lg text-white bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 shadow-[0_10px_25px_-5px_rgba(239,68,68,0.5)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Checkout Sekarang
              <Sparkles className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
