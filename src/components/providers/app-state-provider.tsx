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
  const [savedBills, setSavedBills] = useState<SavedBill[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("miejebew_saved_bills_v1");
    if (saved) {
      try {
        setSavedBills(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved bills", e);
      }
    }
  }, []);

  const persistBills = (newBills: SavedBill[]) => {
    setSavedBills(newBills);
    localStorage.setItem("miejebew_saved_bills_v1", JSON.stringify(newBills));
  };
  const sessionUserId = session?.user?.id ?? null;

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

  function saveBill(name: string) {
    if (cartLines.length === 0) return;

    const newBill: SavedBill = {
      id: Math.random().toString(36).substring(2, 9),
      name: name,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      items: cartLines.map(line => ({
        id: line.id,
        productId: line.product.id,
        quantity: line.quantity,
        spicyLevel: line.spicyLevel,
        toppings: line.toppings,
        product: line.product,
        sellPrice: line.product.sellPrice
      }))
    };

    const newBills = [newBill, ...savedBills];
    persistBills(newBills);

    setState((current) => ({
      ...current,
      cart: []
    }));
  }

  function loadBill(id: string) {
    const billToLoad = savedBills.find(b => b.id === id);
    if (!billToLoad) return;

    const cartItemsToLoad = billToLoad.items.map((item: any) => ({
      id: item.id || `${item.productId}-lvl${item.spicyLevel || 0}-${(item.toppings || []).sort().join(",")}`,
      productId: item.productId,
      quantity: item.quantity,
      spicyLevel: item.spicyLevel ?? 0,
      toppings: item.toppings ?? []
    }));

    setState((current) => ({
      ...current,
      cart: cartItemsToLoad
    }));

    const newBills = savedBills.filter(b => b.id !== id);
    persistBills(newBills);
  }

  function deleteBill(id: string) {
    const newBills = savedBills.filter(b => b.id !== id);
    persistBills(newBills);
  }

  return (
    <AppStateContext.Provider
      value={{
        ...state,
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
        savedBills,
        saveBill,
        loadBill,
        deleteBill,
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
