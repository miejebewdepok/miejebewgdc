"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { emptyAppState } from "@/lib/empty-state";
import { AppState, Debt, DebtDraft, PaymentMethod, Product, ProductDraft, SavedBill, Settings, Transaction } from "@/lib/types";

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

export function AppStateProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const [state, setState] = useState<AppState>(emptyAppState);
  const { data: session, isPending } = useSession();
  const sessionUserId = session?.user?.id ?? null;

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
          });
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
    if (!sessionUserId) return;

    const interval = setInterval(async () => {
      try {
        const response = await requestJson<{ savedBills: SavedBill[] }>("/api/saved-bills");
        
        setState((current) => {
          // Compare length of incoming bills with current bills to play audio alert
          if (response.savedBills.length > current.savedBills.length) {
            // Play Gojek/Shopee style cheerful marimba arpeggio tune (rich bell tone + loud gain + autoplay bypass)
            const playOrderIncomingMelody = () => {
              const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
              if (!AudioContext) return;
              try {
                const ctx = new AudioContext();
                if (ctx.state === 'suspended') {
                  ctx.resume();
                }
                const playChimeSequence = (startTimeOffset: number) => {
                  const notes = [
                    { freq: 523.25, time: 0.0, dur: 0.15 },   // C5
                    { freq: 659.25, time: 0.06, dur: 0.15 },  // E5
                    { freq: 783.99, time: 0.12, dur: 0.15 },  // G5
                    { freq: 1046.50, time: 0.18, dur: 0.2 },  // C6
                    { freq: 1318.51, time: 0.24, dur: 0.35 }   // E6
                  ];
                  notes.forEach((note) => {
                    // Base tone (Triangle wave for punchy full body)
                    const osc1 = ctx.createOscillator();
                    const gain1 = ctx.createGain();
                    osc1.type = "triangle";
                    osc1.frequency.setValueAtTime(note.freq, ctx.currentTime + startTimeOffset + note.time);
                    gain1.gain.setValueAtTime(0.001, ctx.currentTime + startTimeOffset + note.time);
                    gain1.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + startTimeOffset + note.time + 0.02); // 50% base gain (extremely clear)
                    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTimeOffset + note.time + note.dur);
                    osc1.connect(gain1);
                    gain1.connect(ctx.destination);
                    osc1.start(ctx.currentTime + startTimeOffset + note.time);
                    osc1.stop(ctx.currentTime + startTimeOffset + note.time + note.dur);

                    // High-harmonic tone (Sine wave octave harmonic for beautiful crystal marimba chime)
                    const osc2 = ctx.createOscillator();
                    const gain2 = ctx.createGain();
                    osc2.type = "sine";
                    osc2.frequency.setValueAtTime(note.freq * 2, ctx.currentTime + startTimeOffset + note.time);
                    gain2.gain.setValueAtTime(0.001, ctx.currentTime + startTimeOffset + note.time);
                    gain2.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + startTimeOffset + note.time + 0.02); // 30% bell sparkle
                    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTimeOffset + note.time + note.dur);
                    osc2.connect(gain2);
                    gain2.connect(ctx.destination);
                    osc2.start(ctx.currentTime + startTimeOffset + note.time);
                    osc2.stop(ctx.currentTime + startTimeOffset + note.time + note.dur);
                  });
                };
                // Play sequence 7 times over 5.6 seconds for optimal audibility (around 5 seconds)
                playChimeSequence(0.0);
                playChimeSequence(0.8);
                playChimeSequence(1.6);
                playChimeSequence(2.4);
                playChimeSequence(3.2);
                playChimeSequence(4.0);
                playChimeSequence(4.8);
              } catch (e) {
                console.error("Melody error", e);
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
          paymentMethod: response.appState.settings.enabledPayments.includes(current.paymentMethod)
            ? current.paymentMethod
            : response.appState.paymentMethod,
        }));
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          setState(emptyAppState);
          router.replace("/auth");
        }
      });

    return () => {
      isActive = false;
    };
  }, [isPending, router, sessionUserId]);

  const cartLines = state.cart.flatMap((line) => {
    const product = state.products.find((item) => item.id === line.productId);
    if (!product) {
      return [];
    }

    const level = line.spicyLevel ?? 0;
    const toppings = line.toppings ?? [];
    const filling = line.filling;
    const size = line.size;
    const isBypassed = ['Snack', 'Qalla Coffee', 'Qalla Tea'].includes(product.category);
    
    const spicySurcharge = isBypassed ? 0 : ((level === 4 || level === 5) ? 2000 : 0);
    
    // Special toppings cost: Beef Slice (+2,500), Keju Slice (+3,000), Telur (+4,000)
    const specialToppings = toppings.filter((t) => ["Beef Slice", "Keju Slice", "Telur"].includes(t));
    const standardToppings = toppings.filter((t) => !["Beef Slice", "Keju Slice", "Telur"].includes(t));

    const stdCount = standardToppings.length;
    const stdSurcharge = stdCount === 3 
      ? 5000 
      : (stdCount === 7 
        ? 10000 
        : stdCount * 2000);

    let specialSurcharge = 0;
    specialToppings.forEach((t) => {
      if (t === "Beef Slice") specialSurcharge += 2500;
      else if (t === "Telur") specialSurcharge += 4000;
      else if (t === "Keju Slice") specialSurcharge += 3000;
    });

    const toppingsSurcharge = isBypassed ? 0 : stdSurcharge + specialSurcharge;

    let fillingSurcharge = 0;
    if (!isBypassed) {
      if (product.category === 'Kebab') {
        if (size === 'REGULER') {
          if (filling === 'Beef') fillingSurcharge = 2000;
        } else if (size === 'LARGE') {
          if (filling === 'Beef Slice' || filling === 'Beef' || filling === 'Chicken Katsu') fillingSurcharge = 5000;
          else if (filling === 'Special') fillingSurcharge = 10000;
        }
      } else {
        if (filling === 'Beef Patty' || filling === 'Chicken Katsu') fillingSurcharge = 5000;
        else if (filling === 'Special') fillingSurcharge = 10000;
      }
    }

    const sellPrice = product.sellPrice + spicySurcharge + toppingsSurcharge + fillingSurcharge;

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
      }}
    >
      {children}
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
