// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { CartItem, Transaction, Settings } from '@/lib/types';
import { X, CreditCard, Banknote, QrCode, FileText, Printer, CheckCircle, Loader2 } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  serviceCharge: number;
  settings: Settings;
  onSuccessCheckout: (transaction: Transaction) => Promise<boolean>;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  subtotal,
  tax,
  total,
  serviceCharge,
  settings,
  onSuccessCheckout
}: CheckoutModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'QRIS' | 'Debit'>('Tunai');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [createdTransaction, setCreatedTransaction] = useState<Transaction | null>(null);
  // Mobile tab switcher
  const [mobileTab, setMobileTab] = useState<'payment' | 'receipt'>('payment');

  useEffect(() => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    setInvoiceNo(`INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${rand}`);
    
    // Restore from localStorage if present
    const savedName = localStorage.getItem("miejebew_checkout_customer_name");
    setCustomerName(savedName || '');

    const savedMethod = localStorage.getItem("miejebew_checkout_payment_method");
    if (savedMethod === 'Tunai' || savedMethod === 'QRIS' || savedMethod === 'Debit') {
      setPaymentMethod(savedMethod);
    } else {
      setPaymentMethod('Tunai');
    }

    const savedAmountInput = localStorage.getItem("miejebew_checkout_amount_paid_input");
    const savedAmount = localStorage.getItem("miejebew_checkout_amount_paid");
    if (savedAmountInput && savedAmount) {
      setAmountPaidInput(savedAmountInput);
      setAmountPaid(Number(savedAmount));
    } else {
      setAmountPaid(0);
      setAmountPaidInput('');
    }

    setIsCompleted(false);
    setIsSubmitting(false);
    setCreatedTransaction(null);
    setMobileTab('payment');
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !isCompleted) {
      localStorage.setItem("miejebew_checkout_customer_name", customerName);
    }
  }, [customerName, isOpen, isCompleted]);

  useEffect(() => {
    if (isOpen && !isCompleted) {
      localStorage.setItem("miejebew_checkout_payment_method", paymentMethod);
    }
  }, [paymentMethod, isOpen, isCompleted]);

  useEffect(() => {
    if (isOpen && !isCompleted) {
      if (amountPaidInput) {
        localStorage.setItem("miejebew_checkout_amount_paid_input", amountPaidInput);
        localStorage.setItem("miejebew_checkout_amount_paid", String(amountPaid));
      } else {
        localStorage.removeItem("miejebew_checkout_amount_paid_input");
        localStorage.removeItem("miejebew_checkout_amount_paid");
      }
    }
  }, [amountPaidInput, amountPaid, isOpen, isCompleted]);

  useEffect(() => {
    if (isCompleted) {
      localStorage.removeItem("miejebew_checkout_customer_name");
      localStorage.removeItem("miejebew_checkout_payment_method");
      localStorage.removeItem("miejebew_checkout_amount_paid_input");
      localStorage.removeItem("miejebew_checkout_amount_paid");
    }
  }, [isCompleted]);

  if (!isOpen) return null;

  const activeTotal = isCompleted && createdTransaction ? createdTransaction.total : total;
  const activeSubtotal = isCompleted && createdTransaction ? createdTransaction.subtotal : subtotal;
  const activeServiceCharge = isCompleted && createdTransaction ? createdTransaction.tax : serviceCharge;
  const activeAmountPaid = isCompleted && createdTransaction ? (createdTransaction.amountPaid || 0) : amountPaid;
  const activeChange = isCompleted && createdTransaction ? (createdTransaction.change || 0) : (amountPaid >= total ? amountPaid - total : 0);
  const activeCartItems = isCompleted && createdTransaction ? createdTransaction.items : cartItems;
  const activeCustomerName = isCompleted && createdTransaction ? createdTransaction.customerName : customerName;
  const activePaymentMethod = isCompleted && createdTransaction ? createdTransaction.paymentMethod : paymentMethod;
  const activeInvoiceNo = isCompleted && createdTransaction ? createdTransaction.invoiceNo : invoiceNo;

  const isInsufficient = paymentMethod === 'Tunai' && amountPaid < total;

  const presetAmounts = [total, 20000, 50000, 100000, 150000, 200000].filter(val => val >= total);
  const uniquePresets = Array.from(new Set(presetAmounts)).sort((a, b) => a - b).slice(0, 5);

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const handlePresetClick = (amount: number) => {
    setAmountPaid(amount);
    setAmountPaidInput(amount.toString());
  };

  const handleManualInput = (val: string) => {
    const clean = val.replace(/\D/g, '');
    setAmountPaidInput(clean);
    setAmountPaid(clean ? parseInt(clean, 10) : 0);
  };

  const handlePaymentMethodChange = (method: 'Tunai' | 'QRIS' | 'Debit') => {
    setPaymentMethod(method);
    if (method !== 'Tunai') {
      setAmountPaid(total);
      setAmountPaidInput(total.toString());
    } else {
      setAmountPaid(0);
      setAmountPaidInput('');
    }
  };

  const processPayment = async () => {
    if (paymentMethod === 'Tunai' && amountPaid < total) return;
    setIsSubmitting(true);
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      invoiceNo,
      date: new Date().toISOString(),
      items: [...cartItems],
      subtotal,
      tax,
      total,
      amountPaid: paymentMethod === 'Tunai' ? amountPaid : total,
      change: paymentMethod === 'Tunai' ? activeChange : 0,
      customerName: customerName.trim() || 'Umum',
      paymentMethod
    };
    try {
      const success = await onSuccessCheckout(newTx);
      if (success) {
        setCreatedTransaction(newTx);
        setIsCompleted(true);
      }
    } catch (err) {
      console.error("Checkout failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Shared receipt content — rendered in both mobile tab and desktop aside
  const ReceiptContent = () => (
    <div className="flex-1 overflow-y-auto pr-1 no-scrollbar">
      <div className="border-b-2 border-dashed border-slate-300 pb-4 text-center">
        <h4 className="text-lg font-black tracking-tight uppercase">{settings.merchantName}</h4>
        <p className="text-[10px] text-slate-500 font-medium">{settings.merchantAddress}</p>
        <p className="text-[10px] text-slate-500 font-medium">Telp / WA: {settings.merchantPhone}</p>
      </div>

      <div className="text-[10px]" style={{ fontFamily: 'monospace' }}>
        <table className="w-full mt-3">
          <tbody>
            <tr><td className="text-slate-500">Invoice:</td><td className="text-right font-bold text-slate-800">{activeInvoiceNo}</td></tr>
            <tr><td className="text-slate-500">Tanggal:</td><td className="text-right">{new Date().toLocaleDateString('id-ID')}</td></tr>
            <tr><td className="text-slate-500">Kasir:</td><td className="text-right">{settings.userProfileName || settings.ownerName || 'Kasir'}</td></tr>
            <tr><td className="text-slate-500">Pelanggan:</td><td className="text-right font-bold text-slate-800">{(activeCustomerName || 'Umum').replace(/\bmeja\b/gi, 'Order').replace(/\bself\s*order\b/gi, 'Order')}</td></tr>
            <tr><td className="text-slate-500">Metode:</td><td className="text-right font-extrabold uppercase text-red-600">{activePaymentMethod}</td></tr>
          </tbody>
        </table>

        <div className="border-t-2 border-b-2 border-dashed border-slate-300 my-3 py-2">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 font-normal">
                <th>Menu</th><th className="text-center">Qty</th><th className="text-right">Sum</th>
              </tr>
            </thead>
            <tbody>
              {activeCartItems.map((item, idx) => (
                <tr key={idx} className="align-top">
                  <td className="py-1">
                    <span className="block font-bold text-slate-700 break-words whitespace-normal pr-1 leading-tight">{item.productName || item.product?.name || 'Menu'}</span>
                    {item.notes && item.notes.split('\n').map((n: string) => n.trim()).filter(Boolean).map((note: string, i: number) => (
                      <span key={i} className="block text-[8.5px] text-red-600 font-extrabold uppercase tracking-tight mt-0.5">» {note}</span>
                    ))}
                  </td>
                  <td className="text-center py-1 text-slate-800 font-bold">{item.quantity}</td>
                  <td className="text-right py-1 font-bold text-slate-800">{(item.sellPrice * item.quantity).toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <table className="w-full mt-1">
          <tbody>
            <tr><td className="text-slate-500">Subtotal:</td><td className="text-right">Rp {activeSubtotal.toLocaleString('id-ID')}</td></tr>
            {settings.enableServiceCharge && (
              <tr><td className="text-slate-500">Biaya Layanan ({settings.serviceChargeRate}%):</td><td className="text-right">Rp {activeServiceCharge.toLocaleString('id-ID')}</td></tr>
            )}
            <tr className="border-t border-slate-200 font-black">
              <td className="text-slate-900 pt-1">Total Akhir:</td><td className="text-right text-red-600 pt-1">Rp {activeTotal.toLocaleString('id-ID')}</td>
            </tr>
            <tr><td className="text-slate-500">Bayar:</td><td className="text-right">Rp {activeAmountPaid ? activeAmountPaid.toLocaleString('id-ID') : activeTotal.toLocaleString('id-ID')}</td></tr>
            <tr className="font-bold">
              <td className="text-slate-500">Kembalian:</td>
              <td className="text-right text-emerald-600">Rp {activePaymentMethod === 'Tunai' ? activeChange.toLocaleString('id-ID') : '0'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-dashed border-slate-300 pt-3 text-center mt-3">
        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tight block mb-0.5 font-sans">{settings.receiptHeader}</span>
        <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block mb-0.5">{settings.receiptFooter}</span>
        <span className="text-[9px] text-slate-400 block font-mono mt-1">*** LAYANAN WA: {settings.merchantPhone} ***</span>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center sm:p-4 select-none">
        <div className="glass-morphism-intense w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[95svh] sm:h-[580px] relative">

          {/* ── CONTENT AREA ── */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">

            {/* LEFT: Payment Form — always visible on desktop and mobile */}
            {!isCompleted ? (
              <div className="flex-1 flex flex-col justify-between p-5 sm:p-6 overflow-y-auto">
                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4 border-b border-black/5 dark:border-white/5 pb-3">
                    <h3 className="text-base font-bold text-foreground dark:text-white flex items-center gap-2">
                      <Banknote className="text-red-500 w-5 h-5 animate-pulse" /> Settle Kasir
                    </h3>
                    <span className="text-xs font-mono bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-md text-slate-600 dark:text-slate-400 border border-black/5 dark:border-white/5">
                      {invoiceNo}
                    </span>
                  </div>

                  {/* Customer Name */}
                  <div className="mb-4">
                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 font-semibold uppercase">Nama Pelanggan</label>
                    <input
                      type="text"
                      disabled={isSubmitting}
                      placeholder="e.g. Rania"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl py-3 px-4 text-sm text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Payment Method */}
                  <div className="mb-5">
                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-2 font-semibold uppercase">Metode Pembayaran Utama</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Tunai', 'QRIS', 'Debit'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handlePaymentMethodChange(m)}
                          className={`flex items-center justify-center gap-1.5 py-3 rounded-2xl font-extrabold text-xs border transition-all cursor-pointer ${
                            paymentMethod === m
                              ? 'bg-red-600 text-white border-red-500 shadow-lg'
                              : 'bg-black/5 border-black/10 dark:bg-white/5 dark:border-white/10 text-slate-700 dark:text-slate-300'
                          } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {m === 'Tunai' && <Banknote className={`w-4 h-4 hidden sm:block ${paymentMethod === m ? 'text-white' : 'text-yellow-600 dark:text-yellow-400'}`} />}
                          {m === 'QRIS' && <QrCode className={`w-4 h-4 hidden sm:block ${paymentMethod === m ? 'text-white' : 'text-red-500'}`} />}
                          {m === 'Debit' && <CreditCard className={`w-4 h-4 hidden sm:block ${paymentMethod === m ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />}
                          {m === 'Tunai' ? 'CASH' : m === 'QRIS' ? 'QRIS' : 'DEBIT'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tunai fields */}
                  {paymentMethod === 'Tunai' && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1.5 font-semibold uppercase">Pilih Denominasi Cepat</label>
                        <div className="flex flex-wrap gap-2">
                          {uniquePresets.map((amount) => (
                            <button
                              type="button"
                              key={amount}
                              disabled={isSubmitting}
                              onClick={() => handlePresetClick(amount)}
                              className={`px-3 py-2 text-xs font-mono font-bold rounded-xl border cursor-pointer transition-all ${
                                amountPaid === amount
                                  ? 'bg-yellow-500 text-slate-950 border-yellow-400 shadow-sm'
                                  : 'bg-black/5 border-black/10 dark:bg-white/5 dark:border-white/10 text-slate-700 dark:text-slate-300'
                              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {amount === total ? 'Uang Pas' : formatRupiah(amount)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-yellow-600 dark:text-yellow-500 block mb-1 uppercase">Nominal Uang Diterima (Rp)</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="0"
                            disabled={isSubmitting}
                            value={amountPaidInput ? parseInt(amountPaidInput).toLocaleString('id-ID') : ''}
                            onChange={(e) => handleManualInput(e.target.value)}
                            className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl py-3 px-4 text-xl font-mono text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          {amountPaid > 0 && (
                            <button type="button" disabled={isSubmitting} onClick={() => { setAmountPaid(0); setAmountPaidInput(''); }}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs bg-black/10 dark:bg-white/10 px-2.5 py-1 rounded-xl text-slate-500 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed">
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'QRIS' && (
                    <div className="bg-black/5 dark:bg-black/30 border border-black/10 dark:border-red-500/20 rounded-2xl p-4 flex gap-4 items-center mt-2 border-dashed">
                      <div className="w-20 h-20 bg-white rounded-xl p-1.5 flex items-center justify-center shrink-0 shadow-lg border relative">
                        <img
                          src={settings.qrisType === 'upload' && settings.qrisUploadUrl ? settings.qrisUploadUrl
                            : settings.qrisType === 'dynamic' ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=qris-${encodeURIComponent(settings.qrisName)}-${total}`
                            : `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(settings.qrisStaticCodeUrl || 'MIEJEBEWGDC')}`}
                          referrerPolicy="no-referrer"
                          alt="QRIS Code"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute -bottom-1 text-[7px] bg-red-600 text-white font-extrabold px-1 rounded shadow-sm">QRIS GPN</div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {settings.qrisType === 'dynamic'
                          ? `Scan QR — nominal bayar otomatis ${formatRupiah(total)}.`
                          : `Scan lalu input nominal ${formatRupiah(total)} secara manual.`}
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'Debit' && (
                    <div className="bg-black/5 dark:bg-black/30 border border-black/10 dark:border-red-500/20 rounded-2xl p-4 flex gap-4 items-center mt-2 border-dashed">
                      <CreditCard className="w-10 h-10 text-yellow-600 dark:text-yellow-500 animate-pulse shrink-0" />
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Gesek kartu Debit ke mesin EDC. Jika transaksi sukses, klik Proses Selesai.
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom bar: total + process button */}
                <div className="border-t border-black/10 dark:border-white/5 pt-4 mt-4 flex items-center justify-between gap-3 shrink-0">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block font-bold uppercase">Sisa Pembayaran</span>
                    <span className="text-xl font-extrabold text-yellow-600 dark:text-yellow-400 font-mono">{formatRupiah(total)}</span>
                  </div>
                  <button
                    type="button"
                    disabled={isInsufficient || isSubmitting}
                    onClick={processPayment}
                    className={`py-3.5 px-5 rounded-2xl font-black cursor-pointer transition-all flex items-center gap-2 text-sm ${
                      isInsufficient || isSubmitting
                        ? 'bg-zinc-200 dark:bg-zinc-800 text-slate-400 dark:text-slate-500 border border-black/5 dark:border-zinc-700 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/30 active:scale-95'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        MENYIMPAN...
                      </>
                    ) : (
                      "PROSES SELESAI"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* SUCCESS STATE */
              <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-red-500/10 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground dark:text-white mb-1">Nota Pembayaran Sukses</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Pesanan Mie Jebew GDC siap dimasak di dapur.</p>
                </div>
                {activePaymentMethod === 'Tunai' && (
                  <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-4 flex justify-between items-center max-w-sm mx-auto w-full mb-4">
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block font-semibold">UANG KEMBALIAN</span>
                      <span className="text-2xl font-mono font-extrabold text-yellow-600 dark:text-yellow-400">{formatRupiah(activeChange)}</span>
                    </div>
                    <div className="px-3 py-1.5 bg-yellow-500 text-slate-950 font-black rounded-xl text-xs uppercase">Lunas</div>
                  </div>
                )}
                <div className="border-t border-black/10 dark:border-white/5 pt-4 flex flex-col gap-3 max-w-sm mx-auto w-full">
                  <button type="button" onClick={() => { try { window.print(); } catch(e) {} }}
                    className="w-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-foreground dark:text-white rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer">
                    <Printer className="w-4 h-4 text-red-500" /> CETAK STRUK STRIP DAPUR
                  </button>
                  <button type="button" onClick={onClose}
                    className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-3.5 text-xs font-bold cursor-pointer">
                    MASUKKAN NOTA BARU
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Close Button */}
          {!isCompleted && !isSubmitting && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 text-slate-500 dark:text-slate-400 hover:text-foreground dark:hover:text-white bg-black/5 dark:bg-slate-900 hover:bg-black/10 dark:hover:bg-slate-800 p-2 rounded-full transition-all cursor-pointer z-30"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── PRINT ONLY AREA (HIDDEN FROM SCREEN, VISIBLE ONLY ON PRINTING) ── */}
      <div id="print-receipt" className="hidden print:block bg-white text-black font-sans">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              margin: 0;
              size: ${settings.printerPaperSize || '58mm'} auto;
            }
            #print-receipt {
              width: ${settings.printerPaperSize || '58mm'} !important;
              font-size: ${settings.printerPaperSize === '80mm' ? '12px' : '10px'} !important;
            }
          }
        ` }} />
        <ReceiptContent />
      </div>
    </>
  );
}
