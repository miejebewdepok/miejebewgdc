// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Settings } from '@/lib/types';
import { 
  QrCode, 
  Printer, 
  Settings as SettingsIcon, 
  Wifi, 
  Smartphone, 
  Search, 
  Sliders, 
  Bluetooth, 
  RefreshCw, 
  FileText, 
  Check, 
  AlertCircle, 
  Signal, 
  Battery, 
  Sparkles 
} from 'lucide-react';

const compressImage = (base64Str: string, maxWidth = 400, maxHeight = 400, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

interface SettingsPanelProps {
  settings: Settings;
  onUpdateSettings: (settings: Settings) => void;
}

export default function SettingsPanel({ settings, onUpdateSettings }: SettingsPanelProps) {
  // Local state for forms
  const [isSaving, setIsSaving] = useState(false);
  const [merchantName, setMerchantName] = useState(settings.merchantName);
  const [merchantAddress, setMerchantAddress] = useState(settings.merchantAddress);
  const [merchantPhone, setMerchantPhone] = useState(settings.merchantPhone);
  const [taxRate, setTaxRate] = useState(settings.taxRate);
  const [enableServiceCharge, setEnableServiceCharge] = useState(settings.enableServiceCharge);
  const [serviceChargeRate, setServiceChargeRate] = useState(settings.serviceChargeRate);
  
  const [qrisName, setQrisName] = useState(settings.qrisName);
  const [qrisType, setQrisType] = useState(settings.qrisType);
  const [qrisStaticCodeUrl, setQrisStaticCodeUrl] = useState(settings.qrisStaticCodeUrl);
  const [qrisUploadUrl, setQrisUploadUrl] = useState(settings.qrisUploadUrl || '');
  
  const [userProfileName, setUserProfileName] = useState(settings.userProfileName || 'Andi Budiman');
  const [userProfileImage, setUserProfileImage] = useState(settings.userProfileImage || '');

  const [printerPaperSize, setPrinterPaperSize] = useState(settings.printerPaperSize);
  const [receiptHeader, setReceiptHeader] = useState(settings.receiptHeader);
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter);

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;
        try {
          const compressed = await compressImage(rawBase64, 256, 256, 0.7);
          setUserProfileImage(compressed);
        } catch (err) {
          setUserProfileImage(rawBase64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQrisImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;
        try {
          const compressed = await compressImage(rawBase64, 400, 400, 0.7);
          setQrisUploadUrl(compressed);
          setQrisType('upload'); // Auto switch to uploaded qr mode on upload!
        } catch (err) {
          setQrisUploadUrl(rawBase64);
          setQrisType('upload');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Bluetooth scanning simulator
  const [isScanning, setIsScanning] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<{ name: string; address: string; rssi: number }[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>(settings.printerConnected ? 'connected' : 'disconnected');
  const [currentPrinterName, setCurrentPrinterName] = useState<string>(settings.printerName);

  // Test printer slip emulator
  const [isPrinting, setIsPrinting] = useState(false);
  const [showTestSlip, setShowTestSlip] = useState(false);
  const [slipContent, setSlipContent] = useState<string[]>([]);

  // Sound generator simulation (using Web Audio API to play print sounds!)
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
    } catch (e) {
      console.log('Audio Context error', e);
    }
  };

  const playPrintSound = () => {
    // Mimic the "ZZZT ZZZT" of a thermal printer
    let delay = 0;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        playBeep(150, 0.15);
      }, delay);
      delay += 250;
      setTimeout(() => {
        playBeep(240, 0.08);
      }, delay);
      delay += 150;
    }
  };

  const handleSaveSettings = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onUpdateSettings({
        ...settings,
        merchantName,
        merchantAddress,
        merchantPhone,
        taxRate,
        enableServiceCharge,
        serviceChargeRate,
        qrisName,
        qrisStaticCodeUrl,
        qrisType,
        printerConnected: connectionStatus === 'connected',
        printerName: currentPrinterName,
        printerPaperSize,
        receiptHeader,
        receiptFooter,
        userProfileName,
        userProfileImage,
        qrisUploadUrl
      });

      // Notify with sound
      playBeep(880, 0.1);
      setTimeout(() => playBeep(1200, 0.15), 120);
      alert('Pengaturan berhasil disimpan di sistem kasir.');
    } catch (error: any) {
      console.error(error);
      alert(`Gagal menyimpan pengaturan: ${error?.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleScanBluetooth = () => {
    setIsScanning(true);
    setScannedDevices([]);
    playBeep(600, 0.1);

    // Simulated scan results
    setTimeout(() => {
      setScannedDevices([
        { name: 'PT-210 Portable Printer', address: '00:11:22:33:AA:BB', rssi: -54 },
        { name: 'Zjiang ZJ-5805 Thermal', address: '33:44:55:66:CC:DD', rssi: -66 },
        { name: 'Rongta RPP02N-80', address: 'AA:BB:CC:DD:EE:FF', rssi: -72 },
        { name: 'Epson TM-P20 BT', address: '22:88:AC:33:E2:01', rssi: -85 }
      ]);
      setIsScanning(false);
      playBeep(900, 0.1);
    }, 2000);
  };

  const handleConnectPrinter = (name: string) => {
    setConnectionStatus('connecting');
    playBeep(700, 0.15);

    setTimeout(() => {
      setConnectionStatus('connected');
      setCurrentPrinterName(name);
      playBeep(1000, 0.1);
      setTimeout(() => playBeep(1000, 0.1), 120);

      // Save connection to master config directly
      onUpdateSettings({
        ...settings,
        printerConnected: true,
        printerName: name,
        printerPaperSize,
        receiptHeader,
        receiptFooter
      });
    }, 1500);
  };

  const handleDisconnectPrinter = () => {
    setConnectionStatus('disconnected');
    setCurrentPrinterName('');
    playBeep(400, 0.25);

    onUpdateSettings({
      ...settings,
      printerConnected: false,
      printerName: ''
    });
  };

  const handlePrintTestPage = () => {
    if (connectionStatus !== 'connected') {
      alert('Sambungan printer terputus! Harap hubungkan printer bluetooth terlebih dahulu.');
      return;
    }

    setIsPrinting(true);
    setShowTestSlip(true);
    playPrintSound();

    // Prepare simulated digital paper contents
    const lines = [
      `=== ${receiptHeader.toUpperCase()} ===`,
      `${merchantAddress}`,
      `Telp: ${merchantPhone}`,
      `--------------------------------`,
      `TANGGAL : ${new Date().toLocaleDateString('id-ID')}`,
      `WAKTU   : ${new Date().toLocaleTimeString('id-ID')}`,
      `KASIR   : ANDI BUDIMAN (SYS)`,
      `PRINTER : ${currentPrinterName}`,
      `LEBAR   : ${printerPaperSize} PAPER`,
      `--------------------------------`,
      `MENU TEST JALUR :`,
      `1x Mie Setan Lv 5   Rp 16.000`,
      `1x Es Genderuwo     Rp 10.000`,
      `--------------------------------`,
      `Subtotal            Rp 26.000`,
      `Pajak (PPN ${taxRate}%)     Rp ${Math.round(26000 * (taxRate / 100)).toLocaleString('id-ID')}`,
      `--------------------------------`,
      `TOTAL AKHIR         Rp ${(26000 + Math.round(26000 * (taxRate / 100))).toLocaleString('id-ID')}`,
      `METODE              QRIS [LUNAS]`,
      `--------------------------------`,
      `Merek QRIS: ${qrisName}`,
      `--------------------------------`,
      `${receiptFooter}`,
      `=== KASET TEST SUKSES ===`
    ];

    setSlipContent([]);
    
    // Animate lines pushing onto page over time simulates printer rolling
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < lines.length) {
        setSlipContent(prev => [...prev, lines[currentIdx]]);
        currentIdx++;
      } else {
        clearInterval(interval);
        setIsPrinting(false);
        playBeep(1200, 0.15);
      }
    }, 120);
  };

  // Live dynamic demo QRIS code generator
  const [testAmount, setTestAmount] = useState('14500');

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1 select-none">
      
      {/* Settings Panel Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-foreground dark:text-white flex items-center gap-2">
            <SettingsIcon className="text-red-500 w-5 h-5" /> Pengaturan Sistem POS
          </h2>
          <p className="text-slate-550 dark:text-slate-400 text-xs">Atur parameter perpajakan, profil restoran, gerbang QRIS, dan koneksi Printer Bluetooth</p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold text-xs px-5 py-3 rounded-2xl flex items-center gap-1.5 cursor-pointer transition-transform duration-200 active:scale-95 shadow-lg shadow-red-600/25 animate-none"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> MENYIMPAN...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" /> SIMPAN SEMUA PERUBAHAN
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Column Left: Store parameters & QRIS configuring (Col 7) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* PROFILE RESTORAN & PERPAJAKAN CARD */}
          <div className="glass-morphism rounded-3xl p-6 relative overflow-hidden">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                <Sliders className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground dark:text-white uppercase tracking-wider">Identitas & Keuangan Restoran</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-slate-550 dark:text-slate-400 block mb-1 font-semibold">NAMA RESTO / OUTLET</label>
                <input
                  type="text"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl py-3 px-4 text-xs text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  placeholder="Mie Jebew GDC"
                />
              </div>

              <div>
                <label className="text-xs text-slate-550 dark:text-slate-400 block mb-1 font-semibold">NOMOR TELEPON / WA OUTLET</label>
                <input
                  type="text"
                  value={merchantPhone}
                  onChange={(e) => setMerchantPhone(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl py-3 px-4 text-xs text-foreground dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  placeholder="0822-4411-9900"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs text-slate-550 dark:text-slate-400 block mb-1 font-semibold">ALAMAT OUTLET (TERCETAK DI STRUK)</label>
              <textarea
                value={merchantAddress}
                onChange={(e) => setMerchantAddress(e.target.value)}
                rows={2}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl py-3 px-4 text-xs text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-none animate-none"
                placeholder="Jl. Kemang Raya Indah No. 12, DKI Jakarta"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-black/5 dark:border-white/5 pt-4">
              <div>
                <label className="text-xs text-yellow-600 dark:text-yellow-500 block mb-1 font-semibold">PAJAK KONSUMSI PPN (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseInt(e.target.value) || 0)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl py-3 px-4 text-xs text-foreground dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-red-500/40"
                />
              </div>

              <div className="flex items-end pb-3 pl-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableServiceCharge}
                    onChange={(e) => setEnableServiceCharge(e.target.checked)}
                    className="w-4 h-4 rounded-md accent-red-650 focus:ring-0"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-bold select-none">Biaya Layanan (Service)</span>
                </label>
              </div>

              {enableServiceCharge && (
                <div>
                  <label className="text-xs text-yellow-650 dark:text-yellow-500 block mb-1 font-semibold">PERSENTASE LAYANAN (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={serviceChargeRate}
                    onChange={(e) => setServiceChargeRate(parseInt(e.target.value) || 0)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl py-3 px-4 text-xs text-foreground dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  />
                </div>
              )}
            </div>
          </div>

          {/* INTEGRASI PEMBAYARAN QRIS */}
          <div className="glass-morphism rounded-3xl p-6 relative overflow-hidden">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl">
                <QrCode className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground dark:text-white uppercase tracking-wider">Metode Gerbang QRIS</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Form Input fields */}
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-slate-550 dark:text-slate-400 block mb-1.5 font-semibold">NAMA MERCHANT QRIS (TEREGISTRASI)</label>
                  <input
                    type="text"
                    value={qrisName}
                    onChange={(e) => setQrisName(e.target.value)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl py-3 px-4 text-xs text-foreground dark:text-white tracking-wide uppercase font-bold focus:outline-none focus:ring-2 focus:ring-red-500/40"
                    placeholder="MIE JEBEW GDC"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Nama resmi yang tercatat di ASPI / Bank indonesia untuk struk QRIS.</p>
                </div>

                <div>
                  <label className="text-[11px] text-slate-700 dark:text-slate-300 block mb-2 font-bold">MODE INTEGRASI QRIS</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setQrisType('dynamic')}
                      className={`py-2 px-1 border rounded-xl text-[10px] font-bold font-sans transition-all cursor-pointer ${
                        qrisType === 'dynamic'
                          ? 'bg-red-500/10 border-red-500 text-red-650 dark:bg-red-600/25 dark:border-red-500 dark:text-white shadow-md'
                          : 'bg-black/5 border-black/10 dark:bg-white/5 dark:border-white/10 text-slate-550 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      Dinamis
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrisType('static')}
                      className={`py-2 px-1 border rounded-xl text-[10px] font-bold font-sans transition-all cursor-pointer ${
                        qrisType === 'static'
                          ? 'bg-red-500/10 border-red-500 text-red-650 dark:bg-red-600/25 dark:border-red-500 dark:text-white shadow-md'
                          : 'bg-black/5 border-black/10 dark:bg-white/5 dark:border-white/10 text-slate-550 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      Statis Teks
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrisType('upload')}
                      className={`py-2 px-1 border rounded-xl text-[10px] font-bold font-sans transition-all cursor-pointer ${
                        qrisType === 'upload'
                          ? 'bg-red-500/10 border-red-500 text-red-650 dark:bg-red-600/25 dark:border-red-500 dark:text-white shadow-md'
                          : 'bg-black/5 border-black/10 dark:bg-white/5 dark:border-white/10 text-slate-550 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      Upload HP
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-555 mt-2 leading-relaxed">
                    {qrisType === 'dynamic' && '✓ Otomatis menyematkan nominal pesanan pelanggan ke barcode (Rupiah pas).'}
                    {qrisType === 'static' && '✓ Menggunakan barisan payload statis tetap (contoh: 000201...).'}
                    {qrisType === 'upload' && '✓ Unggah gambar QRIS Bank/E-Wallet resmi milik restoran Anda secara instan.'}
                  </p>
                </div>

                {qrisType === 'static' && (
                  <div>
                    <label className="text-xs text-slate-550 dark:text-slate-400 block mb-1 font-semibold">MOCK STATIC QRIS CODE SEGMENT</label>
                    <input
                      type="text"
                      value={qrisStaticCodeUrl}
                      onChange={(e) => setQrisStaticCodeUrl(e.target.value)}
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl py-2 px-3 text-[11px] text-zinc-650 dark:text-zinc-400 font-mono focus:outline-none"
                    />
                    <p className="text-[9px] text-slate-500 mt-1">Masukkan string QRIS data payload toko Anda (contoh: 00020101021126570022ID...).</p>
                  </div>
                )}

                {qrisType === 'upload' && (
                  <div>
                    <label className="text-xs text-yellow-600 dark:text-yellow-500 block mb-1.5 font-bold uppercase tracking-wider">UNGGAH FILE FOTO/SCREENSHOT QRIS</label>
                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        id="qris_upload_input"
                        accept="image/*"
                        onChange={handleQrisImageChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="qris_upload_input"
                        className="w-full py-3.5 px-4 border border-dashed border-black/20 dark:border-white/20 rounded-2xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-slate-650 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-extrabold text-center cursor-pointer text-xs transition-colors flex items-center justify-center gap-2 shadow-inner"
                      >
                        <QrCode className="w-4 h-4 text-red-500 animate-pulse" /> {qrisUploadUrl ? '✓ Ganti File QRIS' : 'Pilih Gambar QRIS'}
                      </label>
                      {qrisUploadUrl && (
                        <button
                          type="button"
                          onClick={() => setQrisUploadUrl('')}
                          className="text-[10px] text-red-650 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-bold block text-center underline"
                        >
                          Hapus Gambar Unggahan
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Visual Simulated Mockup Preview of QR Smart Panel */}
              <div className="bg-black/5 dark:bg-black/40 border border-black/5 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between items-center text-center relative h-64 select-none">
                <span className="text-[10px] bg-yellow-500 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
                  PRINTOUT PREVIEW SCREEN
                </span>

                <div className="w-32 h-32 bg-white rounded-xl p-1.5 flex items-center justify-center relative shadow-lg overflow-hidden">
                  <img 
                    src={qrisType === 'dynamic' 
                      ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=qris-miejebew-${testAmount}`
                      : qrisType === 'static'
                      ? 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?auto=format&fit=crop&q=80&w=300'
                      : qrisUploadUrl || 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?auto=format&fit=crop&q=80&w=300'
                    }
                    alt="Simulated QRIS QR" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-sm p-1 border border-white text-[7px] text-white font-extrabold rotate-3 font-sans shadow-md">
                    QRIS GPN
                  </div>
                </div>

                <div className="mt-2 w-full">
                  <span className="text-xs font-black text-foreground dark:text-white block uppercase tracking-wide">
                    {qrisName || 'MIE JEBEW GDC OUTLET'}
                  </span>
                  <div className="flex gap-2 justify-center items-center mt-1.5">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Test input nominal:</span>
                    <input
                      type="number"
                      value={testAmount}
                      onChange={(e) => setTestAmount(e.target.value || '10000')}
                      className="w-16 bg-black/5 dark:bg-white/10 text-foreground dark:text-white text-[10px] font-mono text-center border border-black/10 dark:border-white/10 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Column Right: Printer bluetooth pairing interface (Col 5) */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* USER PROFILE CONFIGURATION CARD */}
          <div className="glass-morphism rounded-3xl p-6 relative overflow-hidden flex flex-col gap-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                <Sliders className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground dark:text-white uppercase tracking-wider">Profil Pengguna & Kasir</h3>
            </div>

            {/* Google Verified Banner */}
            <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-650 dark:text-emerald-400 p-3.5 rounded-2xl text-[11px] font-sans">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 animate-pulse mt-0.5" />
              <div>
                <span className="font-extrabold block">Akun Gmail Terverifikasi</span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Sistem login Gmail aktif. Anda bebas mengubah nama panggilan & foto profil kasir lokal di sini tanpa mempengaruhi akun Google utama.</p>
              </div>
            </div>

            {/* Avatar upload center */}
            <div className="flex gap-4 items-center bg-slate-100 dark:bg-slate-900/40 p-4 rounded-2xl border border-black/5 dark:border-white/5">
              <div className="w-16 h-16 rounded-full border-2 border-red-500/30 relative overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-900 shadow-lg flex items-center justify-center">
                {userProfileImage ? (
                  <img src={userProfileImage} alt="Profil" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-red-600 via-yellow-500 to-orange-500 flex items-center justify-center font-extrabold text-sm text-slate-950 font-mono">
                    {userProfileName && userProfileName.trim()
                      ? userProfileName.trim().split(/\s+/).map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                      : 'AB'}
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <input
                  type="file"
                  id="profile_upload_input"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="profile_upload_input"
                  className="py-2.5 px-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-slate-800 dark:text-white rounded-xl text-xs font-bold block text-center cursor-pointer transition-all hover:bg-black/10 dark:hover:bg-white/10 shadow-sm"
                >
                  Ganti Foto Profil
                </label>
                {userProfileImage && (
                  <button
                    type="button"
                    onClick={() => setUserProfileImage('')}
                    className="text-[10px] text-red-650 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-bold block text-center mt-1 underline"
                  >
                    Hapus Foto Profil
                  </button>
                )}
              </div>
            </div>

            {/* Display name field */}
            <div>
              <label className="text-xs text-slate-550 dark:text-slate-400 block mb-1.5 font-bold uppercase tracking-wider">Nama Tampilan Kasir</label>
              <input
                type="text"
                value={userProfileName}
                onChange={(e) => setUserProfileName(e.target.value)}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl py-3 px-4 text-xs text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 font-semibold"
                placeholder="Andi Budiman"
              />
            </div>
          </div>
          
          {/* PRINTER BLUETOOTH THERMAL CONNECT MODULE */}
          <div className="glass-morphism rounded-3xl p-6 relative overflow-hidden flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Printer className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground dark:text-white uppercase tracking-wider">Hardware Printer</h3>
              </div>
              
              {/* LED Connection status dot */}
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                  connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
                }`}></span>
                <span className={`text-[10px] font-bold uppercase font-mono ${
                  connectionStatus === 'connected' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                }`}>
                  {connectionStatus === 'connected' ? 'Terhubung' : connectionStatus === 'connecting' ? 'Penyandingan...' : 'Terputus'}
                </span>
              </div>
            </div>

            {/* Connecting details if online */}
            {connectionStatus === 'connected' && (
              <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs text-emerald-650 dark:text-emerald-300 font-extrabold flex items-center gap-1.5 font-sans">
                      <Bluetooth className="w-4 h-4" /> Connected over Bluetooth RFCOMM
                    </span>
                    <span className="text-sm font-black text-foreground dark:text-white block mt-1 font-mono">
                      {currentPrinterName}
                    </span>
                  </div>
                  <button
                    onClick={handleDisconnectPrinter}
                    className="text-[9px] bg-red-600/15 border border-red-500/25 text-red-650 hover:bg-red-600/20 dark:text-red-300 dark:hover:bg-red-600/30 font-black px-2.5 py-1 rounded-xl uppercase shrink-0 cursor-pointer"
                  >
                    PUTUSKAN
                  </button>
                </div>

                <div className="grid grid-cols-2 text-[10px] text-slate-550 dark:text-slate-400 font-mono border-t border-emerald-500/10 pt-2.5 mt-1 gap-y-1">
                  <span className="flex items-center gap-1">
                    <Signal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> RSSI: Strong (-54dBm)
                  </span>
                  <span className="flex items-center gap-1">
                    <Battery className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Baterai: 88%
                  </span>
                </div>
              </div>
            )}

            {/* If disconnected, show pairing action buttons */}
            {connectionStatus === 'disconnected' && (
              <div className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={handleScanBluetooth}
                  disabled={isScanning}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/25 active:scale-[0.98]"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> MENCARI SIGNAL PERANGKAT...
                    </>
                  ) : (
                    <>
                      <Bluetooth className="w-4 h-4 animate-pulse" /> SCAN PRINTER BLUETOOTH
                    </>
                  )}
                </button>

                {/* Found devices listed */}
                {scannedDevices.length > 0 && (
                  <div className="bg-black/5 dark:bg-black/35 border border-black/5 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-2.5 max-h-52 overflow-y-auto animate-fade">
                    <span className="text-[10px] text-slate-550 dark:text-slate-400 font-extrabold uppercase block pb-1 border-b border-black/5 dark:border-white/5">
                      Perangkat Bluetooth Terdeteksi
                    </span>
                    {scannedDevices.map((dev) => (
                      <div key={dev.address} className="flex justify-between items-center rounded-xl p-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-black/5 dark:hover:border-white/5">
                        <div>
                          <span className="text-xs font-bold text-foreground dark:text-white block font-mono">{dev.name}</span>
                          <span className="text-[9px] text-slate-500 dark:text-slate-550 block font-mono">{dev.address}</span>
                        </div>
                        <button
                          onClick={() => handleCreatePairWithCheck(dev.name)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg cursor-pointer transition-transform"
                        >
                          Sandingkan
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Custom Web Bluetooth Connection Trigger */}
            <div className="text-[10px] text-slate-550 dark:text-slate-400 flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-2xl p-3 border border-black/5 dark:border-white/5 mb-1 text-center justify-center">
              <AlertCircle className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-500 shrink-0" />
              <span>Sistem kami mendukung printer termal portabel standar Bluetooth ESC/POS (58mm/80mm).</span>
            </div>

            {/* Paper custom options */}
            <div className="grid grid-cols-2 gap-4 border-t border-black/5 dark:border-white/5 pt-4">
              <div>
                <label className="text-xs text-slate-550 dark:text-slate-400 block mb-1.5 font-semibold">UKURAN KERTAS STRUK</label>
                <div className="flex bg-slate-100 dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-2xl p-1 w-full text-center">
                  <button
                    type="button"
                    onClick={() => setPrinterPaperSize('58mm')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      printerPaperSize === '58mm'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    58mm (Kecil)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrinterPaperSize('80mm')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      printerPaperSize === '80mm'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    80mm (Lebar)
                  </button>
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={connectionStatus !== 'connected'}
                  onClick={handlePrintTestPage}
                  className={`w-full py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer border tracking-wider h-[42px] transition-transform ${
                    connectionStatus !== 'connected'
                      ? 'bg-zinc-200 text-slate-400 border-zinc-300 dark:bg-zinc-800 dark:text-slate-500 dark:border-zinc-700 cursor-not-allowed'
                      : 'bg-indigo-600/10 border-indigo-500/25 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20 hover:border-indigo-600/30'
                  }`}
                >
                  <FileText className="w-4 h-4" /> CETAK TEST STRUK
                </button>
              </div>
            </div>

            {/* Customize Slip TEXT Header & Footers */}
            <div className="flex flex-col gap-3.5 border-t border-black/5 dark:border-white/5 pt-4 mt-1">
              <div>
                <div className="flex justify-between">
                  <label className="text-xs text-slate-550 dark:text-slate-400 block mb-1 font-semibold">HEADER STRUK (TULISAN ATAS)</label>
                  <span className="text-[10px] text-slate-550 font-mono font-bold">Max 24 Char</span>
                </div>
                <input
                  type="text"
                  value={receiptHeader}
                  onChange={(e) => setReceiptHeader(e.target.value)}
                  maxLength={24}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl py-2.5 px-4 text-xs text-foreground dark:text-white uppercase focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="MIE JEBEW GDC OUTLET"
                />
              </div>

              <div>
                <div className="flex justify-between">
                  <label className="text-xs text-slate-550 dark:text-slate-400 block mb-1 font-semibold">FOOTER STRUK (TULISAN BAWAH)</label>
                  <span className="text-[10px] text-slate-550 font-mono font-bold">Max 30 Char</span>
                </div>
                <input
                  type="text"
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  maxLength={30}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl py-2.5 px-4 text-xs text-foreground dark:text-white uppercase focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="TERIMA KASIH ATAS KUNJUNGAN ANDA"
                />
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* MODAL / BOTTOM SLIDE EMULATOR FOR PHYSICAL PRINTED SLIP */}
      {showTestSlip && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-feed">
          <div className="bg-zinc-900 border border-white/10 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl relative p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                <span className="text-xs text-slate-400 font-black tracking-widest uppercase flex items-center gap-1">
                  <Printer className="w-4 h-4 text-indigo-400 animate-pulse" /> Virtual Printer Output
                </span>
                
                <button
                  type="button"
                  disabled={isPrinting}
                  onClick={() => setShowTestSlip(false)}
                  className={`text-slate-400 bg-white/5 hover:bg-white/10 p-1 rounded-lg ${isPrinting ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  Tutup Slip
                </button>
              </div>

              {/* simulated physical printer plastic mouth */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-2.5 pb-0 shadow-inner relative flex flex-col items-center">
                <div className="w-[85%] h-1 bg-black rounded-full shadow-lg border border-zinc-800 relative z-10"></div>
                <div className="bg-zinc-900/60 w-[90%] h-1 pb-1.5"></div>

                {/* scrolling paper container */}
                <div className="w-[80%] bg-white text-slate-900 p-4 pt-5 rounded-b-sm shadow-md transition-all duration-300 max-h-96 overflow-y-auto shrink-0 select-text outline-none relative mt-[-2px] border-b-4 border-dashed border-slate-300">
                  
                  {/* paper scanlines / shadow */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-200/50 to-transparent h-12 pointer-events-none"></div>

                  <div className="text-[10px] text-center" style={{ fontFamily: 'monospace', lineHeight: 1.3 }}>
                    {slipContent.map((line, index) => (
                      <div key={index} className="whitespace-pre">
                        {line}
                      </div>
                    ))}
                  </div>

                  {isPrinting && (
                    <div className="mt-3 text-center animate-pulse flex items-center justify-center gap-1 text-[9px] text-indigo-600 font-extrabold uppercase font-sans tracking-wider select-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></span>
                      Mencetak Termal... ZZZT ZZT
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 text-center mt-6">
              Test Slip mencerminkan ukuran kertas <span className="font-bold text-white uppercase">{printerPaperSize}</span> dengan integrasi nama outlet <span className="font-bold text-white">{settings.merchantName}</span>.
            </p>
          </div>
        </div>
      )}

    </div>
  );

  function handleCreatePairWithCheck(name: string) {
    if (confirm(`Apakah Anda ingin menyandingkan (pair) ${name} dengan server POS outlet ini via Bluetooth?`)) {
      handleConnectPrinter(name);
    }
  }
}
