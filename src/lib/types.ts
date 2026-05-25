export type PaymentMethod = "Tunai" | "QRIS" | "Transfer";

export type ProductCategory = string;

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minimumStock: number;
  description: string;
  imageUrl?: string | null;
  image?: string;
  price?: number;
  isAvailable?: boolean;
  bestSeller?: boolean;
}

export interface CartItem {
  id?: string;
  productId: string;
  quantity: number;
  spicyLevel?: number;
  toppings?: string[];
  filling?: string;
  size?: string;
  product?: Product;
  notes?: string;
  sellPrice?: number;
}

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  spicyLevel?: number;
  toppings?: string[];
  filling?: string;
  size?: string;
  product?: Product;
  notes?: string;
  sellPrice?: number;
  id?: string;
  category?: string;
}

export interface Transaction {
  id: string;
  paymentMethod: PaymentMethod;
  total: number;
  createdAt: string;
  items: TransactionItem[];
  invoiceNo?: string;
  date?: string;
  subtotal?: number;
  tax?: number;
  amountPaid?: number;
  change?: number;
  customerName?: string;
}

export interface SavedBill {
  id: string;
  name: string;
  date: string;
  createdAt: string;
  items: any[];
}

export interface Debt {
  id: string;
  borrowerName: string;
  whatsapp: string;
  amount: number;
  createdAt: string;
  dueDate: string;
  isPaid: boolean;
  lastReminderAt?: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  createdAt: string;
  category: string;
}

export interface Settings {
  storeName: string;
  storeTagline: string;
  storeAddress: string;
  ownerName: string;
  ownerWhatsapp: string;
  city: string;
  businessNotes: string;
  stockAlertThreshold: number;
  enabledPayments: PaymentMethod[];
  qrisType?: 'static' | 'dynamic' | 'upload';
  qrisName?: string;
  qrisStaticCodeUrl?: string;
  qrisUploadUrl?: string;
  enableServiceCharge?: boolean;
  serviceChargeRate?: number;
  taxRate?: number;
  receiptHeader?: string;
  receiptFooter?: string;
  printerConnected?: boolean;
  printerName?: string;
  printerPaperSize?: string;
  merchantName?: string;
  merchantAddress?: string;
  merchantPhone?: string;
  userProfileName?: string;
  userProfileImage?: string;
  productOrder?: string[];
  tableCount?: number;
}

export interface AppState {
  products: Product[];
  cart: CartItem[];
  transactions: Transaction[];
  debts: Debt[];
  expenses: Expense[];
  paymentMethod: PaymentMethod;
  settings: Settings;
  savedBills: SavedBill[];
}

export interface ProductDraft {
  name: string;
  category: ProductCategory;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minimumStock: number;
  description: string;
  imageUrl?: string | null;
}

export interface DebtDraft {
  borrowerName: string;
  whatsapp: string;
  amount: number;
  dueDate: string;
}
