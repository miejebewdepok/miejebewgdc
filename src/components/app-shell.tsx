"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Sidebar from "./warung/gdc/Sidebar";
import { AIAssistantPanel } from "@/components/warung/ai-assistant-panel";
import { Menu, Store } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription, SheetHeader } from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import { useAppState } from "@/components/providers/app-state-provider";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings, transactions, bootstrapReady, userId } = useAppState();
  
  const [aiOpen, setAiOpen] = useState(false);
  const { theme: nextTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  const isCrew = session?.user?.email === "miejebew.crew@gmail.com";
  const isOnline = useOnlineStatus();

  const storeLocaleName = settings.merchantName || settings.storeName || "MIE JEBEW GDC";
  const ownerDisplayName = settings.userProfileName || settings.ownerName || "Kasir";

  // Mobile/local fallback images: Proactively use cached store data if AppState is still empty during cold start
  const cachedStoreLogo =
    typeof window !== "undefined"
      ? localStorage.getItem("last_logged_in_store_logo") || undefined
      : undefined;
  const cachedOwnerName =
    typeof window !== "undefined"
      ? localStorage.getItem("last_logged_in_owner_name") || undefined
      : undefined;

  const displayLogo = settings.userProfileImage || cachedStoreLogo || undefined;
  const displayOwnerName = ownerDisplayName || cachedOwnerName || "Kasir";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isCrew) {
      if (pathname === '/laporan-keuangan' || pathname === '/inventaris') {
        router.replace('/dashboard');
      }
    }
  }, [mounted, isCrew, pathname, router]);

  // Persist lightweight settings values to local storage so the next startup can show cached UI immediately
  useEffect(() => {
    if (!settings?.storeName && !settings?.merchantName) return;
    if (typeof window === 'undefined') return;
    try {
      const storeName = settings.storeName || settings.merchantName || '';
      const ownerName = settings.ownerName || '';
      const userProfileName = settings.userProfileName || '';
      const userProfileImage = settings.userProfileImage || '';
      if (storeName) localStorage.setItem('last_logged_in_store_name', storeName);
      if (userProfileImage) localStorage.setItem('last_logged_in_store_logo', userProfileImage);
      if (ownerName || userProfileName) localStorage.setItem('last_logged_in_owner_name', ownerName || userProfileName);
    } catch {
      // ignore storage errors
    }
  }, [settings]);

  const theme = (mounted ? nextTheme : 'dark') === 'light' ? 'light' : 'dark';

  const totalSalesToday = useMemo(() => {
    const today = new Date().toDateString();
    return transactions
      .filter((tx) => new Date(tx.createdAt).toDateString() === today)
      .reduce((sum, tx) => sum + tx.total, 0);
  }, [transactions]);

  const historyCount = useMemo(() => {
    const today = new Date().toDateString();
    return transactions.filter((tx) => new Date(tx.createdAt).toDateString() === today).length;
  }, [transactions]);

  let activeTab: any = 'dashboard';
  if (pathname === '/kasir') activeTab = 'pos';
  if (pathname === '/inventaris') activeTab = 'manage';
  if (pathname === '/pengaturan') activeTab = 'settings';
  if (pathname === '/laporan') activeTab = 'history';
  if (pathname === '/laporan-keuangan') activeTab = 'report';

  return (
    <div className="w-full h-screen bg-background text-foreground dark:bg-slate-950 dark:text-slate-100 flex overflow-hidden font-sans relative transition-colors duration-300">
      {/* Background Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/15 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] bg-yellow-600/10 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute top-[30%] left-[40%] w-[35%] h-[35%] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Desktop Sidebar (GDC) */}
      <div className="hidden lg:block h-full z-20">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab === "dashboard") router.push("/dashboard");
            if (tab === "pos") router.push("/kasir");
            if (tab === "manage") router.push("/inventaris");
            if (tab === "settings") router.push("/pengaturan");
            if (tab === "history") router.push("/laporan");
            if (tab === "report") router.push("/laporan-keuangan");
          }}
          totalSalesToday={totalSalesToday}
          historyCount={historyCount}
          theme={theme}
          onThemeChange={setTheme}
          userProfileName={displayOwnerName}
          userProfileImage={displayLogo}
          storeName={storeLocaleName}
          storeLogo={displayLogo}
        />
      </div>

      {/* Central Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Mobile Header Bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3.5 bg-sidebar/90 dark:bg-slate-950/60 backdrop-blur-md border-b border-sidebar-border/40 dark:border-white/10 shrink-0 z-30">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    variant="outline"
                    className="rounded-xl bg-slate-900 hover:bg-slate-800 shadow-md border border-white/10 h-9 w-9 flex items-center justify-center pointer-events-auto"
                  />
                }
              >
                <Menu className="size-5 text-white" />
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[320px] bg-slate-950 p-0 border-r border-white/10">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription>Navigasi Kasir</SheetDescription>
                </SheetHeader>
                <Sidebar
                  activeTab={activeTab}
                  setActiveTab={(tab) => {
                    if (tab === "dashboard") router.push("/dashboard");
                    if (tab === "pos") router.push("/kasir");
                    if (tab === "manage") router.push("/inventaris");
                    if (tab === "settings") router.push("/pengaturan");
                    if (tab === "history") router.push("/laporan");
                    if (tab === "report") router.push("/laporan-keuangan");
                  }}
                  totalSalesToday={totalSalesToday}
                  historyCount={historyCount}
                  theme={theme}
                  onThemeChange={setTheme}
                  userProfileName={displayOwnerName}
                  userProfileImage={displayLogo}
                  storeName={storeLocaleName}
                  storeLogo={displayLogo}
                />
              </SheetContent>
            </Sheet>
            
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-white dark:bg-slate-900 flex items-center justify-center shadow-md">
                {displayLogo ? (
                  <img src={displayLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-red-600 flex items-center justify-center">
                    <Store className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <span className="text-sm font-black text-foreground dark:text-white uppercase tracking-tight">
                {storeLocaleName}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={
                isOnline
                  ? "text-[9px] bg-red-650/15 border border-red-500/20 text-red-400 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider font-mono"
                  : "text-[9px] bg-amber-500/10 border border-amber-400/30 text-amber-400 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider font-mono animate-pulse"
              }
            >
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-clip p-4 md:p-8">
          {(!bootstrapReady && !!userId) ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4 text-slate-600">
                <div className="relative">
                  {displayLogo ? (
                    <img
                      src={displayLogo}
                      alt="Logo"
                      className="w-14 h-14 rounded-2xl border border-white/10 object-cover shadow-lg animate-pulse"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg animate-pulse">
                      <Store className="h-7 w-7 text-white" />
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground dark:text-slate-400">
                  Menyiapkan data kasir...
                </span>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      <AIAssistantPanel open={aiOpen} onOpenChange={setAiOpen} />
    </div>
  );
}
