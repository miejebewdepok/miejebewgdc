// @ts-nocheck
import React from 'react';
import { SavedBill } from '@/lib/types';
import { X, Trash2, FolderOpen, Calendar, DollarSign, Clock } from 'lucide-react';

interface SavedBillsModalProps {
  savedBills: SavedBill[];
  onLoadBill: (billId: string) => void;
  onDeleteBill: (billId: string) => void;
}

export default function SavedBillsModal({
  savedBills,
  onLoadBill,
  onDeleteBill
}: SavedBillsModalProps) {
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-1 select-none">
      
      {/* Container */}
      <div className="flex-1 glass-morphism rounded-3xl p-6 flex flex-col overflow-hidden">
        <div className="mb-6">
          <h2 className="text-xl font-extrabold text-foreground dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Clock className="text-red-500 w-5 h-5" /> Antrean Bill Tertunda (Hold List)
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Simpan sementara pesanan antrean meja pelanggan, lalu pulihkan kapan saja</p>
        </div>

        {/* Saved list scrollable */}
        <div className="flex-1 overflow-y-auto">
          {savedBills.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-black/5 dark:bg-white/2 rounded-2xl border border-dashed border-black/10 dark:border-white/5">
              <Clock className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Belum Ada Bill Ditunda</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">Gunakan tombol "Hold Bill" di panel pemesanan sebelah kanan untuk menunda tagihan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedBills.map((bill) => {
                const subtotal = bill.items.reduce((sum: number, item: any) => sum + ((item.sellPrice || item.unitPrice || 0) * item.quantity), 0);
                const tax = Math.round(subtotal * 0.1);
                const total = subtotal + tax;

                return (
                  <div 
                    key={bill.id}
                    className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:bg-black/10 dark:hover:bg-white/10 hover:border-red-500/20 transition-all duration-200 group"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-extrabold text-foreground dark:text-white group-hover:text-red-650 dark:group-hover:text-red-400 transition-colors">
                          {bill.name}
                        </span>
                        
                        <button
                          onClick={() => onDeleteBill(bill.id)}
                          className="p-1 px-2 bg-red-600/10 hover:bg-red-600/20 text-red-550 dark:text-red-500 rounded-lg cursor-pointer transition-colors"
                          title="Hapus bill ditunda"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 items-center mb-3">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {bill.items.length} Menu</span>
                      </div>

                      {/* Display items minified */}
                      <div className="flex flex-col gap-1 text-[11px] text-slate-700 dark:text-slate-300 border-t border-b border-black/15 dark:border-white/5 py-2 mb-3 font-mono">
                        {bill.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between truncate">
                            <span>{item.product?.name || item.name || 'Menu'}</span>
                            <span className="font-bold text-slate-500 dark:text-slate-400">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-2.5">
                      <div>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-semibold uppercase">Total estimasi</span>
                        <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400 font-mono">{formatRupiah(total)}</span>
                      </div>

                      <button
                        onClick={() => onLoadBill(bill.id)}
                        className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-lg shadow-red-600/20 cursor-pointer transition-transform duration-200 active:scale-95"
                      >
                        <FolderOpen className="w-3.5 h-3.5" /> BUKA
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
