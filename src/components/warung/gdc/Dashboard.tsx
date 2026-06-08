// @ts-nocheck
import React, { useMemo } from 'react';
import { Product, Transaction, SavedBill } from '@/lib/types';
import { 
  TrendingUp, 
  ShoppingCart, 
  AlertTriangle, 
  CheckCircle, 
  Coffee, 
  Plus, 
  Package, 
  ArrowUpRight, 
  Clock, 
  ChevronRight,
  TrendingDown,
  Info,
  Bookmark,
  Trash2,
  FolderOpen
} from 'lucide-react';

interface DashboardProps {
  products: Product[];
  transactions: Transaction[];
  savedBills: SavedBill[];
  onLoadBill: (id: string) => void;
  onDeleteBill: (id: string) => void;
  onUpdateProduct: (product: Product) => void;
  setActiveTab: (tab: 'pos' | 'history' | 'manage' | 'settings') => void;
}

export default function Dashboard({ 
  products, 
  transactions, 
  savedBills,
  onLoadBill,
  onDeleteBill,
  onUpdateProduct, 
  setActiveTab 
}: DashboardProps) {

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Generate date matching strings
  const today = new Date().toDateString();

  // 1. Calculations: Omzet Hari Ini (PPN & Service Charge included!)
  const todayTransactions = useMemo(() => {
    return transactions.filter(tx => new Date(tx.createdAt).toDateString() === today);
  }, [transactions, today]);

  const omzetHariIni = useMemo(() => {
    return todayTransactions.reduce((sum, tx) => sum + tx.total, 0);
  }, [todayTransactions]);

  // Comparison with yesterday / theoretical average
  const rataRataTransaksi = useMemo(() => {
    if (todayTransactions.length === 0) return 0;
    return Math.round(omzetHariIni / todayTransactions.length);
  }, [todayTransactions, omzetHariIni]);

  // 2. Calculations: Stok parameters
  const outOfStockProducts = useMemo(() => {
    return products.filter(p => !p?.stock > 0 || (p.stock !== undefined && p.stock === 0));
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p?.stock > 0 && p.stock !== undefined && p.stock > 0 && p.stock <= 5);
  }, [products]);

  const totalStokFisik = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.stock || 0), 0);
  }, [products]);

  // 3. Calculations: Produk Aktif
  const activeProductsCount = useMemo(() => {
    return products.filter(p => p?.stock > 0).length;
  }, [products]);

  const totalProductsCount = products.length;

  // Beep sound simulator
  const playBeep = (freq: number, duration: number) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
      setTimeout(() => {
        try {
          if (ctx.state !== 'closed') ctx.close();
        } catch (err) {}
      }, (duration * 1000) + 100);
    } catch (e) {
      console.log('Audio error', e);
    }
  };

  // Restock handler directly from dashboard triggers
  const handleQuickRestock = (product: Product, amount: number) => {
    const currentStock = product.stock !== undefined ? product.stock : 0;
    const nextStock = currentStock + amount;
    onUpdateProduct({
      ...product,
      stock: nextStock,
      isAvailable: nextStock > 0 ? true : product?.stock > 0
    });
    
    // Play fun audio confirmation
    playBeep(523.25, 0.1); // C5 note
    setTimeout(() => playBeep(659.25, 0.1), 100); // E5 note
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1 select-none animate-feed text-foreground dark:text-slate-100">
      
      {/* Dashboard Top Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-foreground dark:text-white flex items-center gap-2">
            <TrendingUp className="text-red-500 w-5 h-5 animate-pulse" /> Ringkasan Kinerja Kasir
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Pantau volume omset harian, tren stok kritis, and ketersediaan menu resto aktif</p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl py-2 px-4 shadow-sm self-start sm:self-auto">
          <Clock className="w-4 h-4 text-yellow-500 animate-spin" style={{ animationDuration: '6s' }} />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Live Status:</span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">ONLINE • SYS ACTIVE</span>
        </div>
      </div>

      {/* 3 BENTO STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Card 1: Omzet Hari Ini */}
        <div className="glass-morphism rounded-3xl p-5 relative overflow-hidden group hover:border-red-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="w-16 h-16 text-foreground dark:text-white" />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest block">OMSET HARI INI</span>
          <h3 className="text-2xl font-black text-foreground dark:text-white font-mono tracking-tight mt-1">
            {formatRupiah(omzetHariIni)}
          </h3>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-[9px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded px-1.5 py-0.5 font-bold flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> Target Rp 1M
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium ml-1">
              {Math.min(100, Math.round((omzetHariIni / 1000000) * 100))}% tercapai
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden mt-3">
            <div 
              className="bg-gradient-to-r from-red-500 to-yellow-500 h-full" 
              style={{ width: `${Math.min(100, (omzetHariIni / 1000000) * 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Card 2: Transaksi Hari Ini */}
        <div className="glass-morphism rounded-3xl p-5 relative overflow-hidden group hover:border-red-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShoppingCart className="w-16 h-16 text-foreground dark:text-white" />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest block">TRANSAKSI HARI INI</span>
          <h3 className="text-2xl font-black text-foreground dark:text-white font-mono tracking-tight mt-1">
            {todayTransactions.length} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">Nota</span>
          </h3>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            Rata-rata: <span className="font-bold text-foreground dark:text-white font-mono">{formatRupiah(rataRataTransaksi)} / nota</span>
          </p>
          <div className="border-t border-black/5 dark:border-white/5 mt-3 pt-2 flex justify-between text-[10px] text-slate-500">
            <span>Metode QRIS dominan</span>
            <span className="text-foreground dark:text-white font-bold">100% Lunas</span>
          </div>
        </div>

        {/* Card 3: Produk Aktif / Menu */}
        <div className="glass-morphism rounded-3xl p-5 relative overflow-hidden group hover:border-red-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Coffee className="w-16 h-16 text-foreground dark:text-white" />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest block">PRODUK MENU AKTIF</span>
          <h3 className="text-2xl font-black text-foreground dark:text-white font-mono tracking-tight mt-1">
            {activeProductsCount} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">/ {totalProductsCount} Menu</span>
          </h3>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
            <div 
              className="bg-emerald-500 h-full" 
              style={{ width: `${(activeProductsCount / totalProductsCount) * 100}%` }}
            ></div>
          </div>
          
          <div className="border-t border-black/5 dark:border-white/5 mt-3 pt-2 flex justify-between text-[10px] text-slate-500">
            <span>Ketersediaan menu:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{Math.round((activeProductsCount / totalProductsCount) * 100 || 0)}% Siap Saji</span>
          </div>
        </div>

      </div>

      {/* MIDDLE CONTAINER: DETAILED GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Column Left (Col 7): Watchlist Stok Kritis & Fast Restock */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="glass-morphism rounded-[32px] p-6">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-500 w-4.5 h-4.5" />
                <h3 className="text-sm font-bold text-foreground dark:text-white uppercase tracking-wider">Peringatan Menipis & Habis</h3>
              </div>
              <span className="text-[10px] bg-red-500/10 text-red-650 dark:text-red-400 border border-red-500/15 px-2 py-0.5 rounded-full font-black">
                RE-SUPPLY WATCH
              </span>
            </div>

            {/* List low or out of stock items */}
            {products.filter(p => !p?.stock > 0 || (p.stock !== undefined && p.stock <= 5)).length === 0 ? (
              <div className="py-12 text-center bg-black/5 dark:bg-black/20 border border-dashed border-black/10 dark:border-white/5 rounded-2xl flex flex-col items-center justify-center">
                <CheckCircle className="w-10 h-10 text-emerald-500 mb-2.5" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-300">Stok Seluruh Menu Sangat Baik</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-500 mt-1">Tidak ada produk yang berada di bawah ambang batas kritis (5 pkt).</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
                {products
                  .filter(p => !p?.stock > 0 || (p.stock !== undefined && p.stock <= 5))
                  .map(prod => {
                    const isOut = prod.stock === 0 || !prod?.stock > 0;
                    return (
                      <div 
                        key={prod.id} 
                        className={`flex items-center justify-between p-3.5 border rounded-2xl transition-all duration-200 ${
                          isOut 
                            ? 'bg-red-500/5 border-red-500/15' 
                            : 'bg-amber-500/5 border-amber-500/15'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl shrink-0 ${isOut ? 'bg-red-500/10 dark:bg-red-600/10 text-red-600 dark:text-red-500' : 'bg-amber-500/10 text-amber-600 dark:text-amber-500'}`}>
                            <Coffee className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-foreground dark:text-white block leading-snug">{prod.name}</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium font-sans">Kategori: {prod.category}</span>
                              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold">•</span>
                              <span className={`text-[10px] font-mono font-bold ${isOut ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                Stok: {prod.stock !== undefined ? `${prod.stock} pkt` : 'Habis'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Action buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQuickRestock(prod, 10)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase transition-colors shrink-0 flex items-center gap-1 cursor-pointer ${
                              isOut 
                                ? 'bg-red-500/10 dark:bg-red-600/20 hover:bg-red-500/20 dark:hover:bg-red-600/30 text-red-600 dark:text-white border border-red-200 dark:border-red-500/20' 
                                : 'bg-amber-500/10 dark:bg-amber-600/20 hover:bg-amber-500/20 dark:hover:bg-amber-600/30 text-amber-600 dark:text-white border border-amber-200 dark:border-amber-500/20'
                            }`}
                          >
                            <Plus className="w-3 h-3" /> RESTOCK +10
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Column Right (Col 5): Category visual lists & Navigation shortcut */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          

          {/* Tagihan Tertunda (Pending Bills Queue) Bento */}
          <div className="glass-morphism rounded-[32px] p-6">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-black/5 dark:border-white/5">
              <h3 className="text-sm font-bold text-foreground dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Bookmark className="text-amber-500 w-4.5 h-4.5" /> Antrean Tagihan Tertunda
              </h3>
              {savedBills.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold font-mono">
                  {savedBills.length} Bill
                </span>
              )}
            </div>

            {savedBills.length === 0 ? (
              <div className="py-6 text-center bg-black/5 dark:bg-black/10 rounded-2xl border border-dashed border-black/10 dark:border-white/5">
                <Bookmark className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium block">Tidak Ada Tagihan Ditunda</span>
                <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">Anda bisa menunda pesanan Self Order saat checkout lalu menyelesaikannya di sini atau di kasir.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                {savedBills.map((bill) => {
                  const billItemsSummary = bill.items.map((it: any) => `${it.product.name} (x${it.quantity})`).join(', ');
                  return (
                    <div 
                      key={bill.id} 
                      className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl hover:border-black/10 dark:hover:border-white/10 transition-all"
                    >
                      <div className="overflow-hidden mr-2">
                        <span className="text-xs font-bold text-foreground dark:text-white block truncate">{bill.name}</span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 block truncate mt-0.5" title={billItemsSummary}>
                          {bill.items.reduce((sum: number, i: any) => sum + i.quantity, 0)} item: {billItemsSummary}
                        </span>
                        <span className="text-[9px] text-slate-600 dark:text-slate-550 font-mono block mt-0.5">
                          {new Date(bill.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => onLoadBill(bill.id)}
                          className="p-1 px-2.5 bg-amber-500 text-slate-950 font-extrabold rounded-xl text-[10px] hover:bg-amber-400 cursor-pointer transition-colors flex items-center gap-1"
                          title="Buka kembali di POS"
                        >
                          <FolderOpen className="w-3.5 h-3.5" /> BUKA
                        </button>
                        <button
                          onClick={() => onDeleteBill(bill.id)}
                          className="p-1.5 bg-red-500/10 dark:bg-red-600/10 hover:bg-red-500/20 dark:hover:bg-red-600/20 text-red-600 dark:text-red-450 border border-transparent hover:border-red-500/10 rounded-xl cursor-pointer transition-all"
                          title="Hapus bill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick info disclaimer card */}
          <div className="bg-gradient-to-r from-red-500/5 to-yellow-500/5 border border-red-500/15 rounded-[32px] p-5 flex gap-3">
            <Info className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-foreground dark:text-white block">Metode Pengurangan Stok</span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Stok fisik produk akan otomatis berkurang secara langsung ketika transaksi checkout kasir berhasil diselesaikan. Apabila stok mencapai angka 0, status produk otomatis beralih menjadi "Habis / Off".
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

