"use client";

import React, { useState, useEffect, use } from "react";
import { 
  CheckCircle, 
  Printer, 
  Share2, 
  Calendar, 
  MapPin, 
  Phone, 
  ShoppingBag,
  Loader2,
  XCircle,
  ArrowLeft,
  Store,
  Download
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { toBlob, toPng } from "html-to-image";

interface TransactionItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  notes?: string | null;
}

interface Transaction {
  id: string;
  userId: string;
  total: number;
  paymentMethod: string;
  customerName: string;
  amountPaid: number | null;
  change: number | null;
  createdAt: string;
}

interface Merchant {
  storeName: string;
  storeTagline: string;
  storeAddress: string;
  ownerName: string;
  ownerWhatsapp: string;
  city: string;
  merchantPhone: string;
  receiptHeader?: string;
  receiptFooter?: string;
  enableServiceCharge?: boolean;
  serviceChargeRate?: number;
}

export default function ReceiptPage(props: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(props.params);
  const transactionId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    transaction: Transaction;
    items: TransactionItem[];
    merchant: Merchant;
  } | null>(null);

  useEffect(() => {
    if (!transactionId) return;

    setLoading(true);
    setError(null);
    fetch(`/api/public/receipt/${transactionId}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Nota transaksi tidak ditemukan.");
          }
          throw new Error("Gagal mengambil detail nota.");
        }
        return res.json();
      })
      .then((resData) => {
        setData(resData);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "Terjadi kesalahan sistem saat memuat nota.");
      })
      .finally(() => setLoading(false));
  }, [transactionId]);

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val);

  const handleShareWhatsapp = async () => {
    if (!data) return;
    const { transaction, merchant } = data;
    const text = `Struk resmi ${merchant.storeName || 'WarungOS'}\nNomor Nota: ${transaction.id}\nTotal Bayar: ${formatRupiah(transaction.total)}\nStatus: LUNAS`;

    const node = document.getElementById('receipt-card-area');
    const fileShare = async () => {
      if (!node) throw new Error('Struk belum siap dibagikan.');
      const blob = await toBlob(node, { backgroundColor: '#09090b', style: { display: 'block', borderRadius: '0px' } });
      if (!blob) throw new Error('Gagal membuat gambar struk.');
      const file = new File([blob], `struk-${transactionId}.png`, { type: 'image/png' });
      const share = { title: 'Struk Belanja', text, files: [file] } as any;
      const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
      if (nav && nav.canShare && !nav.canShare(share)) throw new Error('Perangkat tidak mendukung bagikan file.');
      if (nav && nav.share) {
        await nav.share(share);
      }
    };

    try {
      const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
      if (nav && nav.share) {
        await fileShare();
        return;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'Share canceled') return;
      if (!(err instanceof DOMException && err.name === 'AbortError')) console.warn('Share failed', err);
    }

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    const node = document.getElementById('receipt-card-area');
    if (!node) {
      toast.error("Struk belum siap dipindai.");
      return;
    }
    try {
      const dataUrl = await toPng(node, {
        backgroundColor: '#09090b',
        style: {
          display: 'block',
          borderRadius: '0px',
        }
      });
      const link = document.createElement('a');
      link.download = `struk-${transactionId}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Gambar struk berhasil diunduh.");
    } catch (err) {
      console.error("Gagal mengunduh gambar struk:", err);
      toast.error("Gagal mengunduh gambar.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#fef2f2] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Memuat Struk Belanja...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#fef2f2] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
          <XCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold mb-1">Gagal Memuat Nota</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
          {error || "Rincian nota transaksi tidak dapat ditemukan di database kami."}
        </p>
        <a 
          href="/" 
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-650/20 active:scale-95"
        >
          Kembali ke Beranda
        </a>
      </div>
    );
  }

  const { transaction, items, merchant } = data;

  const orderSubtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const calculatedServiceCharge = Math.max(0, transaction.total - orderSubtotal);
  const changeValue = transaction.change !== null ? transaction.change : 0;
  const amountPaidValue = transaction.amountPaid !== null ? transaction.amountPaid : transaction.total;

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fef2f2] font-sans flex flex-col justify-between py-6 px-4 relative overflow-hidden select-none">
      <Toaster position="top-center" />
      
      {/* Background radial glow effect */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center my-4">
        
        {/* Receipt Header Actions */}
        <div className="flex justify-between items-center mb-5 px-1 no-print">
          <a 
            href="/"
            className="flex items-center gap-1 text-[11px] font-black uppercase text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Beranda
          </a>
          <span className="text-[10px] font-mono bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-slate-400">
            {transaction.id}
          </span>
        </div>

        {/* Receipt Card Content */}
        <div id="receipt-card-area" className="glass-morphism-intense rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl relative">
          
          {/* Lunas Stamp/Badge */}
          <div className="absolute top-5 right-5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-[10px] rounded-lg tracking-widest uppercase flex items-center gap-1 select-none animate-in fade-in zoom-in-50 duration-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Lunas
          </div>

          {/* Brand Header */}
          <div className="text-center pb-5 border-b border-white/5 mb-5 flex flex-col items-center">
            <img src="/logo.png" className="w-12 h-12 rounded-full mb-3 object-cover border border-white/10" alt="Logo" />
            <h1 className="text-base font-black tracking-tight uppercase text-white leading-tight">
              {merchant.storeName}
            </h1>
            {merchant.storeTagline && (
              <p className="text-[10px] text-slate-450 italic mt-0.5 font-medium leading-none">
                {merchant.storeTagline}
              </p>
            )}
            <div className="flex flex-col gap-1.5 mt-3 text-[10px] text-slate-400 font-medium font-sans">
              <div className="flex items-start justify-center gap-1.5 max-w-[280px] mx-auto text-center">
                <MapPin className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                <span className="leading-tight text-center">{merchant.storeAddress}, {merchant.city}</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-1 text-center">
                <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="leading-none text-center">WA: {merchant.merchantPhone || merchant.ownerWhatsapp}</span>
              </div>
            </div>
          </div>

          {/* Meta Info Table */}
          <div className="grid grid-cols-2 gap-3.5 text-[10.5px] border-b border-white/5 pb-5 mb-5">
            <div className="flex flex-col gap-1.5">
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[8.5px] tracking-wider mb-0.5">Pelanggan</span>
                <span className="text-white font-bold">
                  {transaction.customerName.replace(/meja/gi, 'Order').replace(/self\s*order/gi, 'Order')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[8.5px] tracking-wider mb-0.5">Metode Bayar</span>
                <span className="text-red-400 font-black uppercase">
                  {transaction.paymentMethod}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-right">
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[8.5px] tracking-wider mb-0.5">Tanggal</span>
                <span className="text-white font-semibold font-mono">
                  {new Date(transaction.createdAt).toLocaleDateString("id-ID")}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[8.5px] tracking-wider mb-0.5">Waktu</span>
                <span className="text-white font-semibold font-mono">
                  {new Date(transaction.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="border-b border-white/5 pb-4 mb-4">
            <div className="flex items-center gap-1.5 mb-3 text-slate-400">
              <ShoppingBag className="w-3.5 h-3.5 text-red-500" />
              <span className="text-[10px] uppercase font-black tracking-wider">Item Belanjaan</span>
            </div>
            
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-[11px]">
                  <div className="flex-1 pr-3">
                    {(() => {
                      const lines = item.productName.split("\n");
                      const notes = item.notes || '';
                      return (
                        <>
                          <span className="text-white font-bold leading-tight block">
                            {lines[0]}
                          </span>
                          {lines.slice(1).map((line, i) => {
                            const isNote = line.toLowerCase().startsWith("catatan:");
                            const isSpicyProduct = /mie|kebab|lumpia/i.test(lines[0]);
                            const isSpicyDetail = /^(level|tidak pedas|sedang|pedas)/i.test(line.trim());
                            if (!isSpicyProduct && isSpicyDetail) return null;

                            return (
                              <span key={i} className={`text-[9px] font-extrabold uppercase block tracking-tight mt-0.5 ${isNote ? "text-[#f97316] mt-1.5 border-t border-white/5 pt-1" : "text-red-400"}`}>
                                » {line}
                              </span>
                            );
                          })}
                          {notes && notes.split('\n').map((n: string) => n.trim()).filter(Boolean).map((note: string, i: number) => {
                            const cleanProductName = item.productName.toLowerCase();
                            const cleanNote = note.toLowerCase();
                            const isAlreadyInName = cleanProductName.includes(cleanNote) || 
                                                    (cleanNote.startsWith("catatan:") && cleanProductName.includes(cleanNote.replace("catatan:", "").trim()));
                            if (isAlreadyInName) return null;
                            const isSpicyProduct = /mie|kebab|lumpia/i.test(lines[0]);
                            const isSpicyDetail = /^(level|tidak pedas|sedang|pedas)/i.test(note.trim());
                            if (!isSpicyProduct && isSpicyDetail) return null;

                            const isNote = note.toLowerCase().startsWith("catatan:");
                            return (
                              <span key={i} className={`text-[9px] font-extrabold uppercase block tracking-tight mt-0.5 ${isNote ? "text-[#f97316] mt-1.5 border-t border-white/5 pt-1" : "text-red-400"}`}>
                                » {note}
                              </span>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                  <div className="w-10 text-center text-slate-300 font-bold font-mono">
                    {item.quantity}x
                  </div>
                  <div className="w-20 text-right text-white font-bold font-mono">
                    {formatRupiah(item.unitPrice * item.quantity)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="space-y-2 text-[11px] border-b border-white/5 pb-4 mb-4 font-sans">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal Menu</span>
              <span className="font-mono">{formatRupiah(orderSubtotal)}</span>
            </div>
            {merchant.enableServiceCharge && calculatedServiceCharge > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Biaya Layanan ({merchant.serviceChargeRate}%)</span>
                <span className="font-mono">{formatRupiah(calculatedServiceCharge)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-[13px] pt-1.5 border-t border-white/5">
              <span className="text-white">Total Akhir</span>
              <span className="text-yellow-500 font-mono">{formatRupiah(transaction.total)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Jumlah Uang Bayar</span>
              <span className="font-mono">{formatRupiah(amountPaidValue)}</span>
            </div>
            {transaction.paymentMethod === "Tunai" && (
              <div className="flex justify-between font-bold text-emerald-400">
                <span>Uang Kembalian</span>
                <span className="font-mono">{formatRupiah(changeValue)}</span>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="text-center pt-2">
            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-0.5 font-sans">
              {merchant.receiptHeader || "TERIMA KASIH"}
            </span>
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block">
              {merchant.receiptFooter || "ATAS KUNJUNGAN ANDA"}
            </span>
          </div>

        </div>

        {/* Action Buttons Footer Area */}
        <div className="mt-5 flex flex-col gap-3 no-print">
          <button
            type="button"
            onClick={handleShareWhatsapp}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider py-4 px-4 rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-700/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Share2 className="w-4 h-4" /> Share Struk (WhatsApp)
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleDownloadImage}
              className="w-full bg-amber-600 hover:bg-amber-700 border border-amber-500 text-white font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Download className="w-4 h-4" /> Unduh Gambar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Printer className="w-4 h-4 text-red-500" /> Cetak Nota
            </button>
          </div>
        </div>

      </div>

      {/* Small Watermark */}
      <div className="text-center text-[8.5px] text-slate-600 font-black uppercase tracking-widest mt-4 no-print select-none">
        Powered by WarungOS POS
      </div>
    </div>
  );
}
