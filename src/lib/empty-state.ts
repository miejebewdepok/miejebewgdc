import { AppState } from "@/lib/types";

export const emptyAppState: AppState = {
  products: [],
  cart: [],
  transactions: [],
  debts: [],
  expenses: [],
  paymentMethod: "Tunai",
  settings: {
    storeName: "",
    storeTagline: "",
    storeAddress: "",
    ownerName: "",
    ownerWhatsapp: "",
    city: "",
    businessNotes: "",
    stockAlertThreshold: 5,
    enabledPayments: ["Tunai", "QRIS", "Transfer"],
  },
  savedBills: [],
};
