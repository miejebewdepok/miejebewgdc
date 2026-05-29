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
  TrendingDown,
  Eye,
  EyeOff
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
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="relative min-h-screen bg-[#fef2f2] dark:bg-[#090b11] text-[#450a0a] dark:text-slate-100 overflow-hidden flex items-center justify-center px-4 py-8 lg:p-12 font-sans select-none transition-colors duration-300 dark">
      
      {/* ── BACKGROUND GLOWING BLOBS (MESH GRADIENT) ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-200/50 dark:bg-red-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-rose-100/40 dark:bg-rose-600/10 rounded-full blur-[150px] pointer-events-none animate-pulse duration-[10000ms]" />
      <div className="absolute top-[40%] right-[20%] w-[350px] h-[350px] bg-red-200/30 dark:bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#dc262608_1px,transparent_1px),linear-gradient(to_bottom,#dc262608_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />      {/* ── MAIN CENTERED CONTAINER ── */}
      <div className="w-full max-w-md relative z-10 flex flex-col gap-6 items-center">
        
        {/* Logo & Simple Header */}
        <div className="flex flex-col items-center text-center gap-2 mb-2">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 shadow-[0_0_25px_rgba(220,38,38,0.45)] animate-bounce duration-[3000ms]">
            <Flame className="size-7 text-white" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-black uppercase tracking-[0.25em] bg-gradient-to-r from-red-500 to-rose-500 bg-clip-text text-transparent">MIE JEBEW GDC</span>
            <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full uppercase">POS v2.0</span>
          </div>
          <p className="text-xs text-red-900/60 dark:text-slate-400 font-medium">Sistem Kasir POS & Restoran</p>
        </div>

        {/* ── AUTHENTICATION FORM CARD ── */}
        <Card className="w-full border border-red-200/50 dark:border-red-900/30 bg-white/70 dark:bg-slate-950/65 backdrop-blur-xl shadow-xl dark:shadow-[0_20px_50px_rgba(220,38,38,0.15)] rounded-[32px] overflow-hidden p-6 sm:p-8 transition-all duration-300">
          <div>
            <CardHeader className="p-0 mb-6">
              <CardTitle className="font-extrabold text-xl tracking-tight text-[#450a0a] dark:text-white text-center">Akses Akun Kasir</CardTitle>
              <CardDescription className="text-xs text-red-550 dark:text-slate-400 mt-1.5 leading-relaxed text-center">
                Silakan masuk menggunakan akun kasir terdaftar Anda, atau daftar akun pemilik baru.
              </CardDescription>
            </CardHeader>

            {/* Mode Switcher Tab (Signin vs Signup) */}
            <div className="inline-flex w-full rounded-full bg-red-500/10 dark:bg-red-950/40 border border-red-200/35 dark:border-red-900/20 p-1 mb-6 transition-all duration-300">
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-full py-2 text-xs font-bold transition-all duration-300 uppercase tracking-wider cursor-pointer",
                  mode === "signin"
                    ? "bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-md font-black"
                    : "text-red-900/60 dark:text-slate-400 hover:text-[#450a0a] dark:hover:text-white"
                )}
                onClick={() => setMode("signin")}
              >
                Masuk
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-full py-2 text-xs font-bold transition-all duration-300 uppercase tracking-wider cursor-pointer",
                  mode === "signup"
                    ? "bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-md font-black"
                    : "text-red-900/60 dark:text-slate-400 hover:text-[#450a0a] dark:hover:text-white"
                )}
                onClick={() => setMode("signup")}
              >
                Daftar
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
                  <Label htmlFor="signin-email" className="text-xs font-bold text-red-900/85 dark:text-slate-400 uppercase tracking-wider">Email Kasir</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-4 h-4 text-red-500/60 dark:text-red-400/50" />
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
                      className="h-12 pl-11 pr-4 rounded-2xl bg-red-500/5 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 text-[#450a0a] dark:text-white placeholder-red-900/40 dark:placeholder-red-500/30 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-sm font-semibold transition-all shadow-inner shadow-red-500/5"
                      placeholder="kasir@miejebew.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="signin-password" className="text-xs font-bold text-red-900/85 dark:text-slate-400 uppercase tracking-wider">Kata Sandi</Label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 w-4 h-4 text-red-500/60 dark:text-red-400/50" />
                    <Input
                      id="signin-password"
                      name="password"
                      form="signin-form"
                      type={showPassword ? "text" : "password"}
                      value={signInForm.password}
                      onChange={(event) =>
                        setSignInForm((current) => ({ ...current, password: event.target.value }))
                      }
                      autoComplete="current-password"
                      className="h-12 pl-11 pr-12 rounded-2xl bg-red-500/5 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 text-[#450a0a] dark:text-white placeholder-red-900/40 dark:placeholder-red-500/30 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-sm font-semibold transition-all shadow-inner shadow-red-500/5"
                      placeholder="Masukkan kata sandi"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3.5 text-red-500/60 hover:text-red-650 dark:text-red-400/50 dark:hover:text-red-300 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  form="signin-form"
                  size="lg"
                  className="h-12 w-full rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-extrabold shadow-[0_4px_25px_rgba(220,38,38,0.25)] hover:shadow-[0_4px_35px_rgba(220,38,38,0.45)] transition-all duration-300 transform hover:-translate-y-0.5 text-xs uppercase tracking-wider cursor-pointer mt-4 flex items-center justify-center gap-2"
                >
                  <span>Masuk POS</span>
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
                  <Label htmlFor="signup-name" className="text-xs font-bold text-red-900/85 dark:text-slate-400 uppercase tracking-wider">Nama Lengkap</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 w-4 h-4 text-red-500/60 dark:text-red-400/50" />
                    <Input
                      id="signup-name"
                      name="name"
                      form="signup-form"
                      value={signUpForm.name}
                      onChange={(event) =>
                        setSignUpForm((current) => ({ ...current, name: event.target.value }))
                      }
                      autoComplete="name"
                      className="h-12 pl-11 pr-4 rounded-2xl bg-red-500/5 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 text-[#450a0a] dark:text-white placeholder-red-900/40 dark:placeholder-red-500/30 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-sm font-semibold transition-all shadow-inner shadow-red-500/5"
                      placeholder="Nama Anda"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="signup-email" className="text-xs font-bold text-red-900/85 dark:text-slate-400 uppercase tracking-wider">Email Utama</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-4 h-4 text-red-500/60 dark:text-red-400/50" />
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
                      className="h-12 pl-11 pr-4 rounded-2xl bg-red-500/5 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 text-[#450a0a] dark:text-white placeholder-red-900/40 dark:placeholder-red-500/30 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-sm font-semibold transition-all shadow-inner shadow-red-500/5"
                      placeholder="owner@miejebew.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="signup-password" className="text-xs font-bold text-red-900/85 dark:text-slate-400 uppercase tracking-wider">Kata Sandi Baru</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 w-4 h-4 text-red-500/60 dark:text-red-400/50" />
                    <Input
                      id="signup-password"
                      name="password"
                      form="signup-form"
                      type={showPassword ? "text" : "password"}
                      value={signUpForm.password}
                      onChange={(event) =>
                        setSignUpForm((current) => ({ ...current, password: event.target.value }))
                      }
                      autoComplete="new-password"
                      className="h-12 pl-11 pr-12 rounded-2xl bg-red-500/5 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 text-[#450a0a] dark:text-white placeholder-red-900/40 dark:placeholder-red-500/30 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-sm font-semibold transition-all shadow-inner shadow-red-500/5"
                      placeholder="Minimal 8 karakter"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3.5 text-red-500/60 hover:text-red-650 dark:text-red-400/50 dark:hover:text-red-300 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  form="signup-form"
                  size="lg"
                  className="h-12 w-full rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-extrabold shadow-[0_4px_25px_rgba(220,38,38,0.25)] hover:shadow-[0_4px_35px_rgba(220,38,38,0.45)] transition-all duration-300 transform hover:-translate-y-0.5 text-xs uppercase tracking-wider cursor-pointer mt-4 flex items-center justify-center gap-2"
                >
                  <span>Daftar Akun</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <form id="signup-form" action="/api/session/sign-up" method="post">
                  <input type="hidden" name="callbackURL" value="/dashboard" />
                </form>
              </div>
            )}

            {/* Footer Watermark */}
            <div className="mt-8 text-center text-[10px] text-red-500/50 dark:text-red-400/40 font-medium">
              &copy; {new Date().getFullYear()} Mie Jebew GDC. All rights reserved. <br/>
              Platform didukung oleh Next.js &amp; Better Auth.
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
