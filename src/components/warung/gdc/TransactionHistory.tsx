// @ts-nocheck
import React, { useState } from 'react';
import { Transaction } from '@/lib/types';
import { Search, Calendar, DollarSign, FileText, ShoppingBag, ArrowRight, Printer, FlameIcon, X, Trash2, Edit2, Save, Loader2 } from 'lucide-react';
import { useAppState } from '@/components/providers/app-state-provider';

interface TransactionHistoryProps {
  transactions: Transaction[];
}

const safeParseDate = (dateStr: string) => {
  if (!dateStr) return null;
  let formatted = dateStr.trim();
  if (formatted.includes(' ') && !formatted.includes('T')) {
    formatted = formatted.replace(' ', 'T');
  }
  
  const match = formatted.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const [_, year, month, day, hours, minutes, seconds] = match;
    const d = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      seconds ? parseInt(seconds) : 0
    );
    if (!isNaN(d.getTime())) return d;
  }

  const d = new Date(formatted);
  return isNaN(d.getTime()) ? null : d;
};

const formatForDateTimeInput = (dateStr: string) => {
  const d = safeParseDate(dateStr);
  if (!d) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const { settings, deleteTransaction, deleteTransactionsBulk, updateTransaction } = useAppState();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('');
  const [editCreatedAt, setEditCreatedAt] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleBulkDelete = async () => {
    if (selectedTxIds.length === 0) return;
    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus ${selectedTxIds.length} nota transaksi terpilih secara massal? Stok makanan/minuman dari seluruh nota ini akan dikembalikan otomatis.`);
    if (!confirmDelete) return;

    try {
      setIsBulkDeleting(true);
      await deleteTransactionsBulk(selectedTxIds);
      setSelectedTxIds([]);
      setSelectedTx(null);
    } catch (e) {
      alert("Gagal menghapus transaksi terpilih.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTx) return;
    const confirmDelete = window.confirm("Yakin ingin menghapus nota ini? Stok makanan/minuman yang ada di dalam nota ini akan dikembalikan secara otomatis.");
    if (!confirmDelete) return;

    try {
      setIsDeleting(true);
      await deleteTransaction(selectedTx.id);
      setSelectedTxIds((prev) => prev.filter((id) => id !== selectedTx.id));
      setSelectedTx(null);
    } catch (e) {
      alert("Gagal menghapus transaksi.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTx) return;
    try {
      setIsSaving(true);
      const d = safeParseDate(editCreatedAt);
      if (!d) {
        alert("Format tanggal tidak valid.");
        return;
      }
      const isoDate = d.toISOString();
      await updateTransaction(selectedTx.id, { 
        paymentMethod: editPaymentMethod as any,
        createdAt: isoDate,
      });
      setIsEditing(false);
      setSelectedTx((prev) => prev ? { ...prev, paymentMethod: editPaymentMethod as any, createdAt: isoDate } : null);
    } catch (e) {
      alert("Gagal menyimpan perubahan.");
    } finally {
      setIsSaving(false);
    }
  };

  const openTx = (tx: Transaction) => {
    setSelectedTx(tx);
    setIsEditing(false);
    setEditPaymentMethod(tx.paymentMethod);
    setEditCreatedAt(formatForDateTimeInput(tx.createdAt));
  };

  // Helper variables for selected transaction to avoid undefined crashes and NaN values
  const calculatedSubtotal = selectedTx
    ? selectedTx.items.reduce((sum, item) => sum + (item.sellPrice || item.unitPrice || 0) * item.quantity, 0)
    : 0;
  const amountPaidVal = selectedTx
    ? selectedTx.amountPaid || selectedTx.total || 0
    : 0;
  const changeVal = selectedTx
    ? selectedTx.change || (amountPaidVal - selectedTx.total) || 0
    : 0;
  const serviceChargeVal = selectedTx
    ? selectedTx.serviceCharge || 0
    : 0;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const generateRawBtReceiptText = () => {
    if (!selectedTx) return "";
    const is80 = settings?.printerPaperSize === '80mm';
    const width = is80 ? 48 : 32;
    
    const center = (text: string) => {
      if (text.length >= width) return text.substring(0, width);
      const pad = Math.floor((width - text.length) / 2);
      return ' '.repeat(pad) + text;
    };

    const justify = (left: string, right: string) => {
      const spaceNeeded = width - left.length - right.length;
      if (spaceNeeded <= 0) {
        return left + ' ' + right;
      }
      return left + ' '.repeat(spaceNeeded) + right;
    };

    let lines: string[] = [];
    
    // Header
    lines.push(center(settings?.merchantName || "MIE JEBEW GDC"));
    if (settings?.merchantAddress) {
      lines.push(center(settings.merchantAddress));
    }
    if (settings?.merchantPhone) {
      lines.push(center(`Telp/WA: ${settings.merchantPhone}`));
    }
    lines.push('-'.repeat(width));

    // Metadata
    lines.push(justify("Invoice:", selectedTx.id));
    lines.push(justify("Tanggal:", new Date(selectedTx.createdAt).toLocaleDateString('id-ID')));
    lines.push(justify("Kasir:", settings?.userProfileName || settings?.ownerName || 'Kasir'));
    
    const cleanCustName = (selectedTx.customerName || 'Umum').replace(/\bmeja\b/gi, 'Order').replace(/\bself\s*order\b/gi, 'Order');
    lines.push(justify("Pelanggan:", cleanCustName));
    lines.push(justify("Metode:", selectedTx.paymentMethod.toUpperCase()));
    lines.push('='.repeat(width));

    // Items
    lines.push(justify("Item", "Total"));
    lines.push('-'.repeat(width));
    
    selectedTx.items.forEach((item) => {
      const name = item.productName || item.product?.name || 'Menu';
      lines.push(name);
      
      if (item.notes) {
        item.notes.split('\n').map((n: string) => n.trim()).filter(Boolean).forEach((note: string) => {
          lines.push(`  » ${note.toUpperCase()}`);
        });
      }

      const qtyPrice = `${item.quantity} x ${(item.sellPrice || item.unitPrice || 0).toLocaleString('id-ID')}`;
      const totalVal = ((item.sellPrice || item.unitPrice || 0) * item.quantity).toLocaleString('id-ID');
      lines.push(justify(`  ${qtyPrice}`, totalVal));
    });

    lines.push('-'.repeat(width));

    // Totals
    lines.push(justify("Subtotal:", `Rp ${calculatedSubtotal.toLocaleString('id-ID')}`));
    if (serviceChargeVal > 0) {
      lines.push(justify(`Layanan:`, `Rp ${serviceChargeVal.toLocaleString('id-ID')}`));
    }
    lines.push(justify("TOTAL AKHIR:", `Rp ${selectedTx.total.toLocaleString('id-ID')}`));
    lines.push(justify("Bayar:", `Rp ${amountPaidVal.toLocaleString('id-ID')}`));
    lines.push(justify("Kembalian:", `Rp ${selectedTx.paymentMethod === 'Tunai' ? changeVal.toLocaleString('id-ID') : '0'}`));
    lines.push('-'.repeat(width));

    // Footer
    if (settings?.receiptHeader) lines.push(center(settings.receiptHeader));
    if (settings?.receiptFooter) lines.push(center(settings.receiptFooter));
    lines.push(center(`*** LAYANAN WA: ${settings?.merchantPhone || ''} ***`));
    
    lines.push("\n\n\n\n");

    return lines.join("\n");
  };

  const handlePrintRawBt = () => {
    try {
      const text = generateRawBtReceiptText();
      const base64 = btoa(unescape(encodeURIComponent(text)));
      const url = `rawbt:base64,${base64}`;
      window.location.href = url;
    } catch (err) {
      alert("Gagal memformat struk untuk RawBT: " + err);
    }
  };

  // Compute overall stats
  const totalIncome = transactions.reduce((sum, tx) => sum + tx.total, 0);
  const totalTxCount = transactions.length;
  const averageTxValue = totalTxCount > 0 ? Math.round(totalIncome / totalTxCount) : 0;

  // Filter transactions based on query
  const filteredTx = [...transactions].reverse().filter((tx) => {
    const term = searchTerm.toLowerCase();
    return (
      tx.id.toLowerCase().includes(term) ||
      "Umum".toLowerCase().includes(term) ||
      tx.paymentMethod.toLowerCase().includes(term)
    );
  });

  const isAllSelected = filteredTx.length > 0 && filteredTx.every((tx) => selectedTxIds.includes(tx.id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = filteredTx.map((tx) => tx.id);
      setSelectedTxIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      const filteredIds = filteredTx.map((tx) => tx.id);
      setSelectedTxIds((prev) => {
        const union = new Set([...prev, ...filteredIds]);
        return Array.from(union);
      });
    }
  };

  return (
    <>
      <div className="flex-1 flex flex-col md:flex-row gap-6 h-full overflow-hidden p-1 select-none">
        
        {/* Analytics Grid & Transactions List */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          
          {/* KPI Widget Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            <div className="glass-morphism rounded-2xl p-4 flex items-center gap-4 border-l-4 border-red-500">
              <div className="p-3 bg-red-500/10 text-red-500 dark:text-red-400 rounded-xl border border-red-500/15">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-semibold">TOTAL OMSET RIWAYAT</span>
                <span className="text-lg font-bold text-foreground dark:text-white font-mono">{formatRupiah(totalIncome)}</span>
              </div>
            </div>

            <div className="glass-morphism rounded-2xl p-4 flex items-center gap-4 border-l-4 border-yellow-500">
              <div className="p-3 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 rounded-xl border border-yellow-500/15">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-semibold font-sans">TRANSAKSI SUKSES</span>
                <span className="text-lg font-bold text-foreground dark:text-white font-mono">{totalTxCount} Nota</span>
              </div>
            </div>

            <div className="glass-morphism rounded-2xl p-4 flex items-center gap-4 border-l-4 border-slate-400 dark:border-white">
              <div className="p-3 bg-black/5 dark:bg-white/10 text-foreground dark:text-white rounded-xl border border-black/5 dark:border-white/15">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-semibold font-sans">RATA-RATA NOTA</span>
                <span className="text-lg font-bold text-foreground dark:text-white font-mono">{formatRupiah(averageTxValue)}</span>
              </div>
            </div>
          </div>

          {/* Transactions list table */}
          <div className="flex-1 glass-morphism rounded-3xl p-6 flex flex-col overflow-hidden">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-foreground dark:text-white uppercase tracking-tight">Log Arsip Penjualan</h2>
                <p className="text-slate-550 dark:text-slate-400 text-xs">Menyimpan dan merekam seluruh akuntansi restoran</p>
              </div>
              
              {/* Search Input */}
              <div className="relative w-full sm:max-w-xs">
                <input
                  type="text"
                  placeholder="Cari nota, nama Self Order, metode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl py-2 pl-10 pr-4 text-xs text-foreground dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Bulk Actions Panel */}
            {selectedTxIds.length > 0 && (
              <div className="mb-4 p-3 bg-red-500/10 dark:bg-red-500/15 border border-red-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top duration-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {selectedTxIds.length} Nota Transaksi Terpilih
                  </span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedTxIds([])}
                    className="flex-1 sm:flex-initial px-4 py-2 border border-slate-300 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-350 rounded-xl text-xs font-extrabold cursor-pointer transition-all uppercase tracking-wider"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={isBulkDeleting}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-red-500/10 disabled:opacity-50 uppercase tracking-wider"
                  >
                    {isBulkDeleting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Menghapus...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus Terpilih
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* List display */}
            <div className="flex-1 overflow-x-auto overflow-y-auto w-full no-scrollbar">
              {filteredTx.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-black/2 dark:bg-white/2 rounded-2xl border border-dashed border-black/10 dark:border-white/5">
                  <FileText className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-3" />
                  <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Belum Ada Transaksi Tercatat</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">Pastikan Anda menyelesaikan pembayaran di kasir utama untuk merekam aktivitas penjualan.</p>
                </div>
              ) : (
                <div className="min-w-[600px] lg:min-w-0">
                  <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-black/10 dark:border-white/10 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="pb-3 w-8 pr-2 select-none">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-black/20 dark:border-white/20 text-red-650 focus:ring-red-500/50 cursor-pointer transition-all"
                          />
                        </div>
                      </th>
                      <th className="pb-3 pr-2">Nota Nomor</th>
                      <th className="pb-3 px-2">Tanggal</th>
                      <th className="pb-3 px-2">Pelanggan</th>
                      <th className="pb-3 px-2">Metode</th>
                      <th className="pb-3 px-2 text-right">Nilai Total</th>
                      <th className="pb-3 pl-2 text-right">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {filteredTx.map((tx) => (
                      <tr 
                        key={tx.id} 
                        onClick={() => openTx(tx)}
                        className={`hover:bg-black/5 dark:hover:bg-white/5 group cursor-pointer transition-colors ${
                          selectedTxIds.includes(tx.id) ? "bg-red-500/5 dark:bg-red-500/10 hover:bg-red-500/10 dark:hover:bg-red-500/20" : ""
                        }`}
                      >
                        <td className="py-3.5 w-8 pr-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={selectedTxIds.includes(tx.id)}
                              onChange={() => {
                                setSelectedTxIds((prev) =>
                                  prev.includes(tx.id) ? prev.filter((id) => id !== tx.id) : [...prev, tx.id]
                                );
                              }}
                              className="w-4 h-4 rounded border-black/20 dark:border-white/20 text-red-650 focus:ring-red-500/50 cursor-pointer transition-all"
                            />
                          </div>
                        </td>
                        <td className="py-3.5 pr-2 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {tx.id}
                        </td>
                        <td className="py-3.5 px-2 text-xs text-slate-600 dark:text-slate-400 font-mono">
                          {new Date(tx.createdAt).toLocaleDateString('id-ID')} {new Date(tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3.5 px-2 font-semibold text-foreground dark:text-white">
                          {"Umum"}
                        </td>
                        <td className="py-3.5 px-2">
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg border uppercase tracking-wider ${
                            tx.paymentMethod === 'Tunai' 
                              ? 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/25' 
                              : tx.paymentMethod === 'QRIS'
                              ? 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/25'
                              : 'bg-emerald-500/15 text-emerald-650 dark:text-emerald-300 border-emerald-500/25'
                          }`}>
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 font-mono font-extrabold text-foreground dark:text-white text-right">
                          {formatRupiah(tx.total)}
                        </td>
                        <td className="py-3.5 pl-2 text-right">
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-red-400 group-hover:translate-x-1 transition-all inline-block" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detail Slideout Drawer / Receipt Viewer */}
        {selectedTx && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex justify-end md:relative md:inset-auto md:bg-transparent md:backdrop-blur-none md:z-auto animate-in fade-in duration-200"
            onClick={() => setSelectedTx(null)}
          >
            <aside 
              className="w-full max-w-md md:w-80 bg-sidebar/95 dark:bg-slate-950/95 border-l border-sidebar-border/40 dark:border-white/10 p-6 flex flex-col justify-between shrink-0 h-full overflow-hidden relative shadow-2xl md:shadow-none animate-in slide-in-from-right duration-250 md:animate-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="flex justify-between items-center mb-5 pb-3 border-b border-black/5 dark:border-white/5">
                  <h3 className="text-sm font-bold text-foreground dark:text-white uppercase tracking-tight">Review Nota</h3>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => setIsEditing(!isEditing)}
                      className="p-1.5 bg-yellow-500/10 hover:bg-yellow-500/25 rounded-lg text-yellow-600 dark:text-yellow-500 transition-colors"
                      title="Edit Nota"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="p-1.5 bg-red-500/10 hover:bg-red-500/25 rounded-lg text-red-500 transition-colors disabled:opacity-50"
                      title="Hapus Nota"
                    >
                      {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                    <button 
                      onClick={() => setSelectedTx(null)} 
                      className="p-1.5 bg-slate-500/10 hover:bg-slate-500/25 rounded-lg text-slate-500 dark:text-slate-400 transition-colors ml-1"
                      title="Tutup"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Simulated Printed Thermal Sticker in Slate theme */}
                <div className="bg-slate-50 dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-2xl p-4 text-xs font-mono text-slate-700 dark:text-slate-300">
                  <div className="text-center border-b border-dashed border-black/20 dark:border-white/20 pb-2 mb-3">
                    <span className="font-black text-foreground dark:text-white text-sm block">MIE JEBEW GDC</span>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 block">Jl. Boulevard Grand Depok City, Depok</span>
                  </div>

                  <div className="flex flex-col gap-1.5 mb-3 text-[10px]">
                    <div className="flex justify-between">
                      <span>Nota ID:</span>
                      <span className="font-semibold text-foreground dark:text-white">{selectedTx.id}</span>
                    </div>
                    <div className="flex justify-between items-center my-1">
                      <span>Tanggal:</span>
                      {isEditing ? (
                        <input 
                          type="datetime-local"
                          value={editCreatedAt}
                          onChange={(e) => setEditCreatedAt(e.target.value)}
                          className="bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded px-1.5 py-0.5 text-[10px] text-foreground dark:text-white outline-none focus:ring-1 focus:ring-red-500 w-44"
                        />
                      ) : (
                        <span>{new Date(selectedTx.createdAt).toLocaleDateString()} {new Date(selectedTx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span>Kasir:</span>
                      <span>{settings?.userProfileName || settings?.ownerName || 'Kasir'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pelanggan:</span>
                      <span className="text-foreground dark:text-white font-bold">{(selectedTx.customerName || '').replace(/\bmeja\b/gi, 'Order').replace(/\bself\s*order\b/gi, 'Order')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Metode:</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <select 
                            value={editPaymentMethod}
                            onChange={(e) => setEditPaymentMethod(e.target.value)}
                            className="bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded px-1.5 py-0.5 text-[10px] text-foreground dark:text-white outline-none focus:ring-1 focus:ring-red-500"
                          >
                            <option value="Tunai">Tunai</option>
                            <option value="QRIS">QRIS</option>
                            <option value="Transfer">Transfer</option>
                          </select>
                          <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 p-1 rounded transition-colors disabled:opacity-50"
                            title="Simpan Perubahan"
                          >
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-red-500 dark:text-red-400 font-bold uppercase">{selectedTx.paymentMethod}</span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-b border-dashed border-black/20 dark:border-white/20 py-2 my-2 text-[10px]">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-500 dark:text-slate-400 font-normal">
                          <th>Menu</th>
                          <th className="text-center">Qty</th>
                          <th className="text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTx.items.map((item, idx) => (
                          <tr key={idx} className="align-top">
                            <td className="py-1">
                              {(() => {
                                const productName = item.productName || item.product?.name || 'Menu';
                                return productName.split('\n').map((line, i) => (
                                  <span key={i} className={i === 0 ? "block text-foreground dark:text-white font-bold break-words whitespace-normal pr-1 leading-tight" : "block text-[9px] text-red-500 dark:text-red-400 font-extrabold uppercase tracking-tight mt-0.5"}>
                                    {i === 0 ? line : `» ${line}`}
                                  </span>
                                ));
                              })()}
                              {item.notes && <span className="block text-[8px] text-yellow-600 dark:text-yellow-500 italic mt-0.5">* {item.notes}</span>}
                            </td>
                            <td className="text-center py-1 text-foreground dark:text-white font-bold">{item.quantity}</td>
                            <td className="text-right py-1 text-foreground dark:text-white">{((item.sellPrice || item.unitPrice || 0) * item.quantity).toLocaleString('id-ID')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-1 text-[10px]">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatRupiah(calculatedSubtotal)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-foreground dark:text-white border-t border-black/10 dark:border-white/10 pt-1 mt-1">
                      <span>Total tagihan:</span>
                      <span className="text-yellow-600 dark:text-yellow-400">{formatRupiah(selectedTx.total)}</span>
                    </div>
                    <div className="flex justify-between text-slate-550 dark:text-slate-400">
                      <span>Dibayarkan:</span>
                      <span>{formatRupiah(amountPaidVal)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                      <span>Uang Kembali:</span>
                      <span>{formatRupiah(changeVal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => { try { window.print(); } catch(e) {} }}
                  className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-foreground dark:text-white rounded-xl py-3 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-red-500" /> CETAK (PC)
                </button>
                <button
                  type="button"
                  onClick={handlePrintRawBt}
                  className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl py-3 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-650/20"
                >
                  <Printer className="w-3.5 h-3.5 text-white" /> CETAK (RAWBT)
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* ── PRINT ONLY AREA (HIDDEN FROM SCREEN, VISIBLE ONLY ON PRINTING) ── */}
      {selectedTx && (
        <div id="print-receipt" className="hidden print:block bg-white text-black font-sans">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                margin: 0;
                size: ${settings?.printerPaperSize || '58mm'} auto;
              }
              #print-receipt {
                width: ${settings?.printerPaperSize || '58mm'} !important;
                font-size: ${settings?.printerPaperSize === '80mm' ? '12px' : '10px'} !important;
              }
            }
          ` }} />
          <div className="flex-1 overflow-y-auto pr-1 no-scrollbar">
            <div className="border-b-2 border-dashed border-slate-300 pb-4 text-center">
              <h4 className="text-lg font-black tracking-tight uppercase">{settings?.merchantName || "MIE JEBEW GDC"}</h4>
              <p className="text-[10px] text-slate-500 font-medium">{settings?.merchantAddress || "Jl. Boulevard Grand Depok City, Depok"}</p>
              <p className="text-[10px] text-slate-500 font-medium">Telp / WA: {settings?.merchantPhone || "0812-xxxx-xxxx"}</p>
            </div>

            <div className="text-[10px]" style={{ fontFamily: 'monospace' }}>
              <table className="w-full mt-3">
                <tbody>
                  <tr>
                    <td className="text-slate-500">Invoice:</td>
                    <td className="text-right font-bold text-slate-800">{selectedTx.id}</td>
                  </tr>
                  <tr>
                    <td className="text-slate-500">Tanggal:</td>
                    <td className="text-right">
                      {new Date(selectedTx.createdAt).toLocaleDateString('id-ID')} {new Date(selectedTx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-slate-500">Kasir:</td>
                    <td className="text-right">{settings?.userProfileName || settings?.ownerName || 'Kasir'}</td>
                  </tr>
                  <tr>
                    <td className="text-slate-500">Pelanggan:</td>
                    <td className="text-right font-bold text-slate-800">{(selectedTx.customerName || 'Umum').replace(/\bmeja\b/gi, 'Order').replace(/\bself\s*order\b/gi, 'Order')}</td>
                  </tr>
                  <tr>
                    <td className="text-slate-500">Metode:</td>
                    <td className="text-right font-extrabold uppercase text-red-600">{selectedTx.paymentMethod}</td>
                  </tr>
                </tbody>
              </table>

              <div className="border-t-2 border-b-2 border-dashed border-slate-300 my-3 py-2">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-500 font-normal">
                      <th>Menu</th>
                      <th className="text-center">Qty</th>
                      <th className="text-right">Sum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTx.items.map((item, idx) => {
                      const finalSellPrice = item.sellPrice || item.unitPrice || 0;
                      const productName = item.productName || item.product?.name || 'Menu';
                      return (
                        <tr key={idx} className="align-top">
                          <td className="py-1">
                            {productName.split('\n').map((line, idx) => (
                              <span key={idx} className={idx === 0 ? "block font-bold text-slate-700 break-words whitespace-normal pr-1 leading-tight" : "block text-[8.5px] text-red-600 font-extrabold uppercase tracking-tight mt-0.5"}>
                                {idx === 0 ? line : `» ${line}`}
                              </span>
                            ))}
                            {item.notes && (
                              <span className="block text-[8.5px] text-red-600 font-extrabold uppercase tracking-tight mt-0.5">
                                » {item.notes}
                              </span>
                            )}
                          </td>
                          <td className="text-center py-1 text-slate-800 font-bold">{item.quantity}</td>
                          <td className="text-right py-1 font-bold text-slate-800">
                            {(finalSellPrice * item.quantity).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <table className="w-full mt-1">
                <tbody>
                  <tr>
                    <td className="text-slate-500">Subtotal:</td>
                    <td className="text-right">Rp {calculatedSubtotal.toLocaleString('id-ID')}</td>
                  </tr>
                  {serviceChargeVal > 0 && (
                    <tr>
                      <td className="text-slate-500">Biaya Layanan:</td>
                      <td className="text-right">Rp {serviceChargeVal.toLocaleString('id-ID')}</td>
                    </tr>
                  )}
                  <tr className="border-t border-slate-200 font-black">
                    <td className="text-slate-900 pt-1">Total Akhir:</td>
                    <td className="text-right text-red-600 pt-1">Rp {selectedTx.total.toLocaleString('id-ID')}</td>
                  </tr>
                  <tr>
                    <td className="text-slate-500">Bayar:</td>
                    <td className="text-right">
                      Rp {amountPaidVal.toLocaleString('id-ID')}
                    </td>
                  </tr>
                  <tr className="font-bold">
                    <td className="text-slate-500">Kembalian:</td>
                    <td className="text-right text-emerald-600">
                      Rp {selectedTx.paymentMethod === 'Tunai' ? changeVal.toLocaleString('id-ID') : '0'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border-t-2 border-dashed border-slate-300 pt-3 text-center mt-3">
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tight block mb-0.5 font-sans">
                {settings?.receiptHeader || "TERIMA KASIH"}
              </span>
              <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block mb-0.5">
                {settings?.receiptFooter || "ATAS KUNJUNGAN ANDA"}
              </span>
              <span className="text-[9px] text-slate-400 block font-mono mt-1">
                *** LAYANAN WA: {settings?.merchantPhone || "0812-xxxx-xxxx"} ***
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

