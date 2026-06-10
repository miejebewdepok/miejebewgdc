// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { CartItem, Transaction, Settings } from '@/lib/types';
import { X, CreditCard, Banknote, QrCode, FileText, Printer, CheckCircle, Loader2, Copy, Download, MapPin, Phone, ShoppingBag } from 'lucide-react';
import { isMobileOrWebView } from '@/lib/utils';
import { toBlob, toPng } from 'html-to-image';
import { toast } from 'sonner';

export const angkaterbilang = (nilai: number): string => {
  const bilangan = [
    "", "satu", "dua", "tiga", "empat", "lima",
    "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"
  ];
  
  let temp = "";
  if (nilai < 12) {
    temp = " " + bilangan[nilai];
  } else if (nilai < 20) {
    temp = angkaterbilang(nilai - 10) + " belas";
  } else if (nilai < 100) {
    temp = angkaterbilang(Math.floor(nilai / 10)) + " puluh" + angkaterbilang(nilai % 10);
  } else if (nilai < 200) {
    temp = " seratus" + angkaterbilang(nilai - 100);
  } else if (nilai < 1000) {
    temp = angkaterbilang(Math.floor(nilai / 100)) + " ratus" + angkaterbilang(nilai % 100);
  } else if (nilai < 2000) {
    temp = " seribu" + angkaterbilang(nilai - 1000);
  } else if (nilai < 1000000) {
    temp = angkaterbilang(Math.floor(nilai / 1000)) + " ribu" + angkaterbilang(nilai % 1000);
  } else if (nilai < 1000000000) {
    temp = angkaterbilang(Math.floor(nilai / 1000000)) + " juta" + angkaterbilang(nilai % 1000000);
  } else if (nilai < 1000000000000) {
    temp = angkaterbilang(Math.floor(nilai / 1000000000)) + " milyar" + angkaterbilang(nilai % 1000000000);
  }
  return temp;
};

// Keep a global reference to prevent garbage collection of SpeechSynthesisUtterance in Android WebViews
let activeQrisUtterance: any = null;

export const speakQrisNotification = (amount: number) => {
  if (typeof window === "undefined") return;

  // Konversi nominal ke teks terbilang
  const nominalTeks = angkaterbilang(amount).trim();
  const textToSpeak = `Sebesar ${nominalTeks} rupiah, berhasil diterima.`;
  const ttsUrl = `/api/tts?text=${encodeURIComponent(textToSpeak)}`;

  try {
    // Attempt playing high-quality pre-rendered Google TTS audio first (100% reliable in APK/WebViews)
    const audio = new Audio(ttsUrl);
    audio.volume = 1.0;
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((audioErr) => {
        console.warn("Audio Qris TTS failed, falling back to SpeechSynthesis", audioErr);
        speakQrisNotificationNative(textToSpeak);
      });
    }
  } catch (err) {
    console.warn("Audio Qris creation failed, falling back to SpeechSynthesis", err);
    speakQrisNotificationNative(textToSpeak);
  }
};

const speakQrisNotificationNative = (textToSpeak: string) => {
  if (!("speechSynthesis" in window)) {
    console.warn("Speech Synthesis tidak didukung di browser ini.");
    return;
  }

  // Bersihkan antrean suara lama agar tidak tabrakan
  window.speechSynthesis.cancel();
  
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }

  // Gunakan variabel global agar tidak terkena garbage-collection di Android WebView / APK
  activeQrisUtterance = new SpeechSynthesisUtterance(textToSpeak);
  activeQrisUtterance.lang = "id-ID"; // Set bahasa ke Bahasa Indonesia
  activeQrisUtterance.rate = 0.95;    // Tempo mantap dan jelas untuk pria dewasa
  activeQrisUtterance.pitch = 0.85;   // Pitch lebih rendah/bass untuk efek suara pria dewasa

  // Cari suara Bahasa Indonesia terbaik yang terpasang di sistem operasi
  const voices = window.speechSynthesis.getVoices();
  
  // Cari suara pria Indonesia jika ada (misal mengandung kata male atau pria)
  let indonesianVoice = voices.find(
    (voice) => voice.lang.includes("id-ID") && (voice.name.toLowerCase().includes("male") || voice.name.toLowerCase().includes("pria"))
  );

  // Fallback ke suara Indonesia apa saja
  if (!indonesianVoice) {
    indonesianVoice = voices.find(
      (voice) => voice.lang.includes("id-ID") || voice.name.toLowerCase().includes("indonesian")
    );
  }

  if (indonesianVoice) {
    activeQrisUtterance.voice = indonesianVoice;
  }

  activeQrisUtterance.onend = () => {
    activeQrisUtterance = null;
  };
  activeQrisUtterance.onerror = () => {
    activeQrisUtterance = null;
  };

  // Mainkan suara!
  window.speechSynthesis.speak(activeQrisUtterance);
};

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  serviceCharge: number;
  settings: Settings;
  onSuccessCheckout: (transaction: Transaction) => Promise<Transaction | null>;
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
  const [whatsappRecipient, setWhatsappRecipient] = useState('');
  const [mobileReceiptImg, setMobileReceiptImg] = useState<string | null>(null);

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
  const activeSubtotal = isCompleted && createdTransaction 
    ? (createdTransaction.subtotal ?? createdTransaction.items.reduce((sum, item) => sum + (item.sellPrice || item.unitPrice || 0) * item.quantity, 0)) 
    : subtotal;
  const activeServiceCharge = isCompleted && createdTransaction 
    ? (createdTransaction.tax ?? Math.max(0, createdTransaction.total - activeSubtotal)) 
    : serviceCharge;
  const activeAmountPaid = isCompleted && createdTransaction ? (createdTransaction.amountPaid || 0) : amountPaid;
  const activeChange = isCompleted && createdTransaction ? (createdTransaction.change || 0) : (amountPaid >= total ? amountPaid - total : 0);
  const activeCartItems = isCompleted && createdTransaction ? createdTransaction.items : cartItems;
  const activeCustomerName = isCompleted && createdTransaction ? createdTransaction.customerName : customerName;
  const activePaymentMethod = isCompleted && createdTransaction ? createdTransaction.paymentMethod : paymentMethod;
  const activeInvoiceNo = isCompleted && createdTransaction ? (createdTransaction.invoiceNo || createdTransaction.id) : invoiceNo;

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
      const serverTx = await onSuccessCheckout(newTx);
      if (serverTx) {
        setCreatedTransaction(serverTx);
        setIsCompleted(true);
        if (paymentMethod === 'QRIS') {
          speakQrisNotification(total);
        }
      }
    } catch (err) {
      console.error("Checkout failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendWhatsappReceipt = async () => {
    if (!whatsappRecipient.trim()) {
      alert("Masukkan nomor WhatsApp penerima terlebih dahulu.");
      return;
    }
    
    // Clean and normalize WhatsApp number (convert 08xxx, 8xxx, +6208xxx, +628xxx to 628xxx)
    let cleanNum = whatsappRecipient.replace(/\D/g, "");
    if (cleanNum.startsWith("620")) {
      cleanNum = "62" + cleanNum.slice(3);
    } else if (cleanNum.startsWith("0")) {
      cleanNum = "62" + cleanNum.slice(1);
    } else if (cleanNum.startsWith("8")) {
      cleanNum = "62" + cleanNum;
    }

    if (cleanNum.length < 9) {
      alert("Nomor WhatsApp tidak valid.");
      return;
    }

    const node = document.getElementById('receipt-capture-area');
    if (!node) {
      alert("Struk belum siap dibagikan.");
      return;
    }

    const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
    const canUseShare = nav && nav.share && nav.canShare;

    if (canUseShare) {
      // Mobile native share flow (directly attach image to WhatsApp/other apps)
      try {
        const blob = await toBlob(node, {
          backgroundColor: '#09090b',
          pixelRatio: 3,
        });
        if (blob) {
          const file = new File([blob], `struk-${activeInvoiceNo}.png`, { type: 'image/png' });
          const shareData = {
            files: [file],
            title: 'Struk Belanja',
            text: `Struk resmi ${settings.merchantName || 'MIE JEBEW GDC'} - Invoice: ${activeInvoiceNo}`
          };
          if (nav.canShare(shareData)) {
            await nav.share(shareData);
            return;
          }
        }
      } catch (err) {
        console.warn("Gagal menggunakan native share, fallback ke clipboard:", err);
      }
    }

    // Desktop/Fallback flow (Clipboard Copy + Open Link)
    // 1. Open WhatsApp immediately (synchronous to prevent popup blocker)
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanNum}`;
    window.open(waUrl, "_blank");

    // 2. Automatically copy receipt image to clipboard in the background or download automatically
    try {
      const blob = await toBlob(node, {
        backgroundColor: '#09090b',
        pixelRatio: 3,
      });
      if (blob) {
        if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
          await navigator.clipboard.write([
            new ClipboardItem({
              [blob.type]: blob
            })
          ]);
          toast.success("Gambar struk disalin! Tekan Ctrl+V (paste) di chat WhatsApp.");
        } else if (navigator.clipboard?.writeText) {
          // Fallback to text copy if ClipboardItem is not supported (WebView / APK)
          const summaryText = `Struk Resmi ${settings.merchantName}\nInvoice: ${activeInvoiceNo}\nTotal: Rp ${activeTotal.toLocaleString('id-ID')}\nLink: https://miejebew.my.id/receipt/${activeInvoiceNo}`;
          await navigator.clipboard.writeText(summaryText);
          toast.success("Ringkasan teks struk disalin!");
        }
      }
    } catch (clipErr) {
      console.error("Gagal menulis ke clipboard:", clipErr);
      // Fallback: trigger download automatically in WebView/APK if copying fails
      try {
        const dataUrl = await toPng(node, {
          backgroundColor: '#09090b',
          pixelRatio: 3,
        });
        const link = document.createElement('a');
        link.download = `struk-${activeInvoiceNo}.png`;
        link.href = dataUrl;
        link.click();
        toast.info("Gambar struk diunduh otomatis ke Galeri Anda.");
      } catch (dlErr) {
        console.error("Gagal mengunduh gambar otomatis:", dlErr);
      }
    }
  };

  const handleCopyReceiptImage = async () => {
    const node = document.getElementById('receipt-capture-area');
    if (!node) {
      toast.error("Struk belum siap dipindai.");
      return;
    }
    try {
      const blob = await toBlob(node, {
        backgroundColor: '#09090b',
        pixelRatio: 3,
      });
      if (!blob) throw new Error("Gagal merender gambar.");
      
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
        toast.success("Gambar struk disalin! Tekan Ctrl+V (paste) di WhatsApp.");
      } else if (navigator.clipboard?.writeText) {
        const summaryText = `Struk Resmi ${settings.merchantName}\nInvoice: ${activeInvoiceNo}\nTotal: Rp ${activeTotal.toLocaleString('id-ID')}\nLink: https://miejebew.my.id/receipt/${activeInvoiceNo}`;
        await navigator.clipboard.writeText(summaryText);
        toast.success("Teks nota berhasil disalin ke clipboard!");
      } else {
        throw new Error("Clipboard tidak didukung.");
      }
    } catch (err) {
      console.error("Gagal menyalin gambar struk:", err);
      toast.error("Gagal menyalin. Silakan gunakan tombol Unduh Gambar.");
    }
  };

  const handleDownloadReceiptImage = async () => {
    const node = document.getElementById('receipt-capture-area');
    if (!node) {
      toast.error("Struk belum siap dipindai.");
      return;
    }
    try {
      const dataUrl = await toPng(node, {
        backgroundColor: '#09090b',
        pixelRatio: 3,
      });
      if (isMobileOrWebView()) {
        setMobileReceiptImg(dataUrl);
        toast.info("Gunakan sentuh & tahan pada gambar struk untuk mengunduh.");
      } else {
        const link = document.createElement('a');
        link.download = `struk-${activeInvoiceNo}.png`;
        link.href = dataUrl;
        link.click();
        toast.success("Gambar struk berhasil diunduh.");
      }
    } catch (err) {
      console.error("Gagal mengunduh gambar struk:", err);
      toast.error("Gagal mengunduh gambar.");
    }
  };

  // Premium dark receipt content for capture & sharing (replicates the public digital receipt page layout)
  const PremiumReceiptContent = () => (
    <div className="w-full bg-[#09090b] text-[#fef2f2] font-sans p-6 rounded-3xl border border-white/10 shadow-2xl relative select-none">
      {/* Lunas Stamp/Badge */}
      <div className="absolute top-5 right-5 px-3 py-1 bg-[#10b981]/10 border border-[#10b981]/30 text-[#34d399] font-black text-[10px] rounded-lg tracking-widest uppercase flex items-center gap-1 select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
        Lunas
      </div>

      {/* Brand Header */}
      <div className="text-center pb-5 border-b border-white/5 mb-5 flex flex-col items-center">
        <img src="/logo.png" className="w-12 h-12 rounded-full mb-3 object-cover border border-white/10" alt="Logo" />
        <h1 className="text-base font-black tracking-tight uppercase text-white leading-tight">
          {settings.merchantName}
        </h1>
        <p className="text-[10px] text-slate-400 italic mt-0.5 font-medium leading-none">
          Coba Sekali, Nagih Berkali-Kali
        </p>
        <div className="flex flex-col gap-1.5 mt-3 text-[10px] text-[#a1a1aa] font-medium font-sans">
          <div className="flex items-start justify-center gap-1.5 max-w-[280px] mx-auto text-center">
            <MapPin className="w-3 h-3 text-[#ef4444] shrink-0 mt-0.5" />
            <span className="leading-tight text-center">{settings.merchantAddress}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-1 text-center">
            <Phone className="w-3 h-3 text-[#10b981] shrink-0" />
            <span className="leading-none text-center">WA: {settings.merchantPhone}</span>
          </div>
        </div>
      </div>

      {/* Meta Info Table */}
      <div className="grid grid-cols-2 gap-3.5 text-[10.5px] border-b border-white/5 pb-5 mb-5">
        <div className="flex flex-col gap-1.5 text-left">
          <div>
            <span className="text-[#71717a] block uppercase font-bold text-[8.5px] tracking-wider mb-0.5">Pelanggan</span>
            <span className="text-white font-bold">
              {(activeCustomerName || 'Umum').replace(/\bmeja\b/gi, 'Order').replace(/\bself\s*order\b/gi, 'Order')}
            </span>
          </div>
          <div>
            <span className="text-[#71717a] block uppercase font-bold text-[8.5px] tracking-wider mb-0.5">Metode Bayar</span>
            <span className="text-[#f87171] font-black uppercase">
              {activePaymentMethod}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-right">
          <div>
            <span className="text-[#71717a] block uppercase font-bold text-[8.5px] tracking-wider mb-0.5">Tanggal</span>
            <span className="text-white font-semibold font-mono">
              {new Date().toLocaleDateString("id-ID")}
            </span>
          </div>
          <div>
            <span className="text-[#71717a] block uppercase font-bold text-[8.5px] tracking-wider mb-0.5">Waktu</span>
            <span className="text-white font-semibold font-mono">
              {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="border-b border-white/5 pb-4 mb-4">
        <div className="flex items-center gap-1.5 mb-3 text-[#a1a1aa] text-left">
          <ShoppingBag className="w-3.5 h-3.5 text-[#ef4444]" />
          <span className="text-[10px] uppercase font-black tracking-wider">Item Belanjaan</span>
        </div>
        
        <div className="space-y-3 text-left">
          {activeCartItems.map((item, idx) => {
            const productName = item.productName || item.product?.name || 'Menu';
            const quantity = item.quantity;
            const sellPrice = item.sellPrice || item.unitPrice || 0;
            const notes = item.notes || '';
            const lines = productName.split('\n');
            return (
              <div key={idx} className="flex justify-between items-start text-[11px]">
                <div className="flex-1 pr-3">
                  <span className="text-white font-bold leading-tight block">
                    {lines[0]}
                  </span>
                  {lines.slice(1).map((line, i) => {
                    const isNote = line.toLowerCase().startsWith("catatan:");
                    return (
                      <span key={i} className={`text-[9px] font-extrabold uppercase block tracking-tight mt-0.5 ${isNote ? "text-[#f97316] mt-1.5 border-t border-white/5 pt-1" : "text-[#f87171]"}`}>
                        » {line}
                      </span>
                    );
                  })}
                  {notes && notes.split('\n').map((n: string) => n.trim()).filter(Boolean).map((note: string, i: number) => {
                    const cleanProductName = productName.toLowerCase();
                    const cleanNote = note.toLowerCase();
                    const isAlreadyInName = cleanProductName.includes(cleanNote) || 
                                            (cleanNote.startsWith("catatan:") && cleanProductName.includes(cleanNote.replace("catatan:", "").trim()));
                    if (isAlreadyInName) return null;
                    const isNote = note.toLowerCase().startsWith("catatan:");
                    return (
                      <span key={i} className={`text-[9px] font-extrabold uppercase block tracking-tight mt-0.5 ${isNote ? "text-[#f97316] mt-1.5 border-t border-white/5 pt-1" : "text-[#f87171]"}`}>
                        » {note}
                      </span>
                    );
                  })}
                </div>
                <div className="w-10 text-center text-[#d4d4d8] font-bold font-mono">
                  {quantity}x
                </div>
                <div className="w-20 text-right text-white font-bold font-mono">
                  {((item.sellPrice || item.unitPrice || 0) * item.quantity).toLocaleString('id-ID')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pricing Summary */}
      <div className="space-y-2 text-[11px] border-b border-white/5 pb-4 mb-4 font-sans text-left">
        <div className="flex justify-between text-[#a1a1aa]">
          <span>Subtotal Menu</span>
          <span className="font-mono">Rp {activeSubtotal.toLocaleString('id-ID')}</span>
        </div>
        {settings.enableServiceCharge && (
          <div className="flex justify-between text-[#a1a1aa]">
            <span>Biaya Layanan ({settings.serviceChargeRate}%)</span>
            <span className="font-mono">Rp {activeServiceCharge.toLocaleString('id-ID')}</span>
          </div>
        )}
        <div className="flex justify-between font-black text-[13px] pt-1.5 border-t border-white/5">
          <span className="text-white">Total Akhir</span>
          <span className="text-[#eab308] font-mono">Rp {activeTotal.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between text-[#a1a1aa]">
          <span>Jumlah Uang Bayar</span>
          <span className="font-mono">Rp {(activeAmountPaid || activeTotal).toLocaleString('id-ID')}</span>
        </div>
        {activePaymentMethod === "Tunai" && (
          <div className="flex justify-between font-bold text-[#34d399]">
            <span>Uang Kembalian</span>
            <span className="font-mono">Rp {activeChange.toLocaleString('id-ID')}</span>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="text-center pt-2">
        <span className="text-[9px] text-[#71717a] font-black uppercase tracking-widest block mb-0.5 font-sans">
          {settings.receiptHeader || "TERIMA KASIH"}
        </span>
        <span className="text-[9px] text-[#a1a1aa] font-black uppercase tracking-widest block">
          {settings.receiptFooter || "ATAS KUNJUNGAN ANDA"}
        </span>
      </div>
    </div>
  );

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
                  <td className="text-right py-1 font-bold text-slate-800">{((item.sellPrice || item.unitPrice || 0) * item.quantity).toLocaleString('id-ID')}</td>
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
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-black/10 dark:border-white/10 overflow-hidden shadow-md">
                    <img src="/logo.png" className="w-full h-full object-cover" alt="Logo" />
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

                {/* WHATSAPP RECEIPT SHARE PANEL */}
                <div className="max-w-sm mx-auto w-full mb-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-4 flex flex-col gap-2.5">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">KIRIM STRUK DIGITAL (WHATSAPP)</span>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="cth: 0812xxxx / +62812xxxx"
                      value={whatsappRecipient}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const digits = raw.replace(/\D/g, "");

                        if (!digits) {
                          setWhatsappRecipient("");
                          return;
                        }

                        if (digits.startsWith("620")) {
                          setWhatsappRecipient("+62" + digits.slice(3));
                          return;
                        }

                        if (digits.startsWith("62")) {
                          setWhatsappRecipient("+62" + digits.slice(2));
                          return;
                        }

                        if (digits.startsWith("0")) {
                          setWhatsappRecipient("+62" + digits.slice(1));
                          return;
                        }

                        if (digits.startsWith("8")) {
                          setWhatsappRecipient("+62" + digits);
                          return;
                        }

                        setWhatsappRecipient(digits);
                      }}
                      onBlur={() => {
                        if (
                          whatsappRecipient &&
                          !/^\+62\d{9,14}$/.test(whatsappRecipient) &&
                          /^\d+$/.test(whatsappRecipient)
                        ) {
                          const digits = whatsappRecipient.replace(/\D/g, "");
                          if (digits.startsWith("620")) setWhatsappRecipient("+62" + digits.slice(3));
                          else if (digits.startsWith("62")) setWhatsappRecipient("+62" + digits.slice(2));
                          else if (digits.startsWith("0")) setWhatsappRecipient("+62" + digits.slice(1));
                          else if (digits.startsWith("8")) setWhatsappRecipient("+62" + digits);
                        }
                      }}
                      className="flex-1 bg-black/10 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-foreground dark:text-white font-semibold font-mono focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                    <button
                      type="button"
                      onClick={handleSendWhatsappReceipt}
                      disabled={!whatsappRecipient.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-4 py-2 flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Kirim
                    </button>
                  </div>
                </div>

                <div className="border-t border-black/10 dark:border-white/5 pt-4 flex flex-col gap-3 max-w-sm mx-auto w-full">
                    <button 
                      type="button" 
                      onClick={handleDownloadReceiptImage}
                      className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <Download className="w-3.5 h-3.5" /> UNDUH GAMBAR
                    </button>
                    <button type="button" onClick={() => {
                      if (isMobileOrWebView()) {
                        alert("Pencetakan langsung tidak didukung di HP/Tablet/APK. Silakan buka aplikasi kasir melalui Google Chrome di Laptop/PC untuk mencetak struk.");
                      } else {
                        try { window.print(); } catch(e) {}
                      }
                    }}
                      className="w-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-foreground dark:text-white rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer">
                      <Printer className="w-4 h-4 text-red-500" /> CETAK STRUK
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
              size: ${settings.printerPaperSize === '80mm' ? '80mm' : '58mm'} auto;
            }
            #print-receipt {
              width: ${settings.printerPaperSize === '80mm' ? '76mm' : '54mm'} !important;
              font-size: ${settings.printerPaperSize === '80mm' ? '12px' : '9.5px'} !important;
            }
            #print-receipt table, #print-receipt td, #print-receipt th, #print-receipt div, #print-receipt p, #print-receipt span {
              font-size: ${settings.printerPaperSize === '80mm' ? '12px' : '9.5px'} !important;
            }
            #print-receipt .text-\\[8\\.5px\\], #print-receipt .text-\\[8px\\], #print-receipt .text-\\[9px\\] {
              font-size: ${settings.printerPaperSize === '80mm' ? '10px' : '8px'} !important;
            }
          }
        ` }} />
        <ReceiptContent />
      </div>

      {/* ── CAPTURE ONLY AREA (OFFSCREEN WRAPPER) ── */}
      <div 
        style={{ 
          position: 'fixed', 
          left: '-9999px', 
          top: '-9999px', 
          width: '380px', 
          overflow: 'hidden',
          zIndex: -9999,
          pointerEvents: 'none'
        }}
      >
        <div 
          id="receipt-capture-area" 
          style={{ 
            width: '380px', 
            backgroundColor: '#09090b', 
          }}
        >
          <PremiumReceiptContent />
        </div>
      </div>
      {mobileReceiptImg && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[999] flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900/90 border border-white/10 p-5 rounded-3xl w-full max-w-sm flex flex-col items-center gap-4 relative animate-in zoom-in-95 duration-250">
            <button
              onClick={() => setMobileReceiptImg(null)}
              className="absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-center pt-2">
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Unduh Gambar Struk</h4>
              <p className="text-[10.5px] text-slate-400 mt-1 max-w-[280px]">
                Sentuh & tahan (tekan lama) gambar di bawah ini, lalu pilih <strong className="text-yellow-500">"Simpan Gambar"</strong> atau <strong className="text-yellow-500">"Download Image"</strong>.
              </p>
            </div>
            <div className="w-full max-h-[60vh] overflow-y-auto rounded-2xl border border-white/5 bg-black p-2 no-scrollbar">
              <img src={mobileReceiptImg} className="w-full h-auto rounded-lg select-text" alt="Struk Pembayaran" />
            </div>
            <button
              onClick={() => setMobileReceiptImg(null)}
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 text-xs font-bold cursor-pointer transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
