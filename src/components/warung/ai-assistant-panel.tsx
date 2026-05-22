"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  ExternalLink,
  Mic,
  PackageSearch,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Tone = "default" | "warn" | "success";

type ToolResult = {
  ok: boolean;
  kind: "data" | "suggestion" | "action" | "navigation" | "info";
  title: string;
  summary?: string;
  rows?: Array<{ label: string; value: string; tone?: Tone }>;
  data?: unknown;
  message?: string;
  error?: string;
};

type ChatRecord = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type ServerMessage = {
  id: string;
  chatId: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolName: string | null;
  toolCallId: string | null;
  toolCalls: unknown;
  toolArgs: unknown;
  toolResult: ToolResult | null;
  createdAt: string;
};

const quickPrompts = [
  "Sisa stok semua produk?",
  "Untung minggu ini berapa?",
  "Pelanggan yang belum lunas?",
  "Rekomendasi restok untuk untung",
];

async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) {
    throw new Error(data?.error ?? `Permintaan gagal (${res.status}).`);
  }
  return data as T;
}

function MessageBubble({
  role,
  children,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex w-full", role === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%]",
          role === "user"
            ? "rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-[0_12px_28px_-22px_rgba(186,92,35,0.85)]"
            : "w-full"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function AssistantTextBubble({ text }: { text: string }) {
  return (
    <div className="rounded-3xl rounded-bl-md bg-card/80 px-4 py-2.5 text-sm whitespace-pre-wrap text-foreground ring-1 ring-foreground/10 backdrop-blur">
      {text}
    </div>
  );
}

function DataMessageCard({ result }: { result: ToolResult }) {
  return (
    <Card size="sm" className="bg-card/85 backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PackageSearch className="size-4" />
          </span>
          <div className="flex-1">
            <CardTitle>{result.title}</CardTitle>
            {result.summary ? (
              <CardDescription className="mt-0.5 text-xs">{result.summary}</CardDescription>
            ) : null}
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            DB
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {(result.rows ?? []).map((row, i) => (
          <div
            key={`${row.label}-${i}`}
            className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2"
          >
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <span
              className={cn(
                "text-sm font-medium",
                row.tone === "warn" && "text-amber-700",
                row.tone === "success" && "text-emerald-700"
              )}
            >
              {row.value}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SuggestionMessageCard({ result }: { result: ToolResult }) {
  const data = result.data as { narrative?: string } | null;
  return (
    <Card
      size="sm"
      className="border-primary/30 bg-gradient-to-br from-primary/10 via-card/80 to-amber-50/60 backdrop-blur"
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <CardTitle className="flex-1">{result.title}</CardTitle>
          <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-800">
            <TrendingUp className="size-3" />
            Saran
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {data?.narrative ? (
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Ringkasan
            </p>
            <p className="text-sm text-foreground">{data.narrative}</p>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Rekomendasi Aksi
          </p>
          {(result.rows ?? []).map((row, i) => (
            <div
              key={`${row.label}-${i}`}
              className="flex items-center justify-between rounded-lg bg-card/70 px-3 py-2 ring-1 ring-foreground/5"
            >
              <span className="text-sm">{row.label}</span>
              <span className="text-xs text-muted-foreground font-medium text-emerald-700">{row.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ActionMessageCard({
  toolName,
  result,
}: {
  toolName: string | null;
  result: ToolResult;
}) {
  return (
    <Card size="sm" className="border-emerald-300/50 bg-emerald-50/70 backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700">
            <Wallet className="size-4" />
          </span>
          <div className="flex-1">
            <CardTitle>{result.title}</CardTitle>
            {toolName ? (
              <CardDescription className="mt-0.5 font-mono text-[11px]">
                tool: {toolName}
              </CardDescription>
            ) : null}
          </div>
          <Badge variant="secondary" className="bg-emerald-200/70 text-emerald-900">
            Tereksekusi
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {result.summary ? (
          <p className="text-sm font-medium text-foreground">{result.summary}</p>
        ) : null}
        <div className="rounded-xl bg-card/70 p-2.5 ring-1 ring-emerald-200/70">
          {(result.rows ?? []).map((row, i) => (
            <div
              key={`${row.label}-${i}`}
              className="flex items-center justify-between gap-2 border-b border-dashed border-emerald-200/70 py-1 text-sm last:border-0"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span
                className={cn(
                  "font-medium",
                  row.tone === "warn" && "text-amber-700",
                  row.tone === "success" && "text-emerald-700"
                )}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-emerald-100/80 px-3 py-2 text-xs text-emerald-800">
          <Check className="size-3.5" />
          Aksi sudah disimpan ke database.
        </div>
      </CardContent>
    </Card>
  );
}

function InfoMessageCard({ result }: { result: ToolResult }) {
  return (
    <Card size="sm" className="bg-card/85 backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-lg",
              result.ok ? "bg-secondary text-secondary-foreground" : "bg-destructive/10 text-destructive"
            )}
          >
            {result.ok ? <BookOpen className="size-4" /> : <AlertTriangle className="size-4" />}
          </span>
          <CardTitle className="flex-1">{result.title}</CardTitle>
        </div>
      </CardHeader>
      {result.message || result.error ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">{result.message ?? result.error}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

function NavigationMessageCard({ result }: { result: ToolResult }) {
  const data = (result.data ?? {}) as { href?: string; label?: string };
  return (
    <Card size="sm" className="bg-card/85 backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <ChevronRight className="size-4" />
          </span>
          <CardTitle className="flex-1">{result.title}</CardTitle>
        </div>
      </CardHeader>
      {data.href ? (
        <CardContent>
          <a
            href={data.href}
            className="group/nav flex w-full items-center justify-between rounded-xl bg-muted px-3 py-2.5 text-left transition-colors hover:bg-muted/70"
          >
            <div>
              <p className="text-xs text-muted-foreground">Tujuan</p>
              <p className="text-sm font-medium">{data.label ?? data.href}</p>
              <p className="text-[11px] font-mono text-muted-foreground">{data.href}</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover/nav:translate-x-0.5" />
          </a>
        </CardContent>
      ) : null}
    </Card>
  );
}

function ToolCard({ message }: { message: ServerMessage }) {
  const result = message.toolResult;
  if (!result) return null;
  switch (result.kind) {
    case "data":
      return <DataMessageCard result={result} />;
    case "suggestion":
      return <SuggestionMessageCard result={result} />;
    case "action":
      return <ActionMessageCard toolName={message.toolName} result={result} />;
    case "navigation":
      return <NavigationMessageCard result={result} />;
    case "info":
    default:
      return <InfoMessageCard result={result} />;
  }
}

function SetupWizardView({
  onStartOfflineSim,
  onRefresh,
  isLoading,
}: {
  onStartOfflineSim: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col h-full overflow-y-auto px-5 py-6 space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20">
          <AlertTriangle className="size-6 animate-bounce" />
        </div>
        <h3 className="font-heading text-base font-bold tracking-tight">AI Belum Dikonfigurasi</h3>
        <p className="text-xs text-muted-foreground max-w-[280px] mx-auto">
          Fitur Asisten Pintar MIE JEBEW GDC membutuhkan API Key dari OpenRouter agar dapat bekerja secara penuh.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Fungsi Asisten AI Pintar
        </h4>
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl bg-card/40 p-3 ring-1 ring-white/5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold">Tanya Jawab Pintar & Kontekstual</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Cek stok produk, estimasikan laba bersih mingguan, serta lihat siapa pelanggan kasbon teraktif secara natural.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-card/40 p-3 ring-1 ring-white/5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Wallet className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold">Catat Transaksi Instan via Chat</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Gunakan bahasa alami seperti &quot;restok es teh 20 porsi&quot; untuk langsung memodifikasi basis data warung Anda.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/20 bg-card/30 p-4 shadow-sm backdrop-blur-sm">
        <h4 className="text-xs font-bold flex items-center gap-1.5">
          <span className="flex size-5 items-center justify-center rounded-md bg-muted text-[10px] font-mono">1</span>
          Dapatkan API Key
        </h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Kunjungi situs{" "}
          <a
            href="https://openrouter.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline"
          >
            openrouter.ai <ExternalLink className="size-2.5" />
          </a>{" "}
          dan buatlah API Key baru (gratis / berbayar).
        </p>

        <h4 className="text-xs font-bold flex items-center gap-1.5 mt-4">
          <span className="flex size-5 items-center justify-center rounded-md bg-muted text-[10px] font-mono">2</span>
          Konfigurasi File .env
        </h4>
        <p className="text-xs text-muted-foreground">
          Buka file <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground border border-border/60">.env</code> di root folder proyek Anda, kemudian tambahkan baris berikut:
        </p>
        <div className="rounded-lg bg-zinc-950 p-2.5 font-mono text-[10px] text-zinc-300 ring-1 ring-white/10 select-all">
          OPENROUTER_API_KEY=key_anda_disini
        </div>

        <h4 className="text-xs font-bold flex items-center gap-1.5 mt-4">
          <span className="flex size-5 items-center justify-center rounded-md bg-muted text-[10px] font-mono">3</span>
          Restart Server
        </h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Matikan server Next.js Anda (tekan <code className="font-mono text-[11px]">Ctrl+C</code> pada terminal) kemudian jalankan kembali dengan perintah <code className="font-mono text-[11px]">npm run dev</code>.
        </p>
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <Button
          onClick={onStartOfflineSim}
          className="w-full rounded-2xl bg-gradient-to-r from-primary to-amber-600 text-white font-medium hover:opacity-95 shadow-[0_12px_30px_-15px_rgba(186,92,35,0.5)] transition-all"
        >
          <Sparkles className="size-4 mr-2" />
          Coba Simulasi Offline
        </Button>
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isLoading}
          className="w-full rounded-2xl border-white/60 bg-white/20 hover:bg-white/40 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <RefreshCw className={cn("size-4 mr-2", isLoading && "animate-spin")} />
          Perbarui Koneksi / Cek Ulang
        </Button>
      </div>
    </div>
  );
}

export function AIAssistantPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const [chat, setChat] = useState<ChatRecord | null>(null);
  const [messages, setMessages] = useState<ServerMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAiConfigured, setIsAiConfigured] = useState(true);
  const [isOfflineSimMode, setIsOfflineSimMode] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasBootstrappedRef = useRef(false);

  const bootstrap = useCallback(async () => {
    if (hasBootstrappedRef.current) return;
    hasBootstrappedRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const list = await api<{ chats: ChatRecord[]; isAiConfigured?: boolean }>("/api/ai/chats");
      setIsAiConfigured(list.isAiConfigured ?? true);
      let active = list.chats[0] ?? null;
      if (!active) {
        const created = await api<{ chat: ChatRecord }>("/api/ai/chats", {
          method: "POST",
          body: JSON.stringify({ title: "Percakapan baru" }),
        });
        active = created.chat;
      }
      setChat(active);
      const detail = await api<{ messages: ServerMessage[] }>(
        `/api/ai/chats/${active.id}/messages`
      );
      setMessages(detail.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat chat AI.");
      hasBootstrappedRef.current = false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void bootstrap();
  }, [open, bootstrap]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [open, messages, isThinking]);

  const handleRefreshConnection = async () => {
    hasBootstrappedRef.current = false;
    setIsLoading(true);
    toast.promise(bootstrap(), {
      loading: "Memeriksa konfigurasi OpenRouter...",
      success: "Status koneksi diperbarui!",
      error: "Gagal memeriksa konfigurasi.",
    });
  };

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || (!chat && !isOfflineSimMode) || isThinking) return;

    const optimistic: ServerMessage = {
      id: `local_${Date.now()}`,
      chatId: chat?.id ?? "mock-chat-id",
      role: "user",
      content: trimmed,
      toolName: null,
      toolCallId: null,
      toolCalls: null,
      toolArgs: null,
      toolResult: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setIsThinking(true);
    setError(null);

    if (isOfflineSimMode) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // typing simulation delay
        const query = trimmed.toLowerCase();
        let replyText = "";
        let toolResult: ToolResult | null = null;
        let toolName: string | null = null;

        if (query.includes("stok")) {
          replyText = "Berikut adalah daftar sisa stok produk yang menipis atau perlu perhatian Anda di MIE JEBEW GDC.";
          toolName = "checkStock";
          toolResult = {
            ok: true,
            kind: "data",
            title: "Sisa Stok Inventaris",
            summary: "Menampilkan produk terlaris dengan stok kritis",
            rows: [
              { label: "Mie Jebew Level 3", value: "5 porsi", tone: "warn" },
              { label: "Es Teh Manis", value: "48 gelas", tone: "success" },
              { label: "Keripik Pedas", value: "2 bungkus", tone: "warn" },
              { label: "Bakso Aci", value: "0 porsi", tone: "warn" },
            ],
          };
        } else if (query.includes("untung") || query.includes("laba")) {
          replyText = "Laporan keuntungan MIE JEBEW GDC minggu ini menunjukkan tren positif, terutama ditopang oleh penjualan kategori Mie.";
          toolName = "getWeeklyProfit";
          toolResult = {
            ok: true,
            kind: "data",
            title: "Laporan Keuntungan Mingguan",
            summary: "Estimasi laba bersih 7 hari terakhir",
            rows: [
              { label: "Total Pendapatan", value: "Rp 1.450.000", tone: "success" },
              { label: "Biaya Bahan Baku", value: "Rp 650.000", tone: "default" },
              { label: "Laba Bersih", value: "Rp 800.000", tone: "success" },
              { label: "Margin Laba", value: "55.1%", tone: "success" },
            ],
          };
        } else if (query.includes("hutang") || query.includes("kasbon") || query.includes("lunas")) {
          replyText = "Berikut adalah daftar pelanggan Buku Hutang yang belum melunasi kasbon mereka.";
          toolName = "getUnpaidDebts";
          toolResult = {
            ok: true,
            kind: "data",
            title: "Buku Hutang Aktif",
            summary: "Pelanggan dengan kasbon belum lunas",
            rows: [
              { label: "Pak Budi (08123456789)", value: "Rp 45.000 (Belum Lunas)", tone: "warn" },
              { label: "Bu Siti (08771234567)", value: "Rp 12.000 (Belum Lunas)", tone: "warn" },
              { label: "Kak Reza (08998765432)", value: "Rp 25.000 (Belum Lunas)", tone: "warn" },
            ],
          };
        } else if (query.includes("rekomendasi") || query.includes("restok") || query.includes("saran")) {
          replyText = "Berdasarkan analisis penjualan 30 hari terakhir, berikut adalah saran restok untuk memaksimalkan keuntungan Anda.";
          toolName = "getRestockRecommendations";
          toolResult = {
            ok: true,
            kind: "suggestion",
            title: "Rekomendasi Restok MIE JEBEW GDC",
            data: { narrative: "Mie Jebew Level 3 dan Bakso Aci memiliki perputaran paling cepat. Segera beli bahan baku tambahan untuk menghindari kehilangan potensi penjualan." },
            rows: [
              { label: "Mie Jebew Level 3", value: "Beli 50 porsi (+Rp 450.000 potensi laba)", tone: "success" },
              { label: "Bakso Aci", value: "Beli 30 porsi (+Rp 210.000 potensi laba)", tone: "success" },
              { label: "Keripik Pedas", value: "Beli 20 bungkus (+Rp 80.000 potensi laba)", tone: "success" },
            ],
          };
        } else {
          replyText = "Maaf, sebagai asisten simulasi offline, saya hanya memahami beberapa pertanyaan seputar:\n- 'stok' (Cek sisa stok)\n- 'untung' / 'laba' (Laporan keuntungan)\n- 'hutang' / 'kasbon' (Pelanggan belum lunas)\n- 'rekomendasi' / 'restok' (Saran restok)\n\nSilakan coba salah satu kata kunci tersebut!";
        }

        const replyMsg: ServerMessage = {
          id: `mock_assistant_${Date.now()}`,
          chatId: chat?.id ?? "mock-chat-id",
          role: "assistant",
          content: replyText,
          toolName: null,
          toolCallId: null,
          toolCalls: null,
          toolArgs: null,
          toolResult: null,
          createdAt: new Date().toISOString(),
        };

        const toolMsg: ServerMessage | null = toolResult ? {
          id: `mock_tool_${Date.now()}`,
          chatId: chat?.id ?? "mock-chat-id",
          role: "tool",
          content: "",
          toolName: toolName,
          toolCallId: `call_mock_${Date.now()}`,
          toolCalls: null,
          toolArgs: null,
          toolResult: toolResult,
          createdAt: new Date().toISOString(),
        } : null;

        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== optimistic.id);
          const next = [...filtered, optimistic, replyMsg];
          if (toolMsg) {
            next.push(toolMsg);
          }
          return next;
        });
      } catch (err) {
        console.error("Offline simulation error", err);
      } finally {
        setIsThinking(false);
      }
      return;
    }

    try {
      const res = await api<{ newMessages: ServerMessage[] }>(
        `/api/ai/chats/${chat!.id}/messages`,
        { method: "POST", body: JSON.stringify({ text: trimmed }) }
      );
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        ...res.newMessages,
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal mengirim pesan.";
      setError(message);
      toast.error(message);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setIsThinking(false);
    }
  }

  async function handleNewChat() {
    setIsLoading(true);
    setError(null);
    try {
      if (isOfflineSimMode) {
        setMessages([]);
        return;
      }
      const created = await api<{ chat: ChatRecord }>("/api/ai/chats", {
        method: "POST",
        body: JSON.stringify({ title: "Percakapan baru" }),
      });
      setChat(created.chat);
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat chat baru.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteChat() {
    if (isOfflineSimMode) {
      setMessages([]);
      toast.success("Riwayat percakapan simulasi dibersihkan!");
      return;
    }
    if (!chat) return;

    const confirmDelete = window.confirm(
      "Apakah Anda yakin ingin menghapus seluruh riwayat percakapan asisten AI ini secara permanen?"
    );
    if (!confirmDelete) return;

    setIsLoading(true);
    setError(null);
    try {
      await api(`/api/ai/chats/${chat.id}`, { method: "DELETE" });
      toast.success("Riwayat percakapan berhasil dihapus secara permanen!");
      
      // Reset state and fetch a fresh chat session
      setChat(null);
      setMessages([]);
      hasBootstrappedRef.current = false;
      await bootstrap();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus percakapan.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  const visibleMessages = messages.filter((m) => m.role !== "system");

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col overflow-hidden rounded-[28px] border border-white/60 bg-card/85 shadow-[0_38px_90px_-50px_rgba(68,39,20,0.7)] backdrop-blur-xl transition-[width] duration-200 ease-out",
        open ? "w-[380px] xl:w-[420px]" : "w-[64px]"
      )}
      aria-label="Asisten AI MIE JEBEW GDC"
    >
      {!open ? (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="group/rail flex h-full w-full flex-col items-center justify-center gap-3 px-2 py-4 text-foreground/80 transition-colors hover:bg-primary/5"
          aria-label="Buka asisten AI"
        >
          <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_18px_38px_-22px_rgba(186,92,35,0.85)] transition-transform group-hover/rail:scale-105">
            <Sparkles className="size-4" />
          </span>
          <span
            className="text-[11px] font-medium tracking-wide text-foreground/70"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Asisten AI
          </span>
          <span className="mt-auto rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 animate-pulse">
            ●
          </span>
        </button>
      ) : (
        <>
          <header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-heading text-sm font-semibold leading-tight truncate">
                {isOfflineSimMode ? "Simulasi MIE JEBEW GDC AI" : (chat?.title ?? "MIE JEBEW GDC AI")}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-[11px] text-muted-foreground">
                  Asisten kontekstual · OpenRouter
                </p>
                {isOfflineSimMode && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-200 text-[9px] font-semibold animate-pulse"
                    onClick={() => {
                      setIsOfflineSimMode(false);
                      toast.info("Mode simulasi dimatikan.");
                    }}
                    title="Klik untuk keluar dari mode simulasi"
                  >
                    Simulasi
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={handleDeleteChat}
              disabled={isLoading || isThinking || (!chat && !isOfflineSimMode)}
              aria-label="Hapus riwayat chat"
              title="Hapus riwayat chat"
            >
              <Trash2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleNewChat}
              disabled={isLoading || isThinking}
              aria-label="Mulai chat baru"
              title="Mulai chat baru"
            >
              <Plus className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              aria-label="Tutup asisten"
            >
              <X className="size-4" />
            </Button>
          </header>

          {!isAiConfigured && !isOfflineSimMode ? (
            <SetupWizardView
              onStartOfflineSim={() => {
                setIsOfflineSimMode(true);
                toast.success("Mode Simulasi Offline diaktifkan!");
              }}
              onRefresh={handleRefreshConnection}
              isLoading={isLoading}
            />
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="space-y-3 px-4 py-4">
                  {visibleMessages.length === 0 && !isLoading ? (
                    <MessageBubble role="assistant">
                      <AssistantTextBubble
                        text={
                          isOfflineSimMode
                            ? "Halo Bos! 🔥 Saya MIE JEBEW GDC AI (Mode Simulasi Offline). Di mode ini, Anda bisa tes kelancaran respon saya untuk cek stok, hitung untung, kasbon, atau saran restok.\n\nCobain ketik kata kunci di bawah atau masukkan pertanyaan seperti:\n👉 'stok' (Cek sisa stok)\n👉 'untung' (Laba minggu ini)\n👉 'kasbon' (Buku hutang)\n👉 'rekomendasi' (Saran restok cuan)"
                            : "Halo Bos! 🔥 Saya MIE JEBEW GDC AI, asisten pintar warung Anda yang paling 'jebew'! 😎\n\nSaya siap bantu kelola warung Anda jadi makin sat-set dan gampang. Ini beberapa hal seru yang bisa saya bantu:\n📦 Cek sisa stok bahan & produk\n💰 Pantau laba bersih & profit mingguan\n📝 Catat transaksi kasbon/hutang pelanggan biar gak lupa\n🚀 Beri saran restok paling cuan\n💸 Catat pengeluaran instan lewat chat!\n\nCobain tanya ke saya:\n👉 'Untung minggu ini berapa?'\n👉 'Siapa saja yang belum lunas kasbon?'\n👉 'Saran restok biar makin untung'\n\nYuk, ada yang mau dicek hari ini? 👇"
                        }
                      />
                    </MessageBubble>
                  ) : null}

                  {visibleMessages.map((m) => {
                    if (m.role === "user") {
                      return (
                        <MessageBubble key={m.id} role="user">
                          <span>{m.content}</span>
                        </MessageBubble>
                      );
                    }
                    if (m.role === "assistant") {
                      if (!m.content.trim()) return null;
                      return (
                        <MessageBubble key={m.id} role="assistant">
                          <AssistantTextBubble text={m.content} />
                        </MessageBubble>
                      );
                    }
                    if (m.role === "tool") {
                      return (
                        <MessageBubble key={m.id} role="assistant">
                          <ToolCard message={m} />
                        </MessageBubble>
                      );
                    }
                    return null;
                  })}

                  {isThinking ? (
                    <MessageBubble role="assistant">
                      <div className="inline-flex items-center gap-1.5 rounded-3xl rounded-bl-md bg-card/80 px-4 py-3 ring-1 ring-foreground/10">
                        <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-primary" />
                      </div>
                    </MessageBubble>
                  ) : null}

                  {error ? (
                    <div className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {error}
                    </div>
                  ) : null}
                  <div ref={bottomRef} aria-hidden className="h-px" />
                </div>
              </div>

              <div className="border-t border-border/60 bg-card/70 px-3 py-3">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {quickPrompts.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSend(q)}
                      disabled={isThinking || (!chat && !isOfflineSimMode)}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground/80 ring-1 ring-foreground/5 transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                    >
                      <ArrowRight className="size-3" />
                      {q}
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(input);
                      }
                    }}
                    placeholder="Tanya stok, untung, atau perintahkan tindakan…"
                    className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl bg-card/80 py-2.5"
                    rows={1}
                    disabled={!chat && !isOfflineSimMode}
                  />
                  <Button
                    variant="outline"
                    size="icon-lg"
                    className="rounded-2xl"
                    onClick={() => toast.info("Voice input belum tersedia.")}
                    aria-label="Rekam suara"
                  >
                    <Mic className="size-4" />
                  </Button>
                  <Button
                    size="icon-lg"
                    className="rounded-2xl"
                    onClick={() => handleSend(input)}
                    disabled={!input.trim() || isThinking || (!chat && !isOfflineSimMode)}
                    aria-label="Kirim pesan"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Aksi langsung tertulis ke database warung Anda.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </aside>
  );
}

