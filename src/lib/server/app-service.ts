import { headers } from "next/headers";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, pool } from "@/db/client";
import {
  debts,
  expenses,
  products,
  storeProfiles,
  transactionItems,
  transactions,
  savedBills,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { AppState, DebtDraft, PaymentMethod, ProductDraft, Settings, Transaction } from "@/lib/types";
import { sendDebtReminderAlert, sendStockAlert } from "@/lib/server/whatsapp";

let initializationPromise: Promise<void> | null = null;
const supportedPaymentMethods: PaymentMethod[] = ["Tunai", "QRIS", "Transfer"];

type SessionHint = {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
  };
} | null;

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function parseDueDate(value: string) {
  if (value.includes("T")) {
    return new Date(value).toISOString();
  }

  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS store_profiles (
      user_id text PRIMARY KEY,
      store_name text NOT NULL,
      store_tagline text NOT NULL,
      store_address text NOT NULL,
      owner_name text NOT NULL,
      owner_whatsapp text NOT NULL,
      city text NOT NULL,
      business_notes text NOT NULL,
      stock_alert_threshold integer NOT NULL,
      enabled_payments jsonb NOT NULL,
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      name text NOT NULL,
      category text NOT NULL,
      buy_price integer NOT NULL,
      sell_price integer NOT NULL,
      stock integer NOT NULL,
      minimum_stock integer NOT NULL,
      description text NOT NULL,
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      total integer NOT NULL,
      payment_method text NOT NULL,
      created_at timestamptz NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transaction_items (
      id text PRIMARY KEY,
      transaction_id text NOT NULL,
      product_id text NOT NULL,
      product_name text NOT NULL,
      quantity integer NOT NULL,
      unit_price integer NOT NULL,
      cost_price integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS debts (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      borrower_name text NOT NULL,
      whatsapp text NOT NULL,
      amount integer NOT NULL,
      created_at timestamptz NOT NULL,
      due_date timestamptz NOT NULL,
      is_paid integer NOT NULL,
      last_reminder_at timestamptz
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      title text NOT NULL,
      amount integer NOT NULL,
      created_at timestamptz NOT NULL,
      category text NOT NULL
    );

    ALTER TABLE store_profiles
      ADD COLUMN IF NOT EXISTS store_tagline text NOT NULL DEFAULT '';

    ALTER TABLE store_profiles
      ADD COLUMN IF NOT EXISTS store_address text NOT NULL DEFAULT '';

    ALTER TABLE store_profiles
      ADD COLUMN IF NOT EXISTS business_notes text NOT NULL DEFAULT '';

    CREATE TABLE IF NOT EXISTS ai_chats (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      title text NOT NULL,
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL
    );

    CREATE INDEX IF NOT EXISTS ai_chats_user_idx ON ai_chats(user_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS ai_messages (
      id text PRIMARY KEY,
      chat_id text NOT NULL,
      user_id text NOT NULL,
      role text NOT NULL,
      content text NOT NULL,
      tool_name text,
      tool_call_id text,
      tool_calls jsonb,
      tool_args jsonb,
      tool_result jsonb,
      created_at timestamptz NOT NULL
    );

    CREATE INDEX IF NOT EXISTS ai_messages_chat_idx ON ai_messages(chat_id, created_at);

    ALTER TABLE transactions
      ADD COLUMN IF NOT EXISTS customer_name text NOT NULL DEFAULT 'Umum';
  `);
}

async function ensureWorkspace(userId: string, session?: SessionHint) {
  const existing = await db
    .select({ userId: storeProfiles.userId })
    .from(storeProfiles)
    .where(eq(storeProfiles.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return;
  }

  const timestamp = nowIso();
  await db.insert(storeProfiles).values({
    userId,
    storeName: session?.user?.name ? `Warung ${session.user.name}` : "Warung Baru",
    storeTagline: "Warung harian untuk warga sekitar",
    storeAddress: "Alamat belum diisi",
    ownerName: session?.user?.name ?? "Pemilik Warung",
    ownerWhatsapp: "-",
    city: "Indonesia",
    businessNotes: "",
    stockAlertThreshold: 8,
    enabledPayments: ["Tunai", "QRIS", "Transfer"],
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export async function ensureAppReady() {
  if (!initializationPromise) {
    initializationPromise = ensureTables();
  }

  await initializationPromise;
}

export async function getRequestUser() {
  await ensureAppReady();

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  let userId = session.user.id;
  const userEmail = session.user.email;

  // Share Taufiq's premium database with Cabang 1 crew accounts only
  if (userEmail === "miejebew.crew@gmail.com") {
    userId = "yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn";
  }

  await ensureWorkspace(userId, session);
  return { userId, session };
}

function mapSettings(profile: typeof storeProfiles.$inferSelect): Settings {
  let extra: any = {};
  try {
    if (profile.businessNotes && profile.businessNotes.startsWith("{")) {
      extra = JSON.parse(profile.businessNotes);
    }
  } catch (e) {
    console.error("Failed to parse extra settings from businessNotes", e);
  }

  return {
    storeName: profile.storeName,
    storeTagline: profile.storeTagline,
    storeAddress: profile.storeAddress,
    ownerName: profile.ownerName,
    ownerWhatsapp: profile.ownerWhatsapp,
    city: profile.city,
    businessNotes: profile.businessNotes,
    stockAlertThreshold: profile.stockAlertThreshold,
    enabledPayments: profile.enabledPayments,
    
    // GDC-specific mappings
    merchantName: profile.storeName,
    merchantAddress: profile.storeAddress,
    merchantPhone: profile.ownerWhatsapp,
    userProfileName: profile.ownerName,

    // GDC extra settings from serialized businessNotes JSON
    taxRate: extra.taxRate ?? 0,
    enableServiceCharge: extra.enableServiceCharge ?? false,
    serviceChargeRate: extra.serviceChargeRate ?? 0,
    qrisName: extra.qrisName ?? "",
    qrisStaticCodeUrl: extra.qrisStaticCodeUrl ?? "",
    qrisType: extra.qrisType ?? "static",
    qrisUploadUrl: extra.qrisUploadUrl ?? "",
    receiptHeader: extra.receiptHeader ?? "Mie Jebew GDC",
    receiptFooter: extra.receiptFooter ?? "Terima Kasih Atas Kunjungan Anda",
    printerConnected: extra.printerConnected ?? false,
    printerName: extra.printerName ?? "",
    printerPaperSize: extra.printerPaperSize ?? "58mm",
    userProfileImage: extra.userProfileImage ?? "",
    productOrder: extra.productOrder ?? [],
    tableCount: extra.tableCount ?? 10,
    toppingsHpp: extra.toppingsHpp ?? {},
    spicyHpp: extra.spicyHpp ?? {},
  };
}

function normalizeSettings(settings: Settings): Settings {
  const enabledPayments = Array.from(
    new Set(
      (settings.enabledPayments || []).filter((method): method is PaymentMethod =>
        supportedPaymentMethods.includes(method)
      )
    )
  );

  // Serialize GDC extra settings into businessNotes text field!
  const extra = {
    taxRate: settings.taxRate ?? 0,
    enableServiceCharge: settings.enableServiceCharge ?? false,
    serviceChargeRate: settings.serviceChargeRate ?? 0,
    qrisName: settings.qrisName ?? "",
    qrisStaticCodeUrl: settings.qrisStaticCodeUrl ?? "",
    qrisType: settings.qrisType ?? "static",
    qrisUploadUrl: settings.qrisUploadUrl ?? "",
    receiptHeader: settings.receiptHeader ?? "",
    receiptFooter: settings.receiptFooter ?? "",
    printerConnected: settings.printerConnected ?? false,
    printerName: settings.printerName ?? "",
    printerPaperSize: settings.printerPaperSize ?? "58mm",
    userProfileImage: settings.userProfileImage ?? "",
    productOrder: settings.productOrder ?? [],
    tableCount: settings.tableCount ?? 10,
    toppingsHpp: settings.toppingsHpp ?? {},
    spicyHpp: settings.spicyHpp ?? {},
  };

  return {
    storeName: (settings.storeName || settings.merchantName || "").trim(),
    storeTagline: (settings.storeTagline || "").trim(),
    storeAddress: (settings.storeAddress || settings.merchantAddress || "").trim(),
    ownerName: (settings.ownerName || settings.userProfileName || "").trim(),
    ownerWhatsapp: (settings.ownerWhatsapp || settings.merchantPhone || "").trim(),
    city: (settings.city || "Depok").trim(),
    businessNotes: JSON.stringify(extra),
    stockAlertThreshold: Math.max(1, Math.round(settings.stockAlertThreshold || 0)),
    enabledPayments,
  };
}

export async function getBootstrapState(userId: string): Promise<AppState> {
  await ensureAppReady();

  const [profile] = await db
    .select()
    .from(storeProfiles)
    .where(eq(storeProfiles.userId, userId))
    .limit(1);

  if (!profile) {
    throw new Error("Profil warung tidak ditemukan.");
  }

  const productRows = await db
    .select()
    .from(products)
    .where(eq(products.userId, userId))
    .orderBy(desc(products.createdAt));

  const transactionRows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt));

  const transactionIds = transactionRows.map((transaction) => transaction.id);
  const itemRows =
    transactionIds.length > 0
      ? await db
          .select()
          .from(transactionItems)
          .where(inArray(transactionItems.transactionId, transactionIds))
      : [];

  const debtRows = await db
    .select()
    .from(debts)
    .where(eq(debts.userId, userId))
    .orderBy(desc(debts.createdAt));

  const expenseRows = await db
    .select()
    .from(expenses)
    .where(eq(expenses.userId, userId))
    .orderBy(desc(expenses.createdAt));

  const savedBillRows = await db
    .select()
    .from(savedBills)
    .where(eq(savedBills.userId, userId))
    .orderBy(desc(savedBills.createdAt));

  const productCategoryMap = new Map<string, string>();
  for (const product of productRows) {
    productCategoryMap.set(product.id, product.category || 'Lainnya');
  }

  const itemsByTransaction = new Map<string, Transaction["items"]>();
  for (const item of itemRows) {
    const existing = itemsByTransaction.get(item.transactionId) ?? [];
    existing.push({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      costPrice: item.costPrice,
      sellPrice: item.unitPrice,
      id: item.productId,
      category: productCategoryMap.get(item.productId) || 'Lainnya',
    });
    itemsByTransaction.set(item.transactionId, existing);
  }

  return {
    products: productRows.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category as AppState["products"][number]["category"],
      buyPrice: product.buyPrice,
      sellPrice: product.sellPrice,
      stock: product.stock,
      minimumStock: product.minimumStock,
      description: product.description,
      imageUrl: product.imageUrl,
    })),
    cart: [],
    paymentMethod: (profile.enabledPayments[0] ?? "Tunai") as PaymentMethod,
    transactions: transactionRows.map((transaction) => ({
      id: transaction.id,
      paymentMethod: transaction.paymentMethod as PaymentMethod,
      customerName: transaction.customerName,
      total: transaction.total,
      amountPaid: transaction.amountPaid ?? undefined,
      change: transaction.change ?? undefined,
      createdAt: transaction.createdAt,
      items: itemsByTransaction.get(transaction.id) ?? [],
    })),
    debts: debtRows.map((debt) => ({
      id: debt.id,
      borrowerName: debt.borrowerName,
      whatsapp: debt.whatsapp,
      amount: debt.amount,
      createdAt: debt.createdAt,
      dueDate: debt.dueDate,
      isPaid: debt.isPaid === 1,
      lastReminderAt: debt.lastReminderAt ?? undefined,
    })),
    expenses: expenseRows.map((expense) => ({
      id: expense.id,
      title: expense.title,
      amount: expense.amount,
      createdAt: expense.createdAt,
      category: expense.category as AppState["expenses"][number]["category"],
    })),
    settings: mapSettings(profile),
    savedBills: savedBillRows.map((bill) => ({
      id: bill.id,
      name: bill.name,
      createdAt: bill.createdAt,
      date: bill.createdAt,
      items: bill.items,
    })),
  };
}

export async function createProduct(userId: string, draft: ProductDraft) {
  const timestamp = nowIso();
  const [product] = await db
    .insert(products)
    .values({
      id: createId("prd"),
      userId,
      name: draft.name,
      category: draft.category,
      buyPrice: draft.buyPrice,
      sellPrice: draft.sellPrice,
      stock: draft.stock,
      minimumStock: draft.minimumStock,
      description: draft.description,
      imageUrl: draft.imageUrl || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .returning();

  return {
    id: product.id,
    name: product.name,
    category: product.category as AppState["products"][number]["category"],
    buyPrice: product.buyPrice,
    sellPrice: product.sellPrice,
    stock: product.stock,
    minimumStock: product.minimumStock,
    description: product.description,
    imageUrl: product.imageUrl,
  };
}

export async function updateProduct(userId: string, productId: string, draft: ProductDraft) {
  const [updated] = await db
    .update(products)
    .set({
      name: draft.name,
      category: draft.category,
      buyPrice: draft.buyPrice,
      sellPrice: draft.sellPrice,
      stock: draft.stock,
      minimumStock: draft.minimumStock,
      description: draft.description,
      imageUrl: draft.imageUrl || null,
      updatedAt: nowIso(),
    })
    .where(and(eq(products.id, productId), eq(products.userId, userId)))
    .returning();

  if (!updated) {
    throw new Error("Produk tidak ditemukan.");
  }

  return {
    id: updated.id,
    name: updated.name,
    category: updated.category as AppState["products"][number]["category"],
    buyPrice: updated.buyPrice,
    sellPrice: updated.sellPrice,
    stock: updated.stock,
    minimumStock: updated.minimumStock,
    description: updated.description,
    imageUrl: updated.imageUrl,
  };
}

export async function deleteProduct(userId: string, productId: string) {
  const [deleted] = await db
    .delete(products)
    .where(and(eq(products.id, productId), eq(products.userId, userId)))
    .returning();

  if (!deleted) {
    throw new Error("Produk tidak ditemukan.");
  }

  return {
    id: deleted.id,
    name: deleted.name,
  };
}

export async function restockProduct(userId: string, productId: string, quantity: number) {
  const [existing] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.userId, userId)))
    .limit(1);

  if (!existing) {
    throw new Error("Produk tidak ditemukan.");
  }

  const [updated] = await db
    .update(products)
    .set({
      stock: existing.stock + quantity,
      updatedAt: nowIso(),
    })
    .where(and(eq(products.id, productId), eq(products.userId, userId)))
    .returning();

  return {
    id: updated.id,
    name: updated.name,
    category: updated.category as AppState["products"][number]["category"],
    buyPrice: updated.buyPrice,
    sellPrice: updated.sellPrice,
    stock: updated.stock,
    minimumStock: updated.minimumStock,
    description: updated.description,
    imageUrl: updated.imageUrl,
  };
}

export async function createTransaction(
  userId: string,
  payload: {
    paymentMethod: PaymentMethod;
    customerName?: string;
    amountPaid?: number;
    change?: number;
    items: Array<{
      productId: string;
      quantity: number;
      spicyLevel?: number;
      toppings?: string[];
      filling?: string;
      size?: string;
    }>;
  }
) {
  if (payload.items.length === 0) {
    throw new Error("Keranjang masih kosong.");
  }

  const [profile] = await db
    .select()
    .from(storeProfiles)
    .where(eq(storeProfiles.userId, userId))
    .limit(1);

  const settings = profile ? mapSettings(profile) : null;
  const configuredToppingsHpp = settings?.toppingsHpp || {};
  const configuredSpicyHpp = settings?.spicyHpp || {};

  const productIds = payload.items.map((item) => item.productId).filter(id => id !== "promo_jasmine_tea");
  const productRows = productIds.length > 0 ? await db
    .select()
    .from(products)
    .where(and(eq(products.userId, userId), inArray(products.id, productIds))) : [];

  const productMap = new Map(productRows.map((product) => [product.id, product]));
  const lineItems = payload.items.map((item) => {
    let product: any;
    if (item.productId === "promo_jasmine_tea") {
      const isCabang2 = userId === "rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5";
      const nonPromoSubtotal = payload.items
        .filter(it => it.productId !== "promo_jasmine_tea")
        .reduce((sum, it) => {
          const p = productMap.get(it.productId);
          if (!p) return sum;
          const spicySurcharge = (it.spicyLevel === 4 || it.spicyLevel === 5) ? 2000 : 0;
          const toppingsCount = it.toppings ? it.toppings.length : 0;
          const toppingsSurcharge = toppingsCount === 3 
            ? 5000 
            : toppingsCount === 7 
            ? 10000 
            : toppingsCount * 2000;
          let fillingSurcharge = 0;
          if (p.category === 'Kebab') {
            if (it.size === 'REGULER') {
              if (it.filling === 'Beef') fillingSurcharge = 2000;
            } else if (it.size === 'LARGE') {
              if (it.filling === 'Beef Slice' || it.filling === 'Beef' || it.filling === 'Chicken Katsu') fillingSurcharge = 5000;
              else if (it.filling === 'Special') fillingSurcharge = 10000;
            }
          } else {
            if (it.filling === 'Beef Patty' || it.filling === 'Chicken Katsu') fillingSurcharge = 5000;
            else if (it.filling === 'Special') fillingSurcharge = 10000;
          }
          const isSpaghetti = p.name.toLowerCase().includes("spaghetti");
          const spaghettiSurcharge = (isSpaghetti && it.size === "Double") ? 4000 : 0;
          const unitPrice = p.sellPrice + spicySurcharge + toppingsSurcharge + fillingSurcharge + spaghettiSurcharge;
          return sum + unitPrice * it.quantity;
        }, 0);
      const isVip = nonPromoSubtotal >= 50000;

      let name = "Qalla Tea (Jasmine Tea) [PROMO]";
      let category = "Qalla Tea";
      let description = isVip ? "Promo Jasmine Tea gratis (VIP)" : "Promo Jasmine Tea gratis";

      if (isCabang2) {
        category = "Tea Series";
        name = isVip ? "Es Teh Manis [PROMO]" : "Es Teh Tawar [PROMO]";
        description = isVip ? "Promo Es Teh Manis gratis (VIP)" : "Promo Es Teh Tawar gratis";
      }

      product = {
        id: "promo_jasmine_tea",
        userId,
        name,
        category,
        buyPrice: 0,
        sellPrice: 0,
        stock: 9999,
        minimumStock: -1,
        description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      const p = productMap.get(item.productId);
      if (!p) {
        throw new Error("Salah satu produk tidak ditemukan.");
      }
      product = p;
    }

    if (product.stock < item.quantity) {
      throw new Error(`Stok ${product.name} tidak cukup.`);
    }

    let unitPrice = 0;
    let costPrice = 0;
    if (item.productId === "promo_jasmine_tea") {
      unitPrice = 0;
      costPrice = 0;
    } else {
      // Calculate price with surcharge for levels 4-5 and toppings (+2000 each, promo: 3 toppings = 5000, 7 toppings = 10000)
      const spicySurcharge = (item.spicyLevel === 4 || item.spicyLevel === 5) ? 2000 : 0;
      const toppingsCount = item.toppings ? item.toppings.length : 0;
      const toppingsSurcharge = toppingsCount === 3 
        ? 5000 
        : toppingsCount === 7 
        ? 10000 
        : toppingsCount * 2000;
        
      let fillingSurcharge = 0;
      if (product.category === 'Kebab') {
        if (item.size === 'REGULER') {
          if (item.filling === 'Beef') fillingSurcharge = 2000;
        } else if (item.size === 'LARGE') {
          if (item.filling === 'Beef Slice' || item.filling === 'Beef' || item.filling === 'Chicken Katsu') fillingSurcharge = 5000;
          else if (item.filling === 'Special') fillingSurcharge = 10000;
        }
      } else {
        if (item.filling === 'Beef Patty' || item.filling === 'Chicken Katsu') fillingSurcharge = 5000;
        else if (item.filling === 'Special') fillingSurcharge = 10000;
      }

      const isSpaghetti = product.name.toLowerCase().includes("spaghetti");
      const spaghettiSurcharge = (isSpaghetti && item.size === "Double") ? 4000 : 0;

      unitPrice = product.sellPrice + spicySurcharge + toppingsSurcharge + fillingSurcharge + spaghettiSurcharge;
      
      // Calculate dynamic HPP additions using configured settings, falling back to 60% of surcharge
      // 1. Toppings HPP
      let totalToppingsHpp = 0;
      if (item.toppings && item.toppings.length > 0) {
        let hasCustomToppingHpp = false;
        item.toppings.forEach(t => {
          if (configuredToppingsHpp[t] !== undefined) {
            totalToppingsHpp += configuredToppingsHpp[t];
            hasCustomToppingHpp = true;
          }
        });
        
        // If no custom topping HPP is configured at all, fallback to 60% of the toppings surcharge!
        if (!hasCustomToppingHpp) {
          totalToppingsHpp = Math.round(toppingsSurcharge * 0.6);
        }
      }
      
      // 2. Spicy Level HPP
      let spicyHppCost = 0;
      const spicyKey = `level_${item.spicyLevel}`;
      if (item.spicyLevel !== undefined && configuredSpicyHpp[spicyKey] !== undefined) {
        spicyHppCost = configuredSpicyHpp[spicyKey];
      } else {
        spicyHppCost = Math.round(spicySurcharge * 0.6);
      }
      
      // 3. Varian Isi HPP
      let fillingHppCost = 0;
      const fillingKey = item.filling ? `filling_${item.filling}` : "";
      const isLargeKebab = product.category === 'Kebab' && item.size === 'LARGE';
      const fillingHppKey = fillingKey ? (isLargeKebab ? `${fillingKey}_large` : fillingKey) : "";
      if (fillingHppKey && configuredToppingsHpp[fillingHppKey] !== undefined) {
        fillingHppCost = configuredToppingsHpp[fillingHppKey];
      } else {
        fillingHppCost = Math.round(fillingSurcharge * 0.6);
      }
      
      // 4. Spaghetti Sizing HPP
      let spaghettiHppCost = 0;
      if (isSpaghetti && item.size === "Double") {
        if (configuredToppingsHpp["spaghetti_double"] !== undefined) {
          spaghettiHppCost = configuredToppingsHpp["spaghetti_double"];
        } else {
          spaghettiHppCost = Math.round(spaghettiSurcharge * 0.6);
        }
      }

      costPrice = product.buyPrice + totalToppingsHpp + spicyHppCost + fillingHppCost + spaghettiHppCost;
    }

    // Construct a beautiful name incorporating spicy level and toppings
    const extras: string[] = [];
    const isSpaghetti = product.name.toLowerCase().includes("spaghetti");
    if (item.productId !== "promo_jasmine_tea" && item.spicyLevel !== undefined) {
      if (product.category === 'Kebab' || product.category === 'Lumpia Beef') {
         if (item.spicyLevel === 0) extras.push("Tidak Pedas");
         else if (item.spicyLevel === 1) extras.push("Sedang");
         else if (item.spicyLevel === 2) extras.push("Pedas");
      } else {
         extras.push(`Level ${item.spicyLevel}`);
      }
    }
    if (item.productId !== "promo_jasmine_tea" && item.size) {
      if (isSpaghetti) {
        extras.push(`Porsi: ${item.size}`);
      } else {
        extras.push(`Ukuran: ${item.size}`);
      }
    }
    if (item.productId !== "promo_jasmine_tea" && item.filling) {
      extras.push(`Varian Isi: ${item.filling}`);
    }
    if (item.productId !== "promo_jasmine_tea" && item.toppings && item.toppings.length > 0) {
      const counts: Record<string, number> = {};
      for (const t of item.toppings) {
        counts[t] = (counts[t] || 0) + 1;
      }
      const formattedToppings = Object.entries(counts)
        .map(([topping, count]) => (count > 1 ? `${topping} (x${count})` : topping))
        .join(", ");
      extras.push(formattedToppings);
    }
    const finalName = extras.length > 0 ? `${product.name}\n${extras.join('\n')}` : product.name;

    return {
      product,
      quantity: item.quantity,
      unitPrice,
      costPrice,
      productName: finalName,
    };
  });

  const transactionId = createId("trx");
  const createdAt = nowIso();
  const total = lineItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  await db.transaction(async (tx) => {
    await tx.insert(transactions).values({
      id: transactionId,
      userId,
      total,
      paymentMethod: payload.paymentMethod,
      customerName: payload.customerName || "Umum",
      amountPaid: payload.amountPaid,
      change: payload.change,
      createdAt,
    });

    await tx.insert(transactionItems).values(
      lineItems.map((item) => ({
        id: createId("itm"),
        transactionId,
        productId: item.product.id,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPrice: item.costPrice,
      }))
    );

    for (const item of lineItems) {
      if (item.product.id === "promo_jasmine_tea") continue;
      await tx
        .update(products)
        .set({
          stock: item.product.stock - item.quantity,
          updatedAt: createdAt,
        })
        .where(and(eq(products.id, item.product.id), eq(products.userId, userId)));
    }
  });

  const nextState = await getBootstrapState(userId);
  const transaction = nextState.transactions.find((item) => item.id === transactionId);

  if (!transaction) {
    throw new Error("Transaksi gagal dibuat.");
  }

  // Trigger low-stock alerts in background
  for (const item of lineItems) {
    if (item.product.id === "promo_jasmine_tea") continue;
    const remainingStock = item.product.stock - item.quantity;
    if (remainingStock <= item.product.minimumStock) {
      void sendStockAlert(item.product.name, remainingStock, item.product.minimumStock)
        .catch((err) => console.error("[WHATSAPP-STOK] Gagal mengirim notifikasi stok menipis:", err));
    }
  }
  return {
    transaction,
    products: nextState.products,
  };
}

export async function deleteTransaction(userId: string, transactionId: string) {
  const [tx] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
    .limit(1);

  if (!tx) {
    throw new Error("Transaksi tidak ditemukan.");
  }

  const items = await db
    .select()
    .from(transactionItems)
    .where(eq(transactionItems.transactionId, transactionId));

  await db.transaction(async (txDb) => {
    // Restock products
    for (const item of items) {
      const [product] = await txDb
        .select({ stock: products.stock })
        .from(products)
        .where(and(eq(products.id, item.productId), eq(products.userId, userId)))
        .limit(1);

      if (product) {
        await txDb
          .update(products)
          .set({ stock: product.stock + item.quantity })
          .where(and(eq(products.id, item.productId), eq(products.userId, userId)));
      }
    }

    await txDb
      .delete(transactionItems)
      .where(eq(transactionItems.transactionId, transactionId));

    await txDb
      .delete(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));
  });

  const nextState = await getBootstrapState(userId);
  return { products: nextState.products };
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  payload: { paymentMethod?: PaymentMethod; createdAt?: string }
) {
  const [tx] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
    .limit(1);

  if (!tx) {
    throw new Error("Transaksi tidak ditemukan.");
  }

  const updateData: any = {};
  if (payload.paymentMethod) updateData.paymentMethod = payload.paymentMethod;
  if (payload.createdAt) updateData.createdAt = payload.createdAt;

  if (Object.keys(updateData).length > 0) {
    await db
      .update(transactions)
      .set(updateData)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));
  }

  const nextState = await getBootstrapState(userId);
  const updatedTransaction = nextState.transactions.find((item) => item.id === transactionId);

  return { transaction: updatedTransaction };
}

export async function createDebt(userId: string, draft: DebtDraft) {
  const [debt] = await db
    .insert(debts)
    .values({
      id: createId("debt"),
      userId,
      borrowerName: draft.borrowerName,
      whatsapp: draft.whatsapp,
      amount: draft.amount,
      createdAt: nowIso(),
      dueDate: parseDueDate(draft.dueDate),
      isPaid: 0,
      lastReminderAt: null,
    })
    .returning();

  return {
    id: debt.id,
    borrowerName: debt.borrowerName,
    whatsapp: debt.whatsapp,
    amount: debt.amount,
    createdAt: debt.createdAt,
    dueDate: debt.dueDate,
    isPaid: false,
    lastReminderAt: undefined,
  };
}

export async function markDebtPaid(userId: string, debtId: string) {
  const [updated] = await db
    .update(debts)
    .set({
      isPaid: 1,
    })
    .where(and(eq(debts.id, debtId), eq(debts.userId, userId)))
    .returning();

  if (!updated) {
    throw new Error("Data hutang tidak ditemukan.");
  }

  return {
    id: updated.id,
    borrowerName: updated.borrowerName,
    whatsapp: updated.whatsapp,
    amount: updated.amount,
    createdAt: updated.createdAt,
    dueDate: updated.dueDate,
    isPaid: true,
    lastReminderAt: updated.lastReminderAt ?? undefined,
  };
}

export async function remindDebt(userId: string, debtId: string) {
  const [updated] = await db
    .update(debts)
    .set({
      lastReminderAt: nowIso(),
    })
    .where(and(eq(debts.id, debtId), eq(debts.userId, userId)))
    .returning();

  if (!updated) {
    throw new Error("Data hutang tidak ditemukan.");
  }

  // Trigger WhatsApp reminder in background
  void sendDebtReminderAlert(
    updated.borrowerName,
    updated.amount,
    updated.dueDate,
    updated.whatsapp
  ).catch((err) => console.error("[WHATSAPP-REMINDER] Gagal mengirim pengingat hutang:", err));

  return {
    id: updated.id,
    borrowerName: updated.borrowerName,
    whatsapp: updated.whatsapp,
    amount: updated.amount,
    createdAt: updated.createdAt,
    dueDate: updated.dueDate,
    isPaid: updated.isPaid === 1,
    lastReminderAt: updated.lastReminderAt ?? undefined,
  };
}

export async function createExpense(
  userId: string,
  draft: { title: string; amount: number; category: string }
) {
  const [expense] = await db
    .insert(expenses)
    .values({
      id: createId("exp"),
      userId,
      title: draft.title,
      amount: draft.amount,
      category: draft.category,
      createdAt: nowIso(),
    })
    .returning();

  return {
    id: expense.id,
    title: expense.title,
    amount: expense.amount,
    category: expense.category,
    createdAt: expense.createdAt,
  };
}

export async function deleteExpense(userId: string, expenseId: string) {
  const [deleted] = await db
    .delete(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.userId, userId)))
    .returning();

  if (!deleted) {
    throw new Error("Pengeluaran tidak ditemukan.");
  }

  return {
    id: deleted.id,
    title: deleted.title,
  };
}

export async function updateStoreSettings(userId: string, settings: Settings) {
  // Merge GDC UI inputs to database fields
  const mergedSettings = {
    ...settings,
    storeName: settings.merchantName || settings.storeName || "Mie Jebew GDC",
    storeAddress: settings.merchantAddress || settings.storeAddress || "GDC",
    ownerWhatsapp: settings.merchantPhone || settings.ownerWhatsapp || "082244119900",
    ownerName: settings.userProfileName || settings.ownerName || "Kasir",
  };

  const nextSettings = normalizeSettings(mergedSettings);

  if (
    nextSettings.storeName.length === 0 ||
    nextSettings.storeAddress.length === 0 ||
    nextSettings.ownerName.length === 0 ||
    nextSettings.ownerWhatsapp.length === 0 ||
    nextSettings.city.length === 0 ||
    nextSettings.enabledPayments.length === 0
  ) {
    throw new Error(
      "Lengkapi nama warung, alamat, pemilik, WhatsApp, kota, dan pilih minimal satu metode bayar."
    );
  }

  const [updated] = await db
    .update(storeProfiles)
    .set({
      storeName: nextSettings.storeName,
      storeTagline: nextSettings.storeTagline,
      storeAddress: nextSettings.storeAddress,
      ownerName: nextSettings.ownerName,
      ownerWhatsapp: nextSettings.ownerWhatsapp,
      city: nextSettings.city,
      businessNotes: nextSettings.businessNotes,
      stockAlertThreshold: nextSettings.stockAlertThreshold,
      enabledPayments: nextSettings.enabledPayments,
      updatedAt: nowIso(),
    })
    .where(eq(storeProfiles.userId, userId))
    .returning();

  if (!updated) {
    throw new Error("Pengaturan warung tidak ditemukan.");
  }

  return mapSettings(updated);
}

export async function resetWorkspace(userId: string) {
  await ensureAppReady();

  const transactionIds = (
    await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.userId, userId))
  ).map((transaction) => transaction.id);

  if (transactionIds.length > 0) {
    await db
      .delete(transactionItems)
      .where(inArray(transactionItems.transactionId, transactionIds));
  }

  await db.delete(transactions).where(eq(transactions.userId, userId));
  await db.delete(debts).where(eq(debts.userId, userId));
  await db.delete(expenses).where(eq(expenses.userId, userId));
  await db.delete(products).where(eq(products.userId, userId));
  await db.delete(storeProfiles).where(eq(storeProfiles.userId, userId));
  await db.delete(savedBills).where(eq(savedBills.userId, userId));

  await ensureWorkspace(userId, null);

  return getBootstrapState(userId);
}

export async function createSavedBill(userId: string, name: string, items: any[], optionalId?: string) {
  await ensureAppReady();
  const id = optionalId || Math.random().toString(36).substring(2, 9);
  const timestamp = nowIso();
  const [bill] = await db
    .insert(savedBills)
    .values({
      id,
      userId,
      name,
      items,
      createdAt: timestamp,
    })
    .returning();
  return bill;
}

export async function deleteSavedBill(userId: string, id: string) {
  await ensureAppReady();
  await db
    .delete(savedBills)
    .where(and(eq(savedBills.id, id), eq(savedBills.userId, userId)));
}
