// @ts-nocheck
import React from 'react';
import { 
  ShoppingCart, 
  History, 
  Coffee, 
  DollarSign,
  User,
  Store,
  FileSpreadsheet,
  Settings,
  TrendingUp,
  Sun,
  Moon,
  LogOut
} from 'lucide-react';
import { signOut, useSession } from '@/lib/auth-client';

interface SidebarProps {
  activeTab: 'dashboard' | 'pos' | 'history' | 'manage' | 'report' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'pos' | 'history' | 'manage' | 'report' | 'settings') => void;
  totalSalesToday: number;
  historyCount: number;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
  userProfileName?: string;
  userProfileImage?: string;
  storeName?: string;
  storeLogo?: string;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  totalSalesToday, 
  historyCount,
  theme,
  onThemeChange,
  userProfileName = 'Andi Budiman',
  userProfileImage,
  storeName = 'Mie Jebew GDC',
  storeLogo
}: SidebarProps) {
  
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const menuItems = [
    {
      id: 'dashboard' as const,
      label: 'Dasbor Utama',
      icon: TrendingUp,
      badge: null
    },
    {
      id: 'pos' as const,
      label: 'Kasir',
      icon: ShoppingCart,
      badge: null
    },
    {
      id: 'history' as const,
      label: 'Riwayat Transaksi',
      icon: History,
      badge: historyCount > 0 ? historyCount : null,
      badgeColor: 'bg-red-500/20 text-red-300'
    },
    {
      id: 'report' as const,
      label: 'Laporan Keuangan',
      icon: FileSpreadsheet,
      badge: null
    },
    {
      id: 'manage' as const,
      label: 'Kelola Menu',
      icon: Coffee,
      badge: null
    },
    {
      id: 'settings' as const,
      label: 'Pengaturan',
      icon: Settings,
      badge: null
    }
  ];

  const { data: session } = useSession();
  const userEmail = session?.user?.email;
  const isCrew = userEmail === 'miejebew.crew@gmail.com';

  const filteredMenuItems = menuItems.filter(item => {
    if (isCrew && (item.id === 'report' || item.id === 'manage')) {
      return false;
    }
    return true;
  });

  return (
    <aside className="w-full lg:w-64 h-full bg-sidebar/80 dark:bg-slate-950/45 backdrop-blur-xl border-r border-sidebar-border/40 dark:border-white/10 flex flex-col justify-between p-6 z-20 shrink-0 select-none text-sidebar-foreground transition-colors duration-300">
      {/* Brand & Cashier Title */}
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-sidebar-border/30 dark:border-white/10 bg-white shadow-md shadow-red-500/10 transition-all">
            <img src={storeLogo || "/logo.png"} alt="Mie Jebew Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-sidebar-foreground/60 dark:text-slate-400 block tracking-widest uppercase">RESTO SYSTEM</span>
            <span className="text-[15px] font-black text-foreground dark:text-white tracking-tight leading-none">
              {storeName}
              <span className="text-red-500">.</span>
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex flex-col gap-2">
          {filteredMenuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer text-left ${
                  isActive 
                    ? 'bg-sidebar-accent/80 text-sidebar-accent-foreground dark:bg-white/10 dark:text-white font-bold border border-sidebar-border dark:border-white/15 shadow-sm shadow-red-500/10' 
                    : 'text-sidebar-foreground/70 dark:text-slate-400 hover:text-foreground dark:hover:text-white hover:bg-sidebar-accent/50 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconComponent className={`w-5 h-5 ${isActive ? 'text-red-500' : 'text-sidebar-foreground/50 dark:text-slate-400 group-hover:text-foreground dark:group-hover:text-white'}`} />
                  <span className="text-sm">{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Statistics & Cashier User Panel */}
      <div className="flex flex-col gap-5">
        {/* Today's Sales Summary Widget */}
        <div className="bg-sidebar-accent/30 dark:bg-white/5 border border-sidebar-border/40 dark:border-white/10 rounded-2xl p-4 flex flex-col gap-2 shadow-inner">
          <span className="text-[10px] text-sidebar-foreground/60 dark:text-slate-400 uppercase tracking-wider font-semibold">Omset Hari Ini</span>
          <div className="flex items-center gap-2">
            <div className="p-1 px-1.5 bg-red-500/15 rounded-lg text-red-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="text-base font-bold text-foreground dark:text-slate-100 font-mono">
              {formatRupiah(totalSalesToday)}
            </span>
          </div>
          <div className="w-full bg-slate-850 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
            <div 
              className="bg-gradient-to-r from-red-600 to-yellow-500 h-full transition-all duration-500" 
              style={{ width: `${Math.min(100, (totalSalesToday / 1000000) * 100)}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-sidebar-foreground/50 dark:text-slate-400">Target Harian: Rp 1.000.000</p>
        </div>

        {/* Theme Toggle Slider */}
        <div className="flex items-center justify-between bg-sidebar-accent/30 dark:bg-white/5 border border-sidebar-border/40 dark:border-white/10 rounded-2xl p-2">
          <span className="text-[10px] text-sidebar-foreground/60 dark:text-slate-400 uppercase tracking-wider ml-1.5 font-bold font-sans">Suhu Tema</span>
          <div className="flex bg-black/10 dark:bg-slate-900/60 rounded-xl p-0.5 border border-sidebar-border/20 dark:border-white/5 shrink-0">
            <button
              onClick={() => onThemeChange('light')}
              className={`p-1 px-2.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                theme === 'light'
                  ? 'bg-yellow-500 text-slate-950 shadow-md'
                  : 'text-sidebar-foreground/65 dark:text-slate-400 hover:text-foreground dark:hover:text-white'
              }`}
            >
              <Sun className="w-3 h-3" /> Terang
            </button>
            <button
              onClick={() => onThemeChange('dark')}
              className={`p-1 px-2.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                theme === 'dark'
                  ? 'bg-zinc-800 text-white shadow-md'
                  : 'text-sidebar-foreground/65 dark:text-slate-400 hover:text-foreground dark:hover:text-white'
              }`}
            >
              <Moon className="w-3 h-3" /> Gelap
            </button>
          </div>
        </div>

        {/* Terminal Info & User Profile */}
        <div className="border-t border-sidebar-border/40 dark:border-white/10 pt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-full border border-sidebar-border/40 dark:border-white/20 shrink-0 relative overflow-hidden bg-slate-850">
              {userProfileImage ? (
                <img 
                  src={userProfileImage} 
                  alt={userProfileName} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-red-600 via-yellow-500 to-orange-500 flex items-center justify-center font-extrabold text-xs text-slate-950 font-mono">
                  {userProfileName
                    .trim()
                    .split(/\s+/)
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || 'AB'}
                </div>
              )}
            </div>
            <div className="overflow-hidden">
              <span className="text-sm font-semibold text-foreground dark:text-white block truncate font-sans" title={userProfileName}>{userProfileName}</span>
              <span className="text-[10px] text-sidebar-foreground/65 dark:text-slate-400 block font-mono">Terminal 01 • Kasir</span>
            </div>
          </div>

          <button
            onClick={async () => {
              try {
                await signOut();
                window.location.href = '/auth';
              } catch (err) {
                console.error('Failed to log out:', err);
                window.location.href = '/auth';
              }
            }}
            className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/20 rounded-xl transition-all cursor-pointer shadow-md shrink-0 ml-auto flex items-center justify-center"
            title="Keluar / Ganti Akun"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

