"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  KeyRound, 
  ShieldCheck, 
  Store, 
  Flame, 
  Sparkles, 
  TrendingUp, 
  Mail, 
  Lock, 
  User, 
  CheckCircle2, 
  ArrowRight,
  ChevronRight,
  TrendingDown
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup";

export function AuthScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: isSessionPending } = useSession();
  const queryMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const authError = searchParams.get("error");
  const [mode, setMode] = useState<AuthMode>(queryMode);
  const [signInForm, setSignInForm] = useState({
    email: "",
    password: "",
  });
  const [signUpForm, setSignUpForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    if (!isSessionPending && session) {
      router.replace("/dashboard");
    }
  }, [isSessionPending, router, session]);

  useEffect(() => {
    setMode(queryMode);
  }, [queryMode]);

  return (
    <div className="relative min-h-screen bg-[#fef2f2] dark:bg-[#090b11] text-[#450a0a] dark:text-slate-100 overflow-hidden flex items-center justify-center px-4 py-8 lg:p-12 font-sans select-none transition-colors duration-300">
      
      {/* ── BACKGROUND GLOWING BLOBS (MESH GRADIENT) ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-200/50 dark:bg-red-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-amber-100/50 dark:bg-amber-500/10 rounded-full blur-[150px] pointer-events-none animate-pulse duration-[10000ms]" />
      <div className="absolute top-[40%] right-[20%] w-[350px] h-[350px] bg-red-200/30 dark:bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#dc262608_1px,transparent_1px),linear-gradient(to_bottom,#dc262608_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* ── TOP NAVBAR ── */}
      <div className="absolute top-4 right-4 z-20 lg:top-8 lg:right-8">
        <ThemeToggle variant="default" className="border-red-200/60 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md text-red-950 dark:text-white hover:bg-red-50 dark:hover:bg-slate-800/60 transition-all rounded-full" />
      </div>

      {/* ── MAIN CONTAINER ── */}
      <div className="w-full max-w-6xl grid gap-8 lg:grid-cols-[1.1fr_0.9fr] relative z-10 items-stretch">
        
        {/* ── LEFT COLUMN: BRAND SHOWCASE & POS LIVE PREVIEW ── */}
        <div className="relative flex flex-col justify-between gap-10 p-8 lg:p-12 rounded-[32px] border border-red-100 dark:border-white/5 bg-white/45 dark:bg-slate-950/45 backdrop-blur-xl overflow-hidden shadow-xl dark:shadow-2xl transition-all duration-300">
          {/* Subtle inside gradient card glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-amber-500/5 pointer-events-none" />

          {/* Logo & Header */}
          <div>
            <div className="flex items-center gap-3.5">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-bounce duration-[3000ms]">
                <Flame className="size-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.25em] bg-gradient-to-r from-red-500 to-amber-400 bg-clip-text text-transparent">MIE JEBEW GDC</span>
                  <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full uppercase">POS v2.0</span>
                </div>
                <p className="mt-0.5 text-xs text-red-900/60 dark:text-slate-400 font-medium">Sistem Manajemen Kasir Restoran Pintar</p>
              </div>
            </div>

            <h1 className="mt-8 font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-[1.15] tracking-tight text-[#450a0a] dark:text-white">
              Kelola Pembukuan &amp; <span className="bg-gradient-to-r from-red-500 via-orange-400 to-amber-400 bg-clip-text text-transparent">Stok Kasir</span> dalam Satu Aplikasi.
            </h1>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-red-900/80 dark:text-slate-400 max-w-xl">
              Platform kasir modern yang dirancang khusus untuk Mie Jebew GDC. Pantau penjualan harian, kelola kasbon/hutang, cetak struk thermal otomatis, dan lacak kustomisasi menu secara realtime.
            </p>
          </div>

          {/* Live POS Dashboard Stat Preview Widget */}
          <div className="relative group my-2">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600 to-amber-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-700" />
            <div className="relative bg-white/80 dark:bg-slate-900/90 border border-red-100 dark:border-white/10 rounded-2xl p-5 shadow-lg dark:shadow-xl flex flex-col gap-4 transition-all duration-300">
              <div className="flex items-center justify-between border-b border-red-100/85 dark:border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-red-950 dark:text-slate-300">Live POS Widget</span>
                </div>
                <span className="text-[10px] font-mono text-red-700/60 dark:text-slate-500">22 Mei 2026</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-red-750 dark:text-slate-500 uppercase font-bold tracking-wider">Omset Hari Ini</span>
                  <div className="text-lg font-black text-[#450a0a] dark:text-white mt-0.5">Rp 3.450.000</div>
                  <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5 mt-1">
                    <TrendingUp className="w-2.5 h-2.5" /> +12.4% dari kemarin
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-red-750 dark:text-slate-500 uppercase font-bold tracking-wider">Transaksi Sukses</span>
                  <div className="text-lg font-black text-[#450a0a] dark:text-white mt-0.5">86 Nota</div>
                  <div className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5 mt-1 animate-pulse">
                    🔥 12 Pesanan Sedang Diproses
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Checklist */}
          <div className="grid sm:grid-cols-2 gap-4 border-t border-red-100/85 dark:border-white/5 pt-8">
            <div className="flex items-start gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-red-500/5 dark:bg-red-500/10 border border-red-500/15 dark:border-red-500/20 text-red-650 dark:text-red-400">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-red-955 dark:text-white">Sesi Aman &amp; Cepat</p>
                <p className="mt-1 text-[11px] leading-relaxed text-red-900/70 dark:text-slate-400">Autentikasi terenkripsi terhubung langsung dengan core workspace backend.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 dark:border-amber-500/20 text-amber-700 dark:text-amber-400">
                <KeyRound className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-red-955 dark:text-white">Konektivitas Cloud Database</p>
                <p className="mt-1 text-[11px] leading-relaxed text-red-900/70 dark:text-slate-400">Semua transaksi, inventaris stok, dan data hutang tersinkronisasi 100% aman.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: AUTHENTICATION FORM CARD ── */}
        <div className="flex flex-col justify-center">
          <Card className="border-red-100 dark:border-white/5 bg-white/70 dark:bg-slate-950/65 backdrop-blur-xl shadow-xl dark:shadow-[0_20px_50px_rgba(239,68,68,0.15)] rounded-[32px] overflow-hidden flex flex-col justify-between h-full p-6 sm:p-8 transition-all duration-300">
            <div>
              <CardHeader className="p-0 mb-6">
                <CardTitle className="font-extrabold text-2xl tracking-tight text-[#450a0a] dark:text-white">Akses Akun Kasir</CardTitle>
                <CardDescription className="text-xs text-red-900/70 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Silakan masuk menggunakan akun kasir terdaftar Anda, atau buat akun pemilik baru untuk mulai mengelola warung.
                </CardDescription>
              </CardHeader>

              {/* Mode Switcher Tab (Signin vs Signup) */}
              <div className="inline-flex w-full rounded-full bg-red-500/5 dark:bg-slate-900/80 border border-red-100 dark:border-white/5 p-1 mb-6 transition-all duration-300">
                <button
                  type="button"
                  className={cn(
                    "flex-1 rounded-full py-2.5 text-xs font-bold transition-all duration-300 uppercase tracking-wider cursor-pointer",
                    mode === "signin"
                      ? "bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-md font-black"
                      : "text-red-900/60 dark:text-slate-400 hover:text-[#450a0a] dark:hover:text-white"
                  )}
                  onClick={() => setMode("signin")}
                >
                  Masuk POS
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 rounded-full py-2.5 text-xs font-bold transition-all duration-300 uppercase tracking-wider cursor-pointer",
                    mode === "signup"
                      ? "bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-md font-black"
                      : "text-red-900/60 dark:text-slate-400 hover:text-[#450a0a] dark:hover:text-white"
                  )}
                  onClick={() => setMode("signup")}
                >
                  Daftar Akun
                </button>
              </div>

              {/* Error Display */}
              {authError ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-550 dark:text-red-400 font-semibold mb-6 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-550 shrink-0" />
                  <span>{authError}</span>
                </div>
              ) : null}

              {/* Sign In Form */}
              {mode === "signin" ? (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="signin-email" className="text-xs font-bold text-red-900/80 dark:text-slate-400 uppercase tracking-wider">Email Kasir</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 w-4 h-4 text-red-950/40 dark:text-slate-500" />
                      <Input
                        id="signin-email"
                        name="email"
                        form="signin-form"
                        type="email"
                        value={signInForm.email}
                        onChange={(event) =>
                          setSignInForm((current) => ({ ...current, email: event.target.value }))
                        }
                        autoComplete="email"
                        className="h-12 pl-11 pr-4 rounded-2xl bg-white dark:bg-slate-900/60 border-red-200 dark:border-white/5 text-[#450a0a] dark:text-white placeholder-red-900/30 dark:placeholder-slate-600 focus:border-red-500/50 focus:ring-red-500/20 text-sm font-semibold transition-all shadow-inner dark:shadow-none"
                        placeholder="kasir@miejebew.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="signin-password" className="text-xs font-bold text-red-900/80 dark:text-slate-400 uppercase tracking-wider">Kata Sandi</Label>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 w-4 h-4 text-red-950/40 dark:text-slate-500" />
                      <Input
                        id="signin-password"
                        name="password"
                        form="signin-form"
                        type="password"
                        value={signInForm.password}
                        onChange={(event) =>
                          setSignInForm((current) => ({ ...current, password: event.target.value }))
                        }
                        autoComplete="current-password"
                        className="h-12 pl-11 pr-4 rounded-2xl bg-white dark:bg-slate-900/60 border-red-200 dark:border-white/5 text-[#450a0a] dark:text-white placeholder-red-900/30 dark:placeholder-slate-600 focus:border-red-500/50 focus:ring-red-500/20 text-sm font-semibold transition-all shadow-inner dark:shadow-none"
                        placeholder="Masukkan kata sandi"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    form="signin-form"
                    size="lg"
                    className="h-12 w-full rounded-2xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-extrabold shadow-[0_4px_25px_rgba(239,68,68,0.25)] hover:shadow-[0_4px_35px_rgba(239,68,68,0.45)] transition-all duration-300 transform hover:-translate-y-0.5 text-xs uppercase tracking-wider cursor-pointer mt-4 flex items-center justify-center gap-2"
                  >
                    <span>Masuk ke Dashboard POS</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>

                  <form id="signin-form" action="/api/session/sign-in" method="post">
                    <input type="hidden" name="callbackURL" value="/dashboard" />
                  </form>
                </div>
              ) : (
                /* Sign Up Form */
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="signup-name" className="text-xs font-bold text-red-900/80 dark:text-slate-400 uppercase tracking-wider">Nama Lengkap Pemilik</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-3.5 w-4 h-4 text-red-950/40 dark:text-slate-500" />
                      <Input
                        id="signup-name"
                        name="name"
                        form="signup-form"
                        value={signUpForm.name}
                        onChange={(event) =>
                          setSignUpForm((current) => ({ ...current, name: event.target.value }))
                        }
                        autoComplete="name"
                        className="h-12 pl-11 pr-4 rounded-2xl bg-white dark:bg-slate-900/60 border-red-200 dark:border-white/5 text-[#450a0a] dark:text-white placeholder-red-900/30 dark:placeholder-slate-600 focus:border-red-500/50 focus:ring-red-500/20 text-sm font-semibold transition-all shadow-inner dark:shadow-none"
                        placeholder="e.g. Mas Joni"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="signup-email" className="text-xs font-bold text-red-900/80 dark:text-slate-400 uppercase tracking-wider">Email Utama</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 w-4 h-4 text-red-950/40 dark:text-slate-500" />
                      <Input
                        id="signup-email"
                        name="email"
                        form="signup-form"
                        type="email"
                        value={signUpForm.email}
                        onChange={(event) =>
                          setSignUpForm((current) => ({ ...current, email: event.target.value }))
                        }
                        autoComplete="email"
                        className="h-12 pl-11 pr-4 rounded-2xl bg-white dark:bg-slate-900/60 border-red-200 dark:border-white/5 text-[#450a0a] dark:text-white placeholder-red-900/30 dark:placeholder-slate-600 focus:border-red-500/50 focus:ring-red-500/20 text-sm font-semibold transition-all shadow-inner dark:shadow-none"
                        placeholder="owner@miejebew.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="signup-password" className="text-xs font-bold text-red-900/80 dark:text-slate-400 uppercase tracking-wider">Kata Sandi Baru</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 w-4 h-4 text-red-950/40 dark:text-slate-500" />
                      <Input
                        id="signup-password"
                        name="password"
                        form="signup-form"
                        type="password"
                        value={signUpForm.password}
                        onChange={(event) =>
                          setSignUpForm((current) => ({ ...current, password: event.target.value }))
                        }
                        autoComplete="new-password"
                        className="h-12 pl-11 pr-4 rounded-2xl bg-white dark:bg-slate-900/60 border-red-200 dark:border-white/5 text-[#450a0a] dark:text-white placeholder-red-900/30 dark:placeholder-slate-600 focus:border-red-500/50 focus:ring-red-500/20 text-sm font-semibold transition-all shadow-inner dark:shadow-none"
                        placeholder="Minimal 8 karakter"
                        minLength={8}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    form="signup-form"
                    size="lg"
                    className="h-12 w-full rounded-2xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-extrabold shadow-[0_4px_25px_rgba(239,68,68,0.25)] hover:shadow-[0_4px_35px_rgba(239,68,68,0.45)] transition-all duration-300 transform hover:-translate-y-0.5 text-xs uppercase tracking-wider cursor-pointer mt-4 flex items-center justify-center gap-2"
                  >
                    <span>Daftar Akun POS Baru</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>

                  <form id="signup-form" action="/api/session/sign-up" method="post">
                    <input type="hidden" name="callbackURL" value="/dashboard" />
                  </form>
                </div>
              )}
            </div>

            {/* Footer Watermark */}
            <div className="mt-8 text-center text-[10px] text-red-955/40 dark:text-slate-500 font-medium">
              &copy; {new Date().getFullYear()} Mie Jebew GDC. All rights reserved. <br/>
              Platform didukung oleh Next.js &amp; Better Auth.
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}

