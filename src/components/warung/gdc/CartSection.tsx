// @ts-nocheck
import React, { useState } from 'react';
import { CartItem } from '@/lib/types';
import { Trash2, Plus, Minus, Receipt, Save, RefreshCw, Flame, X } from 'lucide-react';

interface CartSectionProps {
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdateNotes: (productId: string, notes: string) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  onSaveBill: (billName: string) => void;
  onCloseMobile?: () => void;
}

export default function CartSection({
  cartItems,
  onUpdateQuantity,
  onUpdateNotes,
  onRemoveItem,
  onClearCart,
  onCheckout,
  onSaveBill,
  onCloseMobile
}: CartSectionProps) {
  const [billNamePrompt, setBillNamePrompt] = useState(false);
  const [billName, setBillName] = useState('');

  // Read customer name from localStorage for loaded bills
  const activeCustomer = typeof window !== "undefined" ? localStorage.getItem("miejebew_checkout_customer_name") : null;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + (item.sellPrice * item.quantity), 0);
  const tax = 0;
  const total = subtotal;

  const handleSaveBillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billName.trim()) return;
    onSaveBill(billName.trim());
    setBillName('');
    setBillNamePrompt(false);
  };

  return (
    <aside className={`bg-sidebar/90 dark:bg-slate-950/60 backdrop-blur-2xl p-6 flex flex-col justify-between select-none text-sidebar-foreground dark:text-slate-100 transition-all duration-300 ${
      onCloseMobile 
        ? 'w-full h-full border-l border-sidebar-border/40 dark:border-white/10 shadow-2xl' 
        : 'w-96 border-l border-sidebar-border/40 dark:border-white/10 shrink-0 h-full z-20 hidden lg:flex'
    }`}>
      
      {/* Sidebar Header */}
      <div className="flex justify-between items-center pb-4 border-b border-sidebar-border/30 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-red-500/10 rounded-lg text-red-500">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-foreground dark:text-slate-100 uppercase tracking-tight">Katalog Pesanan</h2>
            {activeCustomer && (
              <span className="text-[10px] font-black text-red-500 dark:text-red-400 block leading-none mt-0.5 uppercase tracking-wide">
                👤 {activeCustomer}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-red-600/10 dark:bg-red-600/25 border border-red-500/20 text-red-600 dark:text-red-300 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider font-mono">
            {cartItems.reduce((total, item) => total + item.quantity, 0)} Items
          </span>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 bg-red-500/10 hover:bg-red-500/25 rounded-lg text-red-500 transition-colors"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Cart Items List */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3.5 no-scrollbar">
        {cartItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <div className="w-12 h-12 rounded-full border border-dashed border-sidebar-border dark:border-slate-800 flex items-center justify-center mb-3">
              <Flame className="w-6 h-6 text-muted-foreground/60" />
            </div>
            <p className="text-xs font-bold text-foreground dark:text-slate-300">Keranjang Masih Kosong</p>
            <p className="text-[10px] text-muted-foreground/80 mt-1 max-w-[200px]">Tekan salah satu menu Mie atau Dimsum pedas lezat untuk menambahkan pesanan pelanggan.</p>
          </div>
        ) : (
          cartItems.map((item) => (
            <div 
              key={item.id}
              className="flex flex-col gap-2 p-3 bg-sidebar-accent/30 dark:bg-white/4 border border-sidebar-border/20 dark:border-white/5 rounded-2xl group hover:bg-sidebar-accent/50 dark:hover:bg-white/10 transition-all duration-200"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground dark:text-slate-200 truncate pr-1">
                    {item.product?.name || 'Menu'}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-red-500/15 text-red-500 border border-red-500/10 uppercase tracking-tight">
                      🔥 {(() => {
                        if (item.product?.category === 'Kebab' || item.product?.category === 'Lumpia Beef') {
                          if (item.spicyLevel === 0) return "Tidak Pedas";
                          if (item.spicyLevel === 1) return "Sedang";
                          if (item.spicyLevel === 2) return "Pedas";
                        }
                        return `Lvl ${item.spicyLevel ?? 0}`;
                      })()}
                    </span>
                    {item.toppings && item.toppings.length > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border border-yellow-500/10 uppercase tracking-tight">
                        🍜 {(() => {
                          const counts = {};
                          for (const t of item.toppings) {
                            counts[t] = (counts[t] || 0) + 1;
                          }
                          return Object.entries(counts)
                            .map(([topping, count]) => (count > 1 ? `${topping} (${count}x)` : topping))
                            .join(", ");
                        })()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400 font-mono mt-1">
                    {formatRupiah(item.sellPrice)}
                  </p>
                </div>
                
                {/* Total amount item */}
                <p className="text-sm font-mono font-bold text-foreground dark:text-white shrink-0">
                  {formatRupiah(item.sellPrice * item.quantity)}
                </p>
              </div>

              {/* Adjuster controllers */}
              <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-sidebar-border/30 dark:border-white/5">
                <span className="text-[10px] text-muted-foreground/60 italic font-medium truncate max-w-[120px]" title={item.notes}>
                  {item.notes}
                </span>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    className="w-7 h-7 bg-sidebar-accent/40 dark:bg-white/5 hover:bg-sidebar-accent dark:hover:bg-white/15 hover:text-foreground dark:hover:text-white rounded-lg text-muted-foreground dark:text-slate-400 flex items-center justify-center cursor-pointer text-xs"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono font-extrabold text-foreground dark:text-white px-1">
                    {item.quantity}
                  </span>
                  <button 
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className="w-7 h-7 bg-sidebar-accent/40 dark:bg-white/5 hover:bg-sidebar-accent dark:hover:bg-white/15 hover:text-foreground dark:hover:text-white rounded-lg text-muted-foreground dark:text-slate-400 flex items-center justify-center cursor-pointer text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  <button 
                    onClick={() => onRemoveItem(item.id)}
                    className="w-7 h-7 bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center cursor-pointer text-xs ml-1"
                    title="Hapus item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bill Save Input Popover (Inline inside bottom hold billing context) */}
      {billNamePrompt && (
        <form onSubmit={handleSaveBillSubmit} className="bg-sidebar dark:bg-slate-900 border border-yellow-500/25 dark:border-yellow-500/20 rounded-2xl p-4 mb-4">
          <label className="text-[10px] text-yellow-600 dark:text-yellow-400 font-extrabold uppercase block mb-1">Nama Nota Antrean (Hold Bill)</label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              placeholder="e.g. Meja 12, Siska"
              value={billName}
              onChange={(e) => setBillName(e.target.value)}
              className="flex-1 bg-sidebar-accent/50 dark:bg-white/5 border border-sidebar-border dark:border-white/10 rounded-xl py-1.5 px-3 text-xs text-foreground dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
            />
            <button
              type="submit"
              className="px-3 bg-yellow-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-yellow-400 transition-colors"
            >
              Simpan
            </button>
            <button
              type="button"
              onClick={() => setBillNamePrompt(false)}
              className="px-2 bg-sidebar-accent/60 text-muted-foreground rounded-xl text-xs hover:bg-sidebar-accent"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Calculations & Settle bottom panel */}
      <div className="border-t border-sidebar-border dark:border-white/10 pt-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-4 font-sans font-medium">
          <span>Subtotal Konsumsi</span>
          <span className="font-mono">{formatRupiah(subtotal)}</span>
        </div>

        <div className="flex justify-between text-base font-bold mb-5 border-t border-sidebar-border/30 dark:border-white/5 pt-3">
          <span className="text-foreground dark:text-slate-100">Total Tagihan</span>
          <span className="text-yellow-600 dark:text-yellow-400 font-mono text-lg">{formatRupiah(total)}</span>
        </div>

        {/* Master Action Trigger */}
        <button
          disabled={cartItems.length === 0}
          onClick={onCheckout}
          className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl cursor-pointer transition-transform duration-200 active:scale-[0.98] ${
            cartItems.length === 0
              ? 'bg-muted text-muted-foreground border border-sidebar-border/60 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/35 glow-active'
          }`}
        >
          <Receipt className="w-5 h-5 text-yellow-400" /> CETAK PEMBAYARAN
        </button>

        {/* Action controllers list */}
        {cartItems.length > 0 && (
          <div className="flex gap-2.5 mt-3">
            <button
              onClick={() => setBillNamePrompt(true)}
              className="flex-1 bg-sidebar-accent/55 border border-sidebar-border dark:border-white/10 py-2.5 rounded-xl text-xs font-semibold hover:bg-sidebar-accent text-foreground dark:text-slate-300 flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <Save className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" /> Hold Bill
            </button>
            <button
              onClick={onClearCart}
              className="flex-1 bg-sidebar-accent/55 border border-sidebar-border dark:border-white/10 py-2.5 rounded-xl text-xs font-semibold hover:bg-red-500/10 text-foreground dark:text-slate-300 flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-red-500" /> Batal
            </button>
          </div>
        )}
      </div>

    </aside>
  );
}

