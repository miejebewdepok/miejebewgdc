import React, { useState, useEffect } from 'react';
import { Settings } from '@/lib/types';
import { useAppState } from '@/components/providers/app-state-provider';
import { useSession } from '@/lib/auth-client';
import { speakQrisNotification } from './CheckoutModal';
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
  Sparkles,
  UserCheck,
  UserX,
  ShieldCheck,
  Download
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
  const { userId } = useAppState();
  const isCabang2 = userId?.toLowerCase() === "rwtvcmmleowlwyhdjnnnnlewrlys26fc5" || 
                    settings.storeName?.toLowerCase().includes("depok") || 
                    settings.merchantName?.toLowerCase().includes("depok");
  // Local state for forms
  const [isSaving, setIsSaving] = useState(false);
  const [merchantName, setMerchantName] = useState(settings.merchantName || '');
  const [merchantAddress, setMerchantAddress] = useState(settings.merchantAddress || '');
  const [merchantPhone, setMerchantPhone] = useState(settings.merchantPhone || '');
  const [taxRate, setTaxRate] = useState(settings.taxRate ?? 0);
  const [enableServiceCharge, setEnableServiceCharge] = useState(settings.enableServiceCharge ?? false);
  const [serviceChargeRate, setServiceChargeRate] = useState(settings.serviceChargeRate ?? 0);
  
  const [qrisName, setQrisName] = useState(settings.qrisName || '');
  const [qrisType, setQrisType] = useState(settings.qrisType || 'static');
  const [qrisStaticCodeUrl, setQrisStaticCodeUrl] = useState(settings.qrisStaticCodeUrl || '');
  const [qrisUploadUrl, setQrisUploadUrl] = useState(settings.qrisUploadUrl || '');
  
  const [userProfileName, setUserProfileName] = useState(settings.userProfileName || 'Andi Budiman');
  const [userProfileImage, setUserProfileImage] = useState(settings.userProfileImage || '');

  const [printerPaperSize, setPrinterPaperSize] = useState(settings.printerPaperSize || '58mm');
  const [receiptHeader, setReceiptHeader] = useState(settings.receiptHeader || '');
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter || '');

  const [toppingsHpp, setToppingsHpp] = useState<Record<string, number>>(settings.toppingsHpp || {});
  const [spicyHpp, setSpicyHpp] = useState<Record<string, number>>(settings.spicyHpp || {});

  // QR Table Ordering States
  const [tableCount, setTableCount] = useState(settings.tableCount ?? 10);
  const [origin, setOrigin] = useState('');
  const [showQrSlip, setShowQrSlip] = useState(false);
  const [selectedQrTable, setSelectedQrTable] = useState('');
  const [isQrPrinting, setIsQrPrinting] = useState(false);

  // Promo Claims Database States
  const [promoClaims, setPromoClaims] = useState<{ id: string; customerName: string; whatsapp: string; email?: string | null; tableName: string; createdAt: string }[]>([]);
  const [claimsSearchQuery, setClaimsSearchQuery] = useState('');
  const [isLoadingClaims, setIsLoadingClaims] = useState(false);

  const fetchPromoClaims = async () => {
    setIsLoadingClaims(true);
    try {
      const res = await fetch('/api/settings/promo-claims');
      const data = await res.json();
      if (data.success && data.claims) {
        setPromoClaims(data.claims);
      }
    } catch (err) {
      console.error("Failed to load promo claims", err);
    } finally {
      setIsLoadingClaims(false);
    }
  };

  const { data: session } = useSession();
  const userEmail = session?.user?.email;

  // Manage User Access States
  const [usersList, setUsersList] = useState<{ id: string; name: string; email: string; isApproved: boolean; createdAt: string }[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const fetchUsersList = async () => {
    if (userEmail !== "taufiqrusdhi.ez@gmail.com") return;
    setIsLoadingUsers(true);
    try {
      const res = await fetch("/api/settings/users");
      const data = await res.json();
      if (res.ok && data.users) {
        setUsersList(data.users);
      }
    } catch (e) {
      console.error("Gagal memuat pengguna:", e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleToggleUserApproval = async (targetUserId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/settings/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId, isApproved: !currentStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsersList(prev => prev.map(u => u.id === targetUserId ? { ...u, isApproved: !currentStatus } : u));
      } else {
        alert(data.error || "Gagal memperbarui status akses.");
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan koneksi.");
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    fetchPromoClaims();
  }, []);

  useEffect(() => {
    if (userEmail === "taufiqrusdhi.ez@gmail.com") {
      fetchUsersList();
    }
  }, [userEmail]);

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
  const [currentPrinterName, setCurrentPrinterName] = useState<string>(settings.printerName || '');

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
        qrisUploadUrl,
        tableCount,
        toppingsHpp,
        spicyHpp
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

  const handleScanBluetooth = async () => {
    setIsScanning(true);
    setScannedDevices([]);
    playBeep(600, 0.1);

    if (typeof window !== 'undefined' && 'bluetooth' in navigator) {
      try {
        // Trigger browser's native Web Bluetooth search modal (scans real devices!)
        const device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            '000018f0-0000-1000-8000-00805f9b34fb', // Standard custom BLE ESC/POS service
            '0000ff00-0000-1000-8000-00805f9b34fb', // Zjiang / Rongta BLE service
            '0000e000-0000-1000-8000-00805f9b34fb', // Other portable print service
          ]
        });

        if (device) {
          const deviceName = device.name || 'Printer Bluetooth GDC';
          const deviceAddress = device.id || 'Web-Bluetooth-UUID';
          
          setScannedDevices([
            { name: deviceName, address: deviceAddress, rssi: -50 }
          ]);
        }
      } catch (err: any) {
        console.error('Web Bluetooth Scan error:', err);
        if (err.name === 'SecurityError') {
          alert('Scan Bluetooth langsung di halaman web memerlukan koneksi aman HTTPS (atau localhost).');
        } else if (err.name !== 'NotFoundError') {
          alert(`Pencarian Bluetooth gagal: ${err.message}`);
        }

        // Keep mock devices list as a fallback for testing
        setScannedDevices([
          { name: 'PT-210 Portable Printer', address: '00:11:22:33:AA:BB', rssi: -54 },
          { name: 'Zjiang ZJ-5805 Thermal', address: '33:44:55:66:CC:DD', rssi: -66 },
          { name: 'Rongta RPP02N-80', address: 'AA:BB:CC:DD:EE:FF', rssi: -72 },
          { name: 'Epson TM-P20 BT', address: '22:88:AC:33:E2:01', rssi: -85 }
        ]);
      } finally {
        setIsScanning(false);
        playBeep(900, 0.1);
      }
    } else {
      // Browser doesn't support Web Bluetooth (or runs over insecure HTTP)
      alert(
        "Browser Anda tidak mendukung pencarian Web Bluetooth secara langsung, atau Anda sedang tersambung via HTTP biasa.\n\n" +
        "PANDUAN KONEKSI PRINTER THERMAL BLUETOOTH:\n" +
        "1. Sandingkan (pair) printer Bluetooth Anda di Pengaturan Bluetooth Windows/PC Anda terlebih dahulu.\n" +
        "2. Di Windows, buka 'Devices & Printers' lalu tambahkan printer Anda sebagai 'Generic / Text Only' printer pada port COM virtual Bluetooth.\n" +
        "3. Saat melakukan checkout di halaman Kasir POS, tekan tombol 'Cetak Tagihan' dan pilih printer tersebut dari daftar printer sistem browser Anda.\n\n" +
        "Kami menampilkan daftar perangkat simulasi untuk keperluan uji coba antarmuka."
      );
      
      setScannedDevices([
        { name: 'PT-210 Portable Printer', address: '00:11:22:33:AA:BB', rssi: -54 },
        { name: 'Zjiang ZJ-5805 Thermal', address: '33:44:55:66:CC:DD', rssi: -66 },
        { name: 'Rongta RPP02N-80', address: 'AA:BB:CC:DD:EE:FF', rssi: -72 },
        { name: 'Epson TM-P20 BT', address: '22:88:AC:33:E2:01', rssi: -85 }
      ]);
      setIsScanning(false);
      playBeep(900, 0.1);
    }
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

  const handlePrintQrCode = (tableName: string) => {
    setSelectedQrTable(tableName);
    setShowQrSlip(true);
    setIsQrPrinting(true);
    playPrintSound();

    setTimeout(() => {
      setIsQrPrinting(false);
      playBeep(1200, 0.15);
    }, 1500);
  };

  const handleCopyAllWhatsapp = () => {
    if (promoClaims.length === 0) {
      alert("Database WhatsApp kosong.");
      return;
    }
    const uniqueNumbers = Array.from(new Set(promoClaims.map(c => c.whatsapp)));
    const copyText = uniqueNumbers.join(', ');
    navigator.clipboard.writeText(copyText);
    alert(`Berhasil menyalin ${uniqueNumbers.length} nomor WhatsApp unik ke papan klip!`);
  };

  const handleCopyAllEmails = () => {
    if (promoClaims.length === 0) {
      alert("Database Email kosong.");
      return;
    }
    const validEmails = promoClaims.map(c => c.email).filter(Boolean) as string[];
    const uniqueEmails = Array.from(new Set(validEmails));
    const copyText = uniqueEmails.join(', ');
    navigator.clipboard.writeText(copyText);
    alert(`Berhasil menyalin ${uniqueEmails.length} email unik ke papan klip!`);
  };

  const handleDownloadExcel = () => {
    if (promoClaims.length === 0) {
      alert("Database kosong, tidak ada data untuk diunduh.");
      return;
    }
    
    let csvContent = "\uFEFF"; // BOM for UTF-8 Excel compatibility
    csvContent += "Nama Pelanggan,Nomor WhatsApp,Email,Order/Meja,Tanggal Klaim\n";
    
    promoClaims.forEach((claim) => {
      const name = `"${claim.customerName.replace(/"/g, '""')}"`;
      const wa = `"${claim.whatsapp.replace(/"/g, '""')}"`;
      const email = `"${(claim.email || '').replace(/"/g, '""')}"`;
      const tbl = `"${claim.tableName.replace(/"/g, '""')}"`;
      const date = `"${new Date(claim.createdAt).toLocaleString('id-ID').replace(/"/g, '""')}"`;
      
      csvContent += `${name},${wa},${email},${tbl},${date}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `database_pelanggan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPdf = () => {
    if (promoClaims.length === 0) {
      alert("Database kosong, tidak ada data untuk dicetak.");
      return;
    }
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Popup diblokir oleh browser! Harap aktifkan izin popup.");
      return;
    }
    
    const rows = promoClaims.map((claim, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; text-align: center;">${idx + 1}</td>
        <td style="padding: 10px; font-weight: bold;">${claim.customerName}</td>
        <td style="padding: 10px; font-family: monospace;">${claim.whatsapp}</td>
        <td style="padding: 10px; font-family: monospace;">${claim.email || '-'}</td>
        <td style="padding: 10px; text-align: center;">Order ${claim.tableName.replace(/^(meja|order|self-order)[\s\-_]*/i, "")}</td>
        <td style="padding: 10px; font-size: 11px;">${new Date(claim.createdAt).toLocaleString('id-ID')}</td>
      </tr>
    `).join("");
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Database Pelanggan - Mie Jebew GDC</title>
          <style>
            body { font-family: sans-serif; color: #1e293b; padding: 20px; }
            h1 { font-size: 20px; margin-bottom: 5px; text-transform: uppercase; }
            p { font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th { background-color: #f1f5f9; padding: 12px 10px; text-align: left; border-bottom: 2px solid #cbd5e1; }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1>Database Pelanggan Promo QR</h1>
              <p>MIE JEBEW GDC - Diunduh pada ${new Date().toLocaleDateString('id-ID')}</p>
            </div>
            <button class="no-print" onclick="window.print();" style="padding: 8px 16px; background-color: #dc2626; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 12px;">Cetak / Simpan PDF</button>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">No</th>
                <th>Nama Pelanggan</th>
                <th>Nomor WhatsApp</th>
                <th>Email</th>
                <th style="text-align: center;">Sumber</th>
                <th>Tanggal Klaim</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDeleteClaim = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data klaim milik "${name}"? Pelanggan tersebut akan bisa mengklaim promo ${isCabang2 ? "Es Teh Tawar" : "Jasmine Tea"} gratis kembali.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/settings/promo-claims?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Data klaim berhasil dihapus!");
        setPromoClaims(prev => prev.filter(c => c.id !== id));
      } else {
        alert(data.error || "Gagal menghapus data klaim.");
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan koneksi saat menghapus data.");
    }
  };

  const handleDeleteAllClaims = async () => {
    if (!confirm("PENTING: Apakah Anda yakin ingin menghapus seluruh database nomor WhatsApp & Email klaim promo? Semua data akan terhapus secara permanen dan seluruh pelanggan akan bisa mengklaim kembali promo gratis.")) {
      return;
    }
    try {
      const res = await fetch('/api/settings/promo-claims?all=true', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Seluruh database klaim berhasil dikosongkan!");
        setPromoClaims([]);
      } else {
        alert(data.error || "Gagal mengosongkan database.");
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan koneksi saat mengosongkan database.");
    }
  };

  // Live dynamic demo QRIS code generator
  const [testAmount, setTestAmount] = useState('14500');

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1 select-none">
      
      {/* Settings Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground dark:text-white flex items-center gap-2">
            <SettingsIcon className="text-red-500 w-5 h-5 sm:w-6 sm:h-6" /> Pengaturan Sistem
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">Konfigurasi Parameter Restoran & POS</p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="w-full sm:w-auto bg-red-650 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold text-xs px-5 py-3.5 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer transition-transform duration-200 active:scale-95 shadow-lg shadow-red-600/25 animate-none"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> MENYIMPAN...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" /> SIMPAN PERUBAHAN
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
                            {/* Visual Simulated Mockup Preview of QR Smart Panel */}
              <div className="bg-black/5 dark:bg-black/40 border border-black/5 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between items-center text-center relative h-auto min-h-[256px] py-4 select-none">
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
                    <span className="text-[10px] text-slate-550 dark:text-slate-400 font-mono">Test input nominal:</span>
                    <input
                      type="number"
                      value={testAmount}
                      onChange={(e) => setTestAmount(e.target.value || '10000')}
                      className="w-16 bg-black/5 dark:bg-white/10 text-foreground dark:text-white text-[10px] font-mono text-center border border-black/10 dark:border-white/10 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => speakQrisNotification(Number(testAmount) || 0)}
                    className="mt-3 w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-extrabold text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-650/20 active:scale-95 border-none"
                  >
                    🔊 UJI SUARA QRIS (SOUNDBOX)
                  </button>
                </div>
              </div>  </div>

     </div>

          </div>

          {/* QR MEJA SETUP (SELF-ORDERING) CARD */}
          <div className="glass-morphism rounded-3xl p-6 relative overflow-hidden flex flex-col gap-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                <QrCode className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground dark:text-white uppercase tracking-wider">QR Self Order Setup</h3>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-650 dark:text-emerald-400 p-3.5 rounded-2xl text-[11px] font-sans">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-extrabold block">Trend Pemesanan Mandiri</span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Pelanggan cukup scan QR Code di Self Order untuk membuka menu public digital, memesan, & tagihan otomatis terkirim langsung ke dasbor kasir POS Anda!
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-550 dark:text-slate-400 block mb-1.5 font-bold uppercase tracking-wider">
                Jumlah Self Order Restoran
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={tableCount}
                onChange={(e) => setTableCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl py-3 px-4 text-xs text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 font-semibold"
                placeholder="10"
              />
            </div>

            <div className="border-t border-black/5 dark:border-white/5 pt-4">
              <span className="text-[10px] text-slate-550 dark:text-slate-400 font-extrabold uppercase block mb-3">
                Daftar Tautan Link & QR Self Order
              </span>
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1 no-scrollbar">
                {Array.from({ length: tableCount }).map((_, idx) => {
                  const tableNum = idx + 1;
                  const tableName = `${tableNum}`;
                  const tableUrl = isCabang2 ? `${origin}/o/c2-${tableName}` : `${origin}/o/${tableName}`;

                  return (
                    <div key={tableName} className="bg-black/5 dark:bg-black/30 border border-black/5 dark:border-white/5 rounded-2xl p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="overflow-hidden flex-1 w-full">
                        <span className="text-xs font-bold text-foreground dark:text-white">
                          # {tableNum}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate block w-full" title={tableUrl}>
                          {tableUrl}
                        </span>
                      </div>
                      <div className="flex gap-2 shrink-0 w-full md:w-auto">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(tableUrl);
                            alert(`Link Self Order ${tableNum} berhasil disalin!`);
                          }}
                          className="flex-1 md:flex-none py-1.5 px-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-slate-800 dark:text-white rounded-xl text-[10px] font-bold text-center cursor-pointer transition-all"
                        >
                          Salin Link
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintQrCode(tableName)}
                          className="flex-1 md:flex-none py-1.5 px-3 bg-red-650/15 border border-red-500/25 text-red-650 hover:bg-red-600/25 dark:text-red-300 dark:hover:bg-red-600/30 rounded-xl text-[10px] font-black text-center cursor-pointer transition-all"
                        >
                          Cetak QR
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
                    {/* DATABASE WHATSAPP & EMAIL PELANGGAN (PROMO QR) CARD */}
          <div className="glass-morphism rounded-3xl p-4 sm:p-6 relative overflow-hidden flex flex-col gap-4 mt-6">
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/10 text-red-500 rounded-xl">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground dark:text-white uppercase tracking-wider">DATABASE PELANGGAN</h3>
                  <p className="text-[11px] text-slate-555 dark:text-slate-400 mt-0.5 font-medium">Kontak WhatsApp & Email</p>
                </div>
              </div>
              
              {/* Dangerous action isolated on the right */}
              <button
                type="button"
                onClick={handleDeleteAllClaims}
                disabled={promoClaims.length === 0}
                className="bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600/20 text-rose-600 dark:text-rose-450 dark:hover:bg-rose-600/30 rounded-xl text-[10px] py-1.5 px-3.5 font-black cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95 duration-150 w-full sm:w-auto text-center"
              >
                Hapus Semua Data
              </button>
            </div>

            {/* Action Toolbar Row */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2.5 sm:items-center">
              <button
                type="button"
                onClick={handleCopyAllWhatsapp}
                disabled={promoClaims.length === 0}
                className="w-full sm:w-auto bg-emerald-650/15 border border-emerald-500/25 text-emerald-650 hover:bg-emerald-600/25 dark:text-emerald-300 dark:hover:bg-emerald-600/30 rounded-xl text-[10px] py-2 px-3 sm:py-1.5 sm:px-3.5 font-black cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95 duration-150"
              >
                Salin Semua WA ({promoClaims.length})
              </button>
              <button
                type="button"
                onClick={handleCopyAllEmails}
                disabled={promoClaims.length === 0}
                className="w-full sm:w-auto bg-indigo-500/15 border border-indigo-550/25 text-indigo-650 hover:bg-indigo-600/25 dark:text-indigo-400 dark:hover:bg-indigo-600/30 rounded-xl text-[10px] py-2 px-3 sm:py-1.5 sm:px-3.5 font-black cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95 duration-150"
              >
                Salin Semua Email
              </button>
              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={promoClaims.length === 0}
                className="w-full sm:w-auto bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl text-[10px] py-2 px-3 sm:py-1.5 sm:px-3.5 font-black cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-95 duration-150"
              >
                Unduh Excel (.csv)
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={promoClaims.length === 0}
                className="w-full sm:w-auto bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-[10px] py-2 px-3 sm:py-1.5 sm:px-3.5 font-black cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10 active:scale-95 duration-150"
              >
                Unduh PDF
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={claimsSearchQuery}
                onChange={(e) => setClaimsSearchQuery(e.target.value)}
                placeholder="Cari nama, nomor WhatsApp, email, atau Self Order..."
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/40"
              />
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              {claimsSearchQuery && (
                <button
                  onClick={() => setClaimsSearchQuery('')}
                  className="absolute right-3.5 top-3 text-[10px] font-bold text-slate-400 hover:text-red-500"
                >
                  Batal
                </button>
              )}
            </div>

            {/* Leads List */}
            <div className="border-t border-black/5 dark:border-white/5 pt-4">
              {isLoadingClaims ? (
                <div className="py-12 text-center text-xs font-bold text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-red-500" />
                  Memuat database pelanggan...
                </div>
              ) : promoClaims.length === 0 ? (
                <div className="py-12 text-center bg-black/5 dark:bg-black/30 border border-dashed border-black/10 dark:border-white/5 rounded-2xl">
                  <Smartphone className="w-8 h-8 text-slate-450 dark:text-slate-600 mx-auto mb-2" />
                  <span className="text-xs font-bold text-slate-400 block">Belum Ada Klaim Promo</span>
                  <p className="text-[10px] text-slate-555 dark:text-slate-500 mt-1 max-w-[250px] mx-auto leading-relaxed">
                    Kontak WhatsApp & Email pelanggan yang mengklaim {userId === "rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5" ? "Es Teh Tawar" : "Jasmine Tea"} gratis saat self-order akan otomatis muncul di sini.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1 no-scrollbar">
                  {promoClaims.filter(c => 
                    c.customerName.toLowerCase().includes(claimsSearchQuery.toLowerCase()) ||
                    c.whatsapp.includes(claimsSearchQuery) ||
                    (c.email && c.email.toLowerCase().includes(claimsSearchQuery.toLowerCase())) ||
                    c.tableName.toLowerCase().includes(claimsSearchQuery.toLowerCase())
                  ).length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      Tidak ada hasil pencarian yang cocok.
                    </div>
                  ) : (
                    promoClaims.filter(c => 
                      c.customerName.toLowerCase().includes(claimsSearchQuery.toLowerCase()) ||
                      c.whatsapp.includes(claimsSearchQuery) ||
                      (c.email && c.email.toLowerCase().includes(claimsSearchQuery.toLowerCase())) ||
                      c.tableName.toLowerCase().includes(claimsSearchQuery.toLowerCase())
                    ).map((claim) => (
                      <div key={claim.id} className="bg-black/5 dark:bg-black/30 border border-black/5 dark:border-white/5 rounded-2xl p-3.5 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3.5 hover:bg-black/10 dark:hover:bg-white/5 transition-all">
                        <div className="overflow-hidden flex-1 flex flex-col gap-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-xs font-bold text-foreground dark:text-white truncate max-w-[150px] sm:max-w-[200px]" title={claim.customerName}>
                              {claim.customerName}
                            </span>
                            <span className="text-[8px] font-black bg-red-500/10 text-red-500 dark:text-red-400 px-1.5 py-0.5 rounded-full border border-red-500/15 uppercase font-mono shrink-0">
                              Self Order {claim.tableName.replace(/^(meja|order|self-order)[\s\-_]*/i, "")}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-1 mt-1 border-l-2 border-red-500/25 pl-2.5">
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono block truncate break-all">
                              <span className="font-bold text-slate-500 dark:text-slate-500 mr-1 text-[9px] uppercase">WA:</span> {claim.whatsapp}
                            </span>
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono block truncate break-all">
                              <span className="font-bold text-slate-500 dark:text-slate-500 mr-1 text-[9px] uppercase">Email:</span> {claim.email || "-"}
                            </span>
                          </div>
                          
                          <span className="text-[8px] text-slate-400 dark:text-slate-500 block mt-1">
                            Klaim: {new Date(claim.createdAt).toLocaleString('id-ID')}
                          </span>
                        </div>
                        
                        <div className="flex flex-row sm:flex-col gap-1.5 shrink-0 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(claim.whatsapp);
                              alert(`Nomor WA ${claim.whatsapp} berhasil disalin!`);
                            }}
                            className="flex-1 sm:flex-none py-2 px-2.5 sm:py-1 sm:px-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-slate-800 dark:text-white rounded-xl sm:rounded-lg text-[9px] font-bold text-center cursor-pointer transition-all active:scale-95 duration-150"
                          >
                            Salin WA
                          </button>
                          {claim.email && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(claim.email || "");
                                alert(`Email ${claim.email} berhasil disalin!`);
                              }}
                              className="flex-1 sm:flex-none py-2 px-2.5 sm:py-1 sm:px-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-650 dark:text-indigo-400 rounded-xl sm:rounded-lg text-[9px] font-bold text-center cursor-pointer transition-all active:scale-95 duration-150"
                            >
                              Salin Email
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteClaim(claim.id, claim.customerName)}
                            className="flex-1 sm:flex-none py-2 px-2.5 sm:py-1 sm:px-2.5 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-600 dark:text-rose-450 rounded-xl sm:rounded-lg text-[9px] font-black text-center cursor-pointer transition-all active:scale-95 duration-150"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>  </div>

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

          {/* USER APPROVAL PANEL (ONLY FOR OWNER) */}
          {userEmail === "taufiqrusdhi.ez@gmail.com" && (
            <div className="glass-morphism rounded-3xl p-6 relative overflow-hidden flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground dark:text-white uppercase tracking-wider">Persetujuan Akses Akun</h3>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                Setujui atau cabut akses untuk akun kasir/kru yang mendaftar. Pengguna yang belum disetujui tidak akan bisa masuk ke aplikasi.
              </p>

              {isLoadingUsers ? (
                <div className="py-6 text-center text-xs font-bold text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-red-500" />
                  Memuat daftar pengguna...
                </div>
              ) : usersList.length <= 1 ? (
                <div className="py-4 text-center bg-black/5 dark:bg-black/20 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-450 block">Tidak ada pengguna lain terdaftar</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1 no-scrollbar animate-fade">
                  {usersList
                    .filter((u) => u.email !== "taufiqrusdhi.ez@gmail.com")
                    .map((user) => (
                      <div
                        key={user.id}
                        className="bg-black/5 dark:bg-black/30 border border-black/5 dark:border-white/5 rounded-2xl p-3 flex items-center justify-between gap-3 hover:bg-black/10 dark:hover:bg-white/5 transition-all"
                      >
                        <div className="overflow-hidden flex-1 flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-foreground dark:text-white truncate block" title={user.name}>
                            {user.name || "Nama Belum Diisi"}
                          </span>
                          <span className="text-[10px] text-slate-555 dark:text-slate-400 font-mono truncate block" title={user.email}>
                            {user.email}
                          </span>
                          <span className="text-[8px] text-slate-400 dark:text-slate-555 block font-mono">
                            Daftar: {new Date(user.createdAt).toLocaleDateString("id-ID")}
                          </span>
                        </div>

                        <div className="shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleUserApproval(user.id, user.isApproved)}
                            className={`py-1.5 px-3 border rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              user.isApproved
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-650 dark:text-emerald-400 hover:bg-emerald-500/20"
                                : "bg-red-500/10 border-red-500/25 text-red-650 dark:text-red-400 hover:bg-red-500/20"
                            }`}
                          >
                            {user.isApproved ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                                Aktif
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5 text-red-500" />
                                Diblokir
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

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

            <div className="text-[10px] text-slate-555 dark:text-slate-400 flex flex-col gap-2 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4.5 mb-1 text-left">
              <div className="flex items-center gap-2 font-black text-indigo-400 uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Petunjuk Menghubungkan Printer Bluetooth</span>
              </div>
              <p className="leading-relaxed font-semibold">
                Sistem kami mendukung printer termal portable standar ESC/POS (58mm/80mm). 
              </p>
              <div className="mt-1 flex flex-col gap-1.5 border-t border-black/5 dark:border-white/5 pt-2.5">
                <span className="font-bold text-foreground dark:text-white block">Cara Terbaik (Sistem Printer):</span>
                <ol className="list-decimal list-inside flex flex-col gap-1 pl-1">
                  <li>Sandingkan (*pair*) printer dengan PC/Windows Anda via Bluetooth Settings.</li>
                  <li>Instal driver printer kasir (*Generic / Text Only* atau driver bawaan) di Windows.</li>
                  <li>Di Kasir POS saat checkout, tekan tombol <span className="font-extrabold text-red-500">Cetak Tagihan</span>, lalu pilih nama printer Anda di dialog cetak Google Chrome. Cara ini **100% stabil & otomatis didukung browser**.</li>
                </ol>
              </div>
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

          {/* PENGATURAN HPP KUSTOM (TOPPING & LEVEL PEDAS) */}
            <div className="glass-morphism rounded-3xl p-6 relative overflow-hidden flex flex-col gap-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <Sliders className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground dark:text-white uppercase tracking-wider">Konfigurasi HPP Kustom</h3>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-2 leading-relaxed">
                Atur harga modal (HPP) untuk setiap kustomisasi topping, level pedas, varian isi, dan porsi secara spesifik per cabang. Jika kosong, sistem otomatis menaksir HPP sebesar 60% dari harga jual tambahan.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-black/5 dark:border-white/5 pt-4">
                {/* Left Column: Toppings HPP */}
                <div className="flex flex-col gap-4">
                  <span className="text-[10px] text-slate-700 dark:text-slate-350 font-black uppercase tracking-wider block border-b border-black/5 dark:border-white/5 pb-2">
                    Harga Pokok (HPP) Topping
                  </span>

                  <div className="flex flex-col gap-3.5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                    {(isCabang2 ? [
                      { label: "Ceker (+Rp 2.500)", key: "Ceker", def: 1500 },
                      { label: "Kulit Ayam (+Rp 2.500)", key: "Kulit Ayam", def: 1500 },
                      { label: "Pangsit Goreng (+Rp 2.500)", key: "Pangsit Goreng", def: 1500 },
                      { label: "Telur (+Rp 4.000)", key: "Telur", def: 2400 },
                      { label: "Bakso (Gratis)", key: "Bakso", def: 1200 },
                      { label: "Sosis (Gratis)", key: "Sosis", def: 1200 },
                      { label: "Nugget (Gratis)", key: "Nugget", def: 1200 },
                      { label: "Otak-Otak (Gratis)", key: "Otak-Otak", def: 1200 },
                      { label: "Cireng (Gratis)", key: "Cireng", def: 1200 },
                    ] : [
                      { label: "Telur (+Rp 4.000)", key: "Telur", def: 2400 },
                      { label: "Beef Slice (+Rp 2.500)", key: "Beef Slice", def: 1500 },
                      { label: "Keju Slice (+Rp 3.000)", key: "Keju Slice", def: 1800 },
                      { label: "Bakso (+Rp 2.000)", key: "Bakso", def: 1200 },
                      { label: "Sosis (+Rp 2.000)", key: "Sosis", def: 1200 },
                      { label: "Nugget (+Rp 2.000)", key: "Nugget", def: 1200 },
                      { label: "Otak-Otak (+Rp 2.000)", key: "Otak-Otak", def: 1200 },
                      { label: "Scallop (+Rp 2.000)", key: "Scallop", def: 1200 },
                      { label: "Tahu Aci (+Rp 2.000)", key: "Tahu Aci", def: 1200 },
                      { label: "Bakso Ikan (+Rp 2.000)", key: "Bakso Ikan", def: 1200 },
                      { label: "Cireng (+Rp 2.000)", key: "Cireng", def: 1200 },
                    ]).map((top) => (
                      <div key={top.key} className="flex items-center justify-between gap-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{top.label}</span>
                          <span className="text-[9px] text-slate-500 font-mono">Bawaan: Rp {top.def.toLocaleString()}</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          placeholder={top.def.toString()}
                          value={toppingsHpp[top.key] !== undefined ? toppingsHpp[top.key] : ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? undefined : (parseInt(e.target.value, 10) || 0);
                            setToppingsHpp(prev => {
                              const next = { ...prev };
                              if (val === undefined) {
                                delete next[top.key];
                              } else {
                                next[top.key] = val;
                              }
                              return next;
                            });
                          }}
                          className="w-24 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl py-1.5 px-3 text-xs text-foreground dark:text-white font-mono text-right focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column: Spicy Levels, kebab sizes, and lumpia fillings HPP */}
                <div className="flex flex-col gap-4">
                  <span className="text-[10px] text-slate-700 dark:text-slate-350 font-black uppercase tracking-wider block border-b border-black/5 dark:border-white/5 pb-2">
                    Harga Pokok Varian & Kepedasan
                  </span>

                  <div className="flex flex-col gap-3.5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                    {(userId === "rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5" ? [
                      { label: "Level 4 Pedas (+Rp 2.000)", key: "level_4", def: 1200, type: "spicy" },
                      { label: "Level 5 Pedas (+Rp 2.000)", key: "level_5", def: 1200, type: "spicy" },
                    ] : [
                      { label: "Level 4 Pedas (+Rp 2.000)", key: "level_4", def: 1200, type: "spicy" },
                      { label: "Level 5 Pedas (+Rp 2.000)", key: "level_5", def: 1200, type: "spicy" },
                      // Lumpia Beef Fillings
                      { label: "Lumpia - Beef Patty (+Rp 5.000)", key: "filling_Beef Patty", def: 3000, type: "filling" },
                      { label: "Lumpia - Chicken Katsu (+Rp 5.000)", key: "filling_Chicken Katsu", def: 3000, type: "filling" },
                      { label: "Lumpia - Special (+Rp 10.000)", key: "filling_Special", def: 6000, type: "filling" },
                      // Kebab Sizes & Fillings
                      { label: "Kebab Reg - Beef (+Rp 2.000)", key: "filling_Beef", def: 1200, type: "filling" },
                      { label: "Kebab Large - Beef (+Rp 5.000)", key: "filling_Beef_large", def: 3000, type: "filling" },
                      { label: "Kebab Large - Beef Slice (+Rp 5.000)", key: "filling_Beef Slice_large", def: 3000, type: "filling" },
                      { label: "Kebab Large - Ch. Katsu (+Rp 5.000)", key: "filling_Chicken Katsu_large", def: 3000, type: "filling" },
                      { label: "Kebab Large - Special (+Rp 10.000)", key: "filling_Special_large", def: 6000, type: "filling" },
                      // Spaghetti Sizes
                      { label: "Spaghetti Porsi Double (+Rp 4.000)", key: "spaghetti_double", def: 2400, type: "size" },
                    ]).map((lvl) => {
                      const isSpicy = lvl.type === "spicy";
                      const hppState = isSpicy ? spicyHpp : toppingsHpp;
                      const setHppState = isSpicy ? setSpicyHpp : setToppingsHpp;
                      
                      return (
                        <div key={lvl.key} className="flex items-center justify-between gap-3">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">{lvl.label}</span>
                            <span className="text-[9px] text-slate-500 font-mono">Bawaan: Rp {lvl.def.toLocaleString()}</span>
                          </div>
                          <input
                            type="number"
                            min="0"
                            placeholder={lvl.def.toString()}
                            value={hppState[lvl.key] !== undefined ? hppState[lvl.key] : ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? undefined : (parseInt(e.target.value, 10) || 0);
                              setHppState(prev => {
                                const next = { ...prev };
                                if (val === undefined) {
                                  delete next[lvl.key];
                                } else {
                                  next[lvl.key] = val;
                                }
                                return next;
                              });
                            }}
                            className="w-24 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl py-1.5 px-3 text-xs text-foreground dark:text-white font-mono text-right focus:outline-none focus:ring-1 focus:ring-red-500"
                          />
                        </div>
                      );
                    })}
                  </div>
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

      {/* MODAL / BOTTOM SLIDE EMULATOR FOR TABLE QR CODE PRINTED SLIP */}
      {showQrSlip && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-feed">
          <div className="bg-zinc-900 border border-white/10 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl relative p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                <span className="text-xs text-slate-400 font-black tracking-widest uppercase flex items-center gap-1">
                  <Printer className="w-4 h-4 text-indigo-400 animate-pulse" /> Virtual Printer Output (QR Self Order)
                </span>
                
                <button
                  type="button"
                  disabled={isQrPrinting}
                  onClick={() => setShowQrSlip(false)}
                  className={`text-slate-400 bg-white/5 hover:bg-white/10 p-1 rounded-lg ${isQrPrinting ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  Tutup Slip
                </button>
              </div>

              {/* simulated physical printer plastic mouth */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-2.5 pb-0 shadow-inner relative flex flex-col items-center">
                <div className="w-[85%] h-1 bg-black rounded-full shadow-lg border border-zinc-800 relative z-10"></div>
                <div className="bg-zinc-900/60 w-[90%] h-1 pb-1.5"></div>

                {/* scrolling paper container */}
                <div className="w-[85%] bg-white text-slate-900 p-5 rounded-2xl shadow-xl transition-all duration-300 max-h-[380px] overflow-y-auto shrink-0 select-text outline-none relative mt-[-2px] border border-slate-200">
                  <div className="text-center flex flex-col items-center font-sans">
                    {/* Brand header */}
                    {settings.userProfileImage ? (
                      <img src={settings.userProfileImage} alt="Logo" className="w-10 h-10 rounded-xl object-cover mb-2 shadow-sm border border-slate-100" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center font-black text-xs mb-2">MJ</div>
                    )}
                    
                    <div className="font-extrabold text-sm uppercase text-slate-800 tracking-tight">{settings.merchantName || settings.storeName || "MIE JEBEW GDC"}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5 leading-snug">{settings.merchantAddress || "Alamat Outlet"}</div>
                    
                    {/* Table Badge */}
                    <div className="my-3 py-1.5 px-4 bg-red-50 text-red-650 border border-red-100 rounded-xl text-sm font-black uppercase tracking-wider">
                      MEJA {selectedQrTable.replace(/^(meja|order|self-order)[\s\-_]*/i, "")}
                    </div>

                    <div className="text-[10px] text-slate-600 font-medium mb-3 px-1 leading-relaxed">
                      Pindai kode QR di bawah untuk melihat menu & memesan langsung secara mandiri dari handphone Anda.
                    </div>
                    
                    {/* QR Code Frame */}
                    <div className="w-36 h-36 bg-slate-50 border border-slate-150 p-3 rounded-2xl flex items-center justify-center my-1.5 shadow-inner">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                          `${origin}/o/${isCabang2 ? `c2-${selectedQrTable}` : selectedQrTable}`
                        )}`}
                        alt="Order QR Code" 
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="text-[9px] font-extrabold text-slate-800 uppercase tracking-widest mt-3.5">
                      ~ SELF-ORDERING PLATFORM ~
                    </div>
                    <div className="text-[8px] text-slate-400 font-medium mt-1">
                      Powered by WarungOS
                    </div>
                  </div>

                  {isQrPrinting && (
                    <div className="mt-3 text-center animate-pulse flex items-center justify-center gap-1 text-[9px] text-indigo-600 font-extrabold uppercase font-sans tracking-wider select-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></span>
                      Mencetak Termal... ZZZT ZZT
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons inside modal */}
            <div className="flex flex-col gap-2 mt-5">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const tableUrl = isCabang2 ? `${origin}/o/c2-${selectedQrTable}` : `${origin}/o/${selectedQrTable}`;
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(tableUrl)}`;
                    const res = await fetch(qrUrl);
                    const blob = await res.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    
                    const link = document.createElement("a");
                    link.href = blobUrl;
                    link.download = `QR_Self_Order_Meja_${selectedQrTable.replace(/^(meja|order|self-order)[\s\-_]*/i, "")}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                  } catch (e) {
                    const tableUrl = isCabang2 ? `${origin}/o/c2-${selectedQrTable}` : `${origin}/o/${selectedQrTable}`;
                    window.open(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(tableUrl)}`, "_blank");
                  }
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold text-center flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/10 border-none active:scale-95"
              >
                <Download className="w-4 h-4" /> Download Gambar QR (PNG)
              </button>

              <button
                type="button"
                onClick={() => {
                  const tableNum = selectedQrTable.replace(/^(meja|order|self-order)[\s\-_]*/i, "");
                  const tableUrl = isCabang2 ? `${origin}/o/c2-${selectedQrTable}` : `${origin}/o/${selectedQrTable}`;
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tableUrl)}`;
                  
                  const logoHtml = settings.userProfileImage ? `<img src="${settings.userProfileImage}" class="logo" />` : '';
                  const merchantName = settings.merchantName || settings.storeName || "MIE JEBEW GDC";
                  const merchantAddress = settings.merchantAddress || "Alamat Outlet";

                  const printWindow = window.open("", "_blank");
                  if (!printWindow) {
                    alert("Popup diblokir oleh browser! Harap aktifkan izin popup.");
                    return;
                  }
                  
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>QR Self Order - Meja ${tableNum}</title>
                        <style>
                          body {
                            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            color: #1e293b;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            margin: 0;
                            background-color: #f8fafc;
                          }
                          .card {
                            background: white;
                            width: 320px;
                            padding: 30px;
                            border-radius: 24px;
                            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
                            border: 1px solid #e2e8f0;
                            text-align: center;
                            box-sizing: border-box;
                          }
                          .logo {
                            width: 60px;
                            height: 60px;
                            border-radius: 16px;
                            object-fit: cover;
                            margin-bottom: 12px;
                            box-shadow: 0 4px 10px rgba(220, 38, 38, 0.15);
                          }
                          .brand {
                            font-size: 18px;
                            font-weight: 800;
                            letter-spacing: -0.025em;
                            color: #0f172a;
                            margin: 0;
                            text-transform: uppercase;
                          }
                          .address {
                            font-size: 10px;
                            color: #64748b;
                            margin: 4px 0 16px 0;
                          }
                          .table-badge {
                            background-color: #fef2f2;
                            border: 1px solid #fee2e2;
                            color: #dc2626;
                            font-size: 18px;
                            font-weight: 900;
                            padding: 8px 16px;
                            border-radius: 14px;
                            display: inline-block;
                            margin-bottom: 16px;
                            letter-spacing: 0.05em;
                          }
                          .instructions {
                            font-size: 11px;
                            color: #475569;
                            line-height: 1.5;
                            margin-bottom: 20px;
                            font-weight: 500;
                          }
                          .qr-container {
                            background: #f8fafc;
                            border: 1px solid #f1f5f9;
                            padding: 16px;
                            border-radius: 16px;
                            display: inline-block;
                            margin-bottom: 20px;
                          }
                          .qr-image {
                            width: 180px;
                            height: 180px;
                            display: block;
                          }
                          .footer-text {
                            font-size: 11px;
                            font-weight: 700;
                            color: #0f172a;
                            letter-spacing: 0.1em;
                          }
                          .subfooter-text {
                            font-size: 9px;
                            color: #94a3b8;
                            margin-top: 4px;
                          }
                          @media print {
                            body { background-color: white; }
                            .card {
                              box-shadow: none;
                              border: none;
                              padding: 10px;
                            }
                            .no-print { display: none; }
                          }
                        </style>
                      </head>
                      <body>
                        <div class="card">
                          ${logoHtml}
                          <h1 class="brand">${merchantName}</h1>
                          <p class="address">${merchantAddress}</p>
                          
                          <div class="table-badge">MEJA ${tableNum}</div>
                          
                          <p class="instructions">
                            Pindai kode QR di bawah untuk melihat menu<br>
                            & memesan makanan langsung dari meja Anda.
                          </p>
                          
                          <div class="qr-container">
                            <img src="${qrUrl}" class="qr-image" />
                          </div>
                          
                          <div class="footer-text font-bold">~ SELF-ORDERING PLATFORM ~</div>
                          <div class="subfooter-text">Powered by WarungOS</div>
                          
                          <div class="no-print" style="margin-top: 25px;">
                            <button onclick="window.print();" style="padding: 10px 20px; background-color: #dc2626; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 12px; box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.2);">Cetak / Simpan PDF</button>
                          </div>
                        </div>
                        <script>
                          window.onload = function() {
                            setTimeout(function() {
                              window.print();
                            }, 400);
                          }
                        </script>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }}
                className="w-full py-2.5 bg-red-650 hover:bg-red-700 text-white rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-red-500/10 border-none active:scale-95"
              >
                <Printer className="w-4 h-4" /> Cetak Slip / Simpan PDF
              </button>
            </div>

            <p className="text-[10px] text-slate-400 text-center mt-4">
              Potong slip QR Self Order ini dan tempelkan di <span className="font-bold text-white uppercase">{selectedQrTable}</span>.
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
