"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { emptyAppState } from "@/lib/empty-state";
import { AppState, Debt, DebtDraft, PaymentMethod, Product, ProductDraft, SavedBill, Settings, Transaction } from "@/lib/types";
import { calculateItemUnitPrice } from "@/lib/pricing";
import { showLocalNotification } from "@/lib/capacitor/notifications";
import { toast } from "sonner";

type CartLine = {
  id: string;
  product: Product;
  quantity: number;
  lineTotal: number;
  spicyLevel: number;
  toppings: string[];
  filling?: string;
  size?: string;
};

type AppStateContextValue = AppState & {
  userId: string | null;
  cartLines: CartLine[];
  cartTotal: number;
  lowStockProducts: Product[];
  addToCart: (productId: string, spicyLevel?: number, toppings?: string[], filling?: string, size?: string) => void;
  updateCartQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  checkout: (txData: { customerName?: string; paymentMethod?: PaymentMethod; amountPaid?: number; change?: number }) => Promise<Transaction | null>;
  addProduct: (draft: ProductDraft) => Promise<void>;
  updateProduct: (productId: string, draft: ProductDraft) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  restockProduct: (productId: string, quantity: number) => Promise<void>;
  addDebt: (draft: DebtDraft) => Promise<void>;
  markDebtPaid: (debtId: string) => Promise<void>;
  sendDebtReminder: (debtId: string) => Promise<Debt | null>;
  updateSettings: (settings: Settings) => Promise<void>;
  resetWorkspace: () => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  deleteTransactionsBulk: (transactionIds: string[]) => Promise<void>;
  updateTransaction: (transactionId: string, payload: { paymentMethod?: PaymentMethod; createdAt?: string }) => Promise<void>;
  savedBills: SavedBill[];
  saveBill: (name: string) => void;
  loadBill: (id: string) => void;
  deleteBill: (id: string) => void;
  addExpense: (draft: { title: string; amount: number; category: string }) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  bootstrapReady: boolean;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await response.json().catch(() => null)) as T & { error?: string } | null;

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("UNAUTHORIZED");
    }

    throw new Error(data?.error ?? "Permintaan ke server gagal.");
  }

  return data as T;
}

// Keep a global reference to prevent garbage collection of SpeechSynthesisUtterance in Android WebViews
let activeUtterance: any = null;

export function AppStateProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AppState>(emptyAppState);
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const { data: session, isPending } = useSession();
  const sessionUserId = session?.user?.id ?? null;

  // Hydrate lightweight cached settings from local storage so the first paint isn't empty
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedStoreName = localStorage.getItem('last_logged_in_store_name');
      const savedLogo = localStorage.getItem('last_logged_in_store_logo');
      const savedOwner = localStorage.getItem('last_logged_in_owner_name');
      const savedPayment = localStorage.getItem('last_logged_in_payment_method');
      setState((current) => ({
        ...current,
        settings: {
          ...current.settings,
          storeName: current.settings.storeName || savedStoreName || '',
          merchantName: savedStoreName || current.settings.merchantName || '',
          userProfileImage: savedLogo || current.settings.userProfileImage || '',
          ownerName: savedOwner || current.settings.ownerName || '',
          userProfileName: savedOwner || current.settings.userProfileName || '',
        },
        paymentMethod: (savedPayment as PaymentMethod) || current.paymentMethod || 'Tunai',
      }));
    } catch {
      // ignore hydration errors on restricted storage
    }
  }, []);

  // Global browser audio unlock listener to bypass modern browser autoplay blocks
  useEffect(() => {
    const unlockAudio = () => {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      try {
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            // Play a silent note to activate the audio hardware channel
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, ctx.currentTime);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.01);
            setTimeout(() => {
              try {
                if (ctx.state !== 'closed') ctx.close();
              } catch (err) {}
            }, 100);
          });
        } else {
          try {
            if (ctx.state !== 'closed') ctx.close();
          } catch (err) {}
        }
        // Speak a silent empty utterance to pre-unlock the speech synthesis engine
        if ('speechSynthesis' in window) {
          const silentUtterance = new SpeechSynthesisUtterance("");
          silentUtterance.volume = 0;
          window.speechSynthesis.speak(silentUtterance);
        }
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      } catch (e) {
        console.error('Audio unlock failed', e);
      }
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  useEffect(() => {
    // Load active cart from localStorage
    const savedCart = localStorage.getItem("miejebew_active_cart_v1");
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setState((current) => ({
          ...current,
          cart: parsedCart,
        }));
      } catch (e) {
        console.error("Failed to parse active cart", e);
      }
    } else {
      // Clear checkout name if there is no active cart
      localStorage.removeItem("miejebew_checkout_customer_name");
    }
  }, []);

  useEffect(() => {
    if (state !== emptyAppState) {
      localStorage.setItem("miejebew_active_cart_v1", JSON.stringify(state.cart));
    }
  }, [state.cart]);

  // Polling for saved bills to detect new table self-orders
  useEffect(() => {
    // DO NOT poll or play merchant notifications if on the customer self-order page
    if (!sessionUserId || pathname?.includes("/order/")) return;

    const interval = setInterval(async () => {
      try {
        const response = await requestJson<{ savedBills: SavedBill[] }>("/api/saved-bills");
        
        if (response.savedBills.length > state.savedBills.length) {
          await showLocalNotification({
            title: 'Pesanan Baru',
            body: `Ada pesanan masuk dari meja. Total bill saat ini: ${response.savedBills.length}`,
            id: 101,
          });
        }
        
        setState((current) => {
          // Compare length of incoming bills with current bills to play audio alert
          if (response.savedBills.length > current.savedBills.length) {

            // Play Gojek/Shopee style cheerful marimba arpeggio tune (rich bell tone + loud gain + autoplay bypass)
            // Play Upgraded Exciting Beat and Indonesian Female Voice Overlay (repeats exactly 5 times)
            // Play Upgraded Exciting K-Pop Style Beat and Indonesian Female Voice Overlay (repeats exactly 5 times)
            const playOrderIncomingMelody = () => {
              const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
              if (!AudioContext) return;
              try {
                // Cancel any ongoing speaking to clear previous speech queues
                if ('speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }

                const ctx = new AudioContext();
                if (ctx.state === 'suspended') {
                  ctx.resume();
                }

                // Pre-generate a white noise buffer for crisp K-Pop handclaps
                const sampleRate = ctx.sampleRate;
                const bufferSize = sampleRate * 0.15; // 150ms clap burst
                const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
                const data = noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                  data[i] = Math.random() * 2 - 1;
                }

                // 1. Synthesize a single exciting K-Pop bubblegum beat + chord progression pattern
                const playBeatSequence = (startTimeOffset: number) => {
                  // Synthetic kick drum (bouncy pop bass drum)
                  const playKick = (time: number) => {
                    try {
                      const osc = ctx.createOscillator();
                      const gain = ctx.createGain();
                      osc.type = "sine";
                      osc.frequency.setValueAtTime(140, ctx.currentTime + startTimeOffset + time);
                      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + startTimeOffset + time + 0.12);
                      
                      gain.gain.setValueAtTime(0.9, ctx.currentTime + startTimeOffset + time);
                      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTimeOffset + time + 0.12);
                      
                      osc.connect(gain);
                      gain.connect(ctx.destination);
                      osc.start(ctx.currentTime + startTimeOffset + time);
                      osc.stop(ctx.currentTime + startTimeOffset + time + 0.13);
                    } catch (err) {
                      console.error("Kick error", err);
                    }
                  };

                  // Crisp retro K-Pop Handclap ("Tish!")
                  const playClap = (time: number) => {
                    try {
                      const noiseSource = ctx.createBufferSource();
                      noiseSource.buffer = noiseBuffer;
                      
                      // Bandpass filter to sculpt white noise into a tight handclap (1300Hz)
                      const filter = ctx.createBiquadFilter();
                      filter.type = "bandpass";
                      filter.frequency.value = 1300;
                      filter.Q.value = 4.0;
                      
                      const gain = ctx.createGain();
                      gain.gain.setValueAtTime(0.35, ctx.currentTime + startTimeOffset + time);
                      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTimeOffset + time + 0.09);
                      
                      noiseSource.connect(filter);
                      filter.connect(gain);
                      gain.connect(ctx.destination);
                      noiseSource.start(ctx.currentTime + startTimeOffset + time);
                    } catch (err) {
                      console.error("Clap error", err);
                    }
                  };

                  // Bubblegum K-Pop Lead Synthesizer (square wave + lowpass sweep + warm triangle backing)
                  const playSynthNode = (freq: number, time: number, dur: number, gainVal: number) => {
                    try {
                      // Square wave for retro/cute K-Pop lead
                      const osc1 = ctx.createOscillator();
                      const filter1 = ctx.createBiquadFilter();
                      const gain1 = ctx.createGain();
                      
                      osc1.type = "square";
                      osc1.frequency.setValueAtTime(freq, ctx.currentTime + startTimeOffset + time);
                      
                      filter1.type = "lowpass";
                      filter1.frequency.setValueAtTime(3500, ctx.currentTime + startTimeOffset + time);
                      filter1.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + startTimeOffset + time + dur);
                      
                      gain1.gain.setValueAtTime(0.001, ctx.currentTime + startTimeOffset + time);
                      gain1.gain.exponentialRampToValueAtTime(gainVal * 0.45, ctx.currentTime + startTimeOffset + time + 0.02);
                      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTimeOffset + time + dur);
                      
                      osc1.connect(filter1);
                      filter1.connect(gain1);
                      gain1.connect(ctx.destination);
                      
                      osc1.start(ctx.currentTime + startTimeOffset + time);
                      osc1.stop(ctx.currentTime + startTimeOffset + time + dur);

                      // Triangle wave harmony octave for body and sweetness
                      const osc2 = ctx.createOscillator();
                      const gain2 = ctx.createGain();
                      osc2.type = "triangle";
                      osc2.frequency.setValueAtTime(freq / 2, ctx.currentTime + startTimeOffset + time);
                      
                      gain2.gain.setValueAtTime(0.001, ctx.currentTime + startTimeOffset + time);
                      gain2.gain.exponentialRampToValueAtTime(gainVal * 0.35, ctx.currentTime + startTimeOffset + time + 0.02);
                      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTimeOffset + time + dur);
                      
                      osc2.connect(gain2);
                      gain2.connect(ctx.destination);
                      
                      osc2.start(ctx.currentTime + startTimeOffset + time);
                      osc2.stop(ctx.currentTime + startTimeOffset + time + dur);
                    } catch (err) {
                      console.error("Synth node error", err);
                    }
                  };

                  // Driving K-Pop Synth Bassline (deep sine)
                  const playBassLine = (freq: number, time: number, dur: number) => {
                    try {
                      const osc = ctx.createOscillator();
                      const gain = ctx.createGain();
                      osc.type = "sine";
                      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTimeOffset + time);
                      
                      gain.gain.setValueAtTime(0.001, ctx.currentTime + startTimeOffset + time);
                      gain.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + startTimeOffset + time + 0.03);
                      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTimeOffset + time + dur);
                      
                      osc.connect(gain);
                      gain.connect(ctx.destination);
                      
                      osc.start(ctx.currentTime + startTimeOffset + time);
                      osc.stop(ctx.currentTime + startTimeOffset + time + dur);
                    } catch (err) {
                      console.error("Bass error", err);
                    }
                  };

                  // --- RHYTHM COMPOSITION & SEQUENCER (1.8s loop at ~133 BPM, 4 beats of ~0.45s) ---
                  
                  // Beat 1: Driving Kick + F-Major Chord (F5: 698.46Hz, A5: 880.00Hz, C6: 1046.50Hz) + Bass F3 (174.61Hz)
                  playKick(0.0);
                  playBassLine(174.61, 0.0, 0.20);
                  playSynthNode(698.46, 0.0, 0.18, 0.35); // F5
                  playSynthNode(880.00, 0.0, 0.18, 0.35); // A5
                  playSynthNode(1046.50, 0.0, 0.18, 0.35); // C6

                  // Syncopated Bass / Beat 1.5: Bass F3 + Bouncy Melody Lead G6 (1567.98Hz)
                  playBassLine(174.61, 0.22, 0.15);
                  playSynthNode(1567.98, 0.22, 0.15, 0.35); // G6

                  // Beat 2: Driving Kick + Sharp Handclap + Bass F3 + Melody Lead A6 (1760.00Hz)
                  playKick(0.45);
                  playClap(0.45);
                  playBassLine(174.61, 0.45, 0.20);
                  playSynthNode(1760.00, 0.45, 0.18, 0.40); // A6

                  // Beat 2.5: Melody Peak C7 (2093.00Hz) (Sparkling high notes popular in K-pop hooks)
                  playSynthNode(2093.00, 0.67, 0.18, 0.45); // C7

                  // Beat 3: Driving Kick + C-Major Chord (G5: 783.99Hz, C6: 1046.50Hz, E6: 1318.51Hz) + Bass C3 (130.81Hz)
                  playKick(0.90);
                  playBassLine(130.81, 0.90, 0.20);
                  playSynthNode(783.99, 0.90, 0.18, 0.35);  // G5
                  playSynthNode(1046.50, 0.90, 0.18, 0.35); // C6
                  playSynthNode(1318.51, 0.90, 0.18, 0.35); // E6

                  // Syncopated Bass / Beat 3.5: Bass C3 + Melody Lead D6 (1174.66Hz)
                  playBassLine(130.81, 1.12, 0.15);
                  playSynthNode(1174.66, 1.12, 0.15, 0.35); // D6

                  // Beat 4: Driving Kick + Sharp Handclap + Bass C3 + Melody Lead E6 (1318.51Hz)
                  playKick(1.35);
                  playClap(1.35);
                  playBassLine(130.81, 1.35, 0.20);
                  playSynthNode(1318.51, 1.35, 0.18, 0.40); // E6

                  // Beat 4.5: Melodic Sweet Resolution G6 (1567.98Hz)
                  playSynthNode(1567.98, 1.57, 0.18, 0.40); // G6
                };

                // 2. Play the Indonesian Female Voice overlay (using bulletproof Audio + SpeechSynthesis fallback)
                const speakVoiceOverlay = (startTimeOffset: number) => {
                  setTimeout(() => {
                    const text = "Ada pesanan diterima";
                    const ttsUrl = `/api/tts?text=${encodeURIComponent(text)}`;
                    
                    try {
                      // Attempt playing high-quality pre-rendered Google TTS audio first (100% reliable in APK/WebViews)
                      const audio = new Audio(ttsUrl);
                      audio.volume = 1.0;
                      
                      const playPromise = audio.play();
                      if (playPromise !== undefined) {
                        playPromise.catch((audioErr) => {
                          console.warn("Audio TTS failed, falling back to SpeechSynthesis", audioErr);
                          playNativeSpeechSynthesis(text);
                        });
                      }
                    } catch (err) {
                      console.warn("Audio creation failed, falling back to SpeechSynthesis", err);
                      playNativeSpeechSynthesis(text);
                    }
                  }, startTimeOffset * 1000 + 200); // Trigger 0.2s after the kick beat starts
                };

                const playNativeSpeechSynthesis = (text: string) => {
                  if (!('speechSynthesis' in window)) return;
                  try {
                    window.speechSynthesis.cancel();
                    if (window.speechSynthesis.paused) {
                      window.speechSynthesis.resume();
                    }

                    // Assign to global variable to prevent garbage collection inside Android Webview / APK
                    activeUtterance = new SpeechSynthesisUtterance(text);
                    activeUtterance.lang = "id-ID";
                    
                    const voices = window.speechSynthesis.getVoices();
                    const indonesianVoice = voices.find((v: any) => 
                      v.lang.toLowerCase().includes("id-id") || v.lang.toLowerCase().startsWith("id")
                    );
                    if (indonesianVoice) {
                      activeUtterance.voice = indonesianVoice;
                    }
                    activeUtterance.rate = 1.05; // Quick and professional tempo
                    activeUtterance.pitch = 1.15; // Bright, clear female pitch curve
                    activeUtterance.volume = 1.0; // Loud volume
                    
                    activeUtterance.onend = () => {
                      activeUtterance = null;
                    };
                    activeUtterance.onerror = () => {
                      activeUtterance = null;
                    };

                    window.speechSynthesis.speak(activeUtterance);
                  } catch (speechErr) {
                    console.error("Native Speech fallback error", speechErr);
                  }
                };

                // Play the combined K-Pop loop sequence once (1.8 seconds)
                playBeatSequence(0);
                speakVoiceOverlay(0);

                // Auto-close AudioContext after 2.5 seconds to prevent memory leaks and max AudioContexts crash
                setTimeout(() => {
                  try {
                    if (ctx.state !== 'closed') {
                      ctx.close();
                    }
                  } catch (closeErr) {
                    console.error("Error closing AudioContext", closeErr);
                  }
                }, 2500);
              } catch (e) {
                console.error("Upgraded audio engine error", e);
              }
            };
            playOrderIncomingMelody();
          }

          return {
            ...current,
            savedBills: response.savedBills,
          };
        });
      } catch (err) {
        console.error("Failed to poll saved bills", err);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [sessionUserId]);

  useEffect(() => {
    if (isPending) {
      return;
    }

    if (!sessionUserId) {
      return;
    }

    let isActive = true;

    void requestJson<{ appState: AppState }>("/api/bootstrap")
      .then((response) => {
        if (!isActive) {
          return;
        }

        setState((current) => ({
          ...response.appState,
          cart: current.cart,
          paymentMethod: (response.appState.settings.enabledPayments || []).includes(current.paymentMethod)
            ? current.paymentMethod
            : (response.appState.paymentMethod || "Tunai"),
        }));
        setBootstrapReady(true);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          setState(emptyAppState);
          router.replace("/auth");
        } else {
          console.error("Bootstrap error:", error);
          toast.error("Gagal sinkronisasi data dengan server: " + (error instanceof Error ? error.message : String(error)));
        }
      });

    return () => {
      isActive = false;
    };
  }, [isPending, router, sessionUserId]);

  const cartLines = state.cart.flatMap((line) => {
    let product = state.products.find((item) => item.id === line.productId);
    
    // In-memory fallback mock for dynamic promo Jasmine Tea product
    if (!product && line.productId === "promo_jasmine_tea") {
      const isCabang2 = state.settings.branchCode === "CABANG_2";
      const branchCode = isCabang2 ? "CABANG_2" : "CABANG_1";
      const nonPromoTotal = state.cart
        .filter(it => it.productId !== "promo_jasmine_tea")
        .reduce((sum, line) => {
          const p = state.products.find(item => item.id === line.productId);
          if (!p) return sum;
          const level = line.spicyLevel ?? 0;
          const toppings = line.toppings ?? [];
          const filling = line.filling;
          const size = line.size;
          
          const linePrice = calculateItemUnitPrice(
            p.sellPrice,
            p.category,
            p.name,
            { spicyLevel: level, toppings, filling, size },
            branchCode
          );
          return sum + linePrice * line.quantity;
        }, 0);

      const isVip = nonPromoTotal >= 50000;
      product = {
        id: "promo_jasmine_tea",
        name: isCabang2
          ? (isVip ? "Es Teh Manis [PROMO]" : "Es Teh Tawar [PROMO]")
          : "Qalla Tea (Jasmine Tea) [PROMO]",
        category: isCabang2 ? "Tea Series" : "Qalla Tea",
        sellPrice: 0,
        stock: 999999,
        minimumStock: 0,
        imageUrl: "",
      } as any;
    }

    if (!product) {
      return [];
    }

    const level = line.spicyLevel ?? 0;
    const toppings = line.toppings ?? [];
    const filling = line.filling;
    const size = line.size;
    const isCabang2 = state.settings.branchCode === "CABANG_2";
    const branchCode = isCabang2 ? "CABANG_2" : "CABANG_1";
    const sellPrice = calculateItemUnitPrice(
      product.sellPrice,
      product.category,
      product.name,
      { spicyLevel: level, toppings, filling, size },
      branchCode
    );

    return [
      {
        id: line.id || `${line.productId}-lvl${level}-${[...toppings].sort().join(",")}${filling ? `-${filling}` : ""}${size ? `-${size}` : ""}`,
        product: {
          ...product,
          sellPrice,
        },
        quantity: line.quantity,
        lineTotal: sellPrice * line.quantity,
        spicyLevel: level,
        toppings,
        filling,
        size,
      },
    ];
  });

  const cartTotal = cartLines.reduce((sum, line) => sum + line.lineTotal, 0);

  const lowStockProducts = state.products.filter(
    (product) => product.stock <= Math.max(product.minimumStock, state.settings.stockAlertThreshold)
  );

  function addToCart(productId: string, spicyLevel: number = 0, toppings: string[] = [], filling?: string, size?: string) {
    setState((current) => {
      const product = current.products.find((item) => item.id === productId);
      if (!product || product.stock <= 0) {
        return current;
      }

      const level = spicyLevel;
      const sortedToppings = [...toppings].sort();
      const cartItemId = `${productId}-lvl${level}-${sortedToppings.join(",")}${filling ? `-${filling}` : ""}${size ? `-${size}` : ""}`;

      const existing = current.cart.find((item) => item.id === cartItemId);
      const nextCart = existing
        ? current.cart.map((item) =>
            item.id === cartItemId
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + 1, product.stock),
                }
              : item
          )
        : [
            ...current.cart,
            {
              id: cartItemId,
              productId,
              quantity: 1,
              spicyLevel: level,
              toppings: sortedToppings,
              filling,
              size,
            },
          ];

      return {
        ...current,
        cart: nextCart,
      };
    });
  }

  function updateCartQuantity(id: string, quantity: number) {
    setState((current) => {
      const cartItem = current.cart.find((item) => item.id === id);
      if (!cartItem) {
        return current;
      }
      const product = current.products.find((item) => item.id === cartItem.productId);
      if (!product) {
        return current;
      }

      const nextQuantity = Math.max(0, Math.min(quantity, product.stock));
      return {
        ...current,
        cart:
          nextQuantity === 0
            ? current.cart.filter((item) => item.id !== id)
            : current.cart.map((item) =>
                item.id === id ? { ...item, quantity: nextQuantity } : item
              ),
      };
    });
  }

  function removeFromCart(id: string) {
    setState((current) => ({
      ...current,
      cart: current.cart.filter((item) => item.id !== id),
    }));
  }

  function setPaymentMethod(method: PaymentMethod) {
    setState((current) => ({
      ...current,
      paymentMethod: method,
    }));
  }

  async function checkout(txData: { customerName?: string; paymentMethod?: PaymentMethod; amountPaid?: number; change?: number }) {
    if (state.cart.length === 0) {
      return null;
    }

    const response = await requestJson<{
      transaction: Transaction;
      products: Product[];
    }>("/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        paymentMethod: txData.paymentMethod || state.paymentMethod,
        customerName: txData.customerName || "Umum",
        amountPaid: txData.amountPaid,
        change: txData.change,
        items: state.cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          spicyLevel: item.spicyLevel ?? 0,
          toppings: item.toppings ?? [],
          filling: item.filling,
          size: item.size,
        })),
      }),
    });

    setState((current) => ({
      ...current,
      cart: [],
      transactions: [response.transaction, ...current.transactions],
      products: response.products,
    }));

    const transaction = response.transaction;
    return transaction;
  }

  async function addProduct(draft: ProductDraft) {
    const response = await requestJson<{ product: Product }>("/api/products", {
      method: "POST",
      body: JSON.stringify(draft),
    });

    setState((current) => ({
      ...current,
      products: [response.product, ...current.products],
    }));
  }

  async function updateProduct(productId: string, draft: ProductDraft) {
    const response = await requestJson<{ product: Product }>(`/api/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify(draft),
    });

    setState((current) => ({
      ...current,
      products: current.products.map((product) =>
        product.id === productId ? response.product : product
      ),
    }));
  }

  async function deleteProduct(productId: string) {
    await requestJson(`/api/products/${productId}`, {
      method: "DELETE",
    });

    setState((current) => ({
      ...current,
      products: current.products.filter((product) => product.id !== productId),
    }));
  }

  async function restockProduct(productId: string, quantity: number) {
    const response = await requestJson<{ product: Product }>(
      `/api/products/${productId}/restock`,
      {
        method: "POST",
        body: JSON.stringify({ quantity }),
      }
    );

    setState((current) => ({
      ...current,
      products: current.products.map((product) =>
        product.id === productId ? response.product : product
      ),
    }));
  }

  async function addDebt(draft: DebtDraft) {
    const response = await requestJson<{ debt: Debt }>("/api/debts", {
      method: "POST",
      body: JSON.stringify(draft),
    });

    setState((current) => ({
      ...current,
      debts: [response.debt, ...current.debts],
    }));
  }

  async function markDebtPaid(debtId: string) {
    const response = await requestJson<{ debt: Debt }>(`/api/debts/${debtId}`, {
      method: "PATCH",
      body: JSON.stringify({ isPaid: true }),
    });

    setState((current) => ({
      ...current,
      debts: current.debts.map((debt) =>
        debt.id === debtId ? response.debt : debt
      ),
    }));
  }

  async function sendDebtReminder(debtId: string) {
    const response = await requestJson<{ debt: Debt }>(`/api/debts/${debtId}/remind`, {
      method: "POST",
    });

    setState((current) => ({
      ...current,
      debts: current.debts.map((debt) =>
        debt.id === debtId ? response.debt : debt
      ),
    }));

    return response.debt;
  }

  async function updateSettings(settings: Settings) {
    const response = await requestJson<{ settings: Settings }>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });

    setState((current) => ({
      ...current,
      paymentMethod: response.settings.enabledPayments.includes(current.paymentMethod)
        ? current.paymentMethod
        : response.settings.enabledPayments[0] ?? "Tunai",
      settings: response.settings,
    }));
  }

  async function resetWorkspace() {
    const response = await requestJson<{ appState: AppState }>("/api/bootstrap/reset", {
      method: "POST",
    });
    setState((current) => ({
      ...response.appState,
      cart: [],
      paymentMethod: response.appState.settings.enabledPayments.includes(current.paymentMethod)
        ? current.paymentMethod
        : response.appState.paymentMethod,
    }));
  }

  async function deleteTransaction(transactionId: string) {
    const response = await requestJson<{ products: Product[] }>(`/api/transactions/${transactionId}`, {
      method: "DELETE",
    });

    setState((current) => ({
      ...current,
      transactions: current.transactions.filter((tx) => tx.id !== transactionId),
      products: response.products,
    }));
  }

  async function deleteTransactionsBulk(transactionIds: string[]) {
    let finalProducts = state.products;
    for (const id of transactionIds) {
      try {
        const response = await requestJson<{ products: Product[] }>(`/api/transactions/${id}`, {
          method: "DELETE",
        });
        finalProducts = response.products;
      } catch (e) {
        console.error("Gagal menghapus transaksi bulk:", id, e);
      }
    }

    setState((current) => ({
      ...current,
      transactions: current.transactions.filter((tx) => !transactionIds.includes(tx.id)),
      products: finalProducts,
    }));
  }

  async function updateTransaction(transactionId: string, payload: { paymentMethod?: PaymentMethod; createdAt?: string }) {
    const response = await requestJson<{ transaction: Transaction }>(`/api/transactions/${transactionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    setState((current) => ({
      ...current,
      transactions: current.transactions.map((tx) =>
        tx.id === transactionId ? { ...tx, ...response.transaction } : tx
      ),
    }));
  }

  async function saveBill(name: string) {
    if (cartLines.length === 0) return;

    const newBillItems = cartLines.map(line => ({
      id: line.id,
      productId: line.product.id,
      quantity: line.quantity,
      spicyLevel: line.spicyLevel,
      toppings: line.toppings,
      product: line.product,
      sellPrice: line.product.sellPrice
    }));

    const response = await requestJson<{ savedBill: SavedBill }>("/api/saved-bills", {
      method: "POST",
      body: JSON.stringify({ name, items: newBillItems }),
    });

    setState((current) => ({
      ...current,
      savedBills: [response.savedBill, ...current.savedBills],
      cart: []
    }));
  }

  async function loadBill(id: string) {
    const billToLoad = state.savedBills.find(b => b.id === id);
    if (!billToLoad) return;

    const cartItemsToLoad = billToLoad.items.map((item: any) => ({
      id: item.id || `${item.productId}-lvl${item.spicyLevel || 0}-${(item.toppings || []).sort().join(",")}${item.filling ? `-${item.filling}` : ""}${item.size ? `-${item.size}` : ""}`,
      productId: item.productId,
      quantity: item.quantity,
      spicyLevel: item.spicyLevel ?? 0,
      toppings: item.toppings ?? [],
      filling: item.filling,
      size: item.size
    }));

    // Delete it from the server
    await requestJson(`/api/saved-bills/${id}`, {
      method: "DELETE",
    });

    // Extract customer name / table from bill name and save to localStorage
    if (typeof window !== "undefined") {
      let nameToStore = billToLoad.name;
      // If it starts with a number followed by " - ", e.g. "5 - Andi", convert it to "Self Order 5 - Andi"
      if (/^\d+\s*-\s*/.test(nameToStore)) {
        nameToStore = "Self Order " + nameToStore;
      }
      localStorage.setItem("miejebew_checkout_customer_name", nameToStore);
    }

    setState((current) => ({
      ...current,
      cart: cartItemsToLoad,
      savedBills: current.savedBills.filter(b => b.id !== id)
    }));
  }

  async function deleteBill(id: string) {
    await requestJson(`/api/saved-bills/${id}`, {
      method: "DELETE",
    });

    setState((current) => ({
      ...current,
      savedBills: current.savedBills.filter(b => b.id !== id)
    }));
  }

  async function addExpense(draft: { title: string; amount: number; category: string }) {
    const response = await requestJson<{ expense: any }>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(draft),
    });

    setState((current) => ({
      ...current,
      expenses: [response.expense, ...current.expenses],
    }));
  }

  async function deleteExpense(expenseId: string) {
    await requestJson(`/api/expenses/${expenseId}`, {
      method: "DELETE",
    });

    setState((current) => ({
      ...current,
      expenses: current.expenses.filter((expense) => expense.id !== expenseId),
    }));
  }

  return (
    <AppStateContext.Provider
      value={{
        ...state,
        userId: sessionUserId,
        cartLines,
        cartTotal,
        lowStockProducts,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        setPaymentMethod,
        checkout,
        addProduct,
        updateProduct,
        deleteProduct,
        restockProduct,
        addDebt,
        markDebtPaid,
        sendDebtReminder,
        updateSettings,
        resetWorkspace,
        deleteTransaction,
        deleteTransactionsBulk,
        updateTransaction,
        savedBills: state.savedBills,
        saveBill,
        loadBill,
        deleteBill,
        addExpense,
        deleteExpense,
        bootstrapReady: bootstrapReady || !sessionUserId,
      }}
    >
      {typeof window !== "undefined" && !bootstrapReady && sessionUserId ? (
        <div className="w-full h-screen flex items-center justify-center bg-background text-slate-600">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-sm font-semibold tracking-wide uppercase">Memuat data kasir...</span>
          </div>
        </div>
      ) : (
        children
      )}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) {
    throw new Error("useAppState harus dipakai di dalam AppStateProvider.");
  }

  return value;
}
