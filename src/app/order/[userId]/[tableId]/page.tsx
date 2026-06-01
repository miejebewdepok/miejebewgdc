"use client";

import React, { useState, useEffect, useMemo, use } from "react";
import { 
  Flame, 
  Utensils, 
  Coffee, 
  Sparkles, 
  ShoppingBag, 
  Plus, 
  Minus, 
  X, 
  Check, 
  ArrowRight, 
  Loader2, 
  Store,
  ChevronRight,
  Gift,
  Lock
} from "lucide-react";
import { Toaster, toast } from "sonner";

interface Product {
  id: string;
  name: string;
  category: string;
  sellPrice: number;
  stock: number;
  description: string;
  imageUrl?: string | null;
}

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  spicyLevel: number;
  toppings: string[];
  product: Product;
  sellPrice: number; // configured sell price including surcharges
  filling?: string;
  size?: string;
}

export default function CustomerOrderPage(props: {
  params: Promise<{ userId: string; tableId: string }>;
}) {
  // Resolve params using React.use() to comply with Next.js 15 rules
  const resolvedParams = use(props.params);
  const userId = resolvedParams.userId;
  const rawTableId = resolvedParams.tableId;
  const tableId = decodeURIComponent(rawTableId);
  const tableNumOnly = tableId.replace(/^(meja|order)[\s\-_]*/i, "");
  
  const isCabang2 = userId === "rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5";

  // States
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState("Mie Jebew GDC");
  const [products, setProducts] = useState<Product[]>([]);
  const [productOrder, setProductOrder] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("Semua");
  const [activeSubCategory, setActiveSubCategory] = useState<string>("Semua");
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Customizer modal state
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [spicyLevel, setSpicyLevel] = useState<number>(0);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>("REGULER");
  const [selectedFilling, setSelectedFilling] = useState<string>("Beef Slice");
  
  // Cart review & Checkout states
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [claimPromo, setClaimPromo] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [whatsappUsed, setWhatsappUsed] = useState(false);
  const [emailUsed, setEmailUsed] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastBillName, setLastBillName] = useState("");
  const [promoEarned, setPromoEarned] = useState(false);

  const toppingsList = isCabang2
    ? [
        "Bakso",
        "Sosis",
        "Nugget",
        "Otak-Otak",
        "Cireng",
        "Ceker",
        "Kulit Ayam",
        "Pangsit Goreng",
        "Telur"
      ]
    : [
        "Bakso",
        "Bakso Ikan",
        "Sosis",
        "Nugget",
        "Kornet",
        "Otak-Otak",
        "Tahu Aci",
        "Scallop",
        "Cireng",
        "Beef Slice",
        "Keju Slice",
        "Telur"
      ];

  // Load products catalog from public API
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/public/products?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.products) {
          setProducts(data.products);
        }
        if (data.productOrder) {
          setProductOrder(data.productOrder);
        }
        if (data.storeName) {
          setStoreName(data.storeName);
        }
      })
      .catch((err) => {
        console.error("Failed to load catalog", err);
        toast.error("Gagal memuat katalog menu. Silakan segarkan halaman.");
      })
      .finally(() => setLoading(false));
  }, [userId]);

  // Auto-reset success screen back to menu after 10 seconds so the next customer starts fresh
  useEffect(() => {
    if (orderSuccess) {
      const timer = setTimeout(() => {
        setOrderSuccess(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [orderSuccess]);

  // Real-time WhatsApp duplicate check
  useEffect(() => {
    if (!whatsappNumber.trim() || !userId) {
      setWhatsappUsed(false);
      return;
    }
    const cleanWa = whatsappNumber.trim();
    if (cleanWa.length < 9) {
      setWhatsappUsed(false);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/public/promo-validate?userId=${userId}&whatsapp=${encodeURIComponent(cleanWa)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setWhatsappUsed(data.whatsappUsed);
          }
        })
        .catch(console.error);
    }, 500);

    return () => clearTimeout(timer);
  }, [whatsappNumber, userId]);

  // Real-time Email duplicate check
  useEffect(() => {
    if (!emailAddress.trim() || !userId) {
      setEmailUsed(false);
      return;
    }
    const cleanEmail = emailAddress.trim();
    if (!cleanEmail.includes("@") || cleanEmail.length < 5) {
      setEmailUsed(false);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/public/promo-validate?userId=${userId}&email=${encodeURIComponent(cleanEmail)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setEmailUsed(data.emailUsed);
          }
        })
        .catch(console.error);
    }, 500);

    return () => clearTimeout(timer);
  }, [emailAddress, userId]);

  // Helper to dynamically classify if a category belongs to drinks
  const isDrinkCategory = (cat: string) => {
    const lower = (cat || "").toLowerCase();
    return (
      lower.includes("minuman") ||
      lower.includes("coffee") ||
      lower.includes("tea") ||
      lower.includes("kopi") ||
      lower.includes("dingin") ||
      lower.includes("jus") ||
      lower.includes("water") ||
      lower.includes("es") ||
      lower.includes("qalla") ||
      lower.includes("choco") ||
      lower.includes("delight")
    );
  };

  // Simplified categories tabs list
  const categories = ["Semua", "Makanan", "Minuman"];

  const getSubCategoryBadge = (category: string) => {
    const catLower = (category || "").toLowerCase();
    if (category === "Delight Series" || catLower === "chocolatte") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-600/20 to-orange-700/20 text-amber-400 border border-amber-600/15 uppercase tracking-wider font-mono">
          🍫 Delight Series
        </span>
      );
    }
    switch (category) {
      case "Mie Tek Tek":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-400 border border-red-500/15 uppercase tracking-wider font-mono">
            🍜 Mie Tek Tek
          </span>
        );
      case "Pangsit":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/15 uppercase tracking-wider font-mono">
            🥟 Pangsit
          </span>
        );
      case "Tea Series":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-400 border border-teal-500/15 uppercase tracking-wider font-mono">
            🍃 Tea Series
          </span>
        );
      case "Mie Pedas":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-400 border border-red-500/15 uppercase tracking-wider font-mono">
            🔥 Mie Pedas
          </span>
        );
      case "Kebab":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-500/20 to-yellow-600/20 text-amber-400 border border-amber-500/15 uppercase tracking-wider font-mono">
            🌯 Kebab
          </span>
        );
      case "Lumpia Beef":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/15 uppercase tracking-wider font-mono">
            🌮 Lumpia Beef
          </span>
        );
      case "Snack":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 border border-yellow-500/15 uppercase tracking-wider font-mono">
            🍟 Snack
          </span>
        );
      case "Qalla Coffee":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-orange-300/10 to-orange-400/15 text-orange-200 border border-orange-300/15 uppercase tracking-wider font-mono">
            ☕ Qalla Coffee
          </span>
        );
      case "Qalla Tea":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-400 border border-teal-500/15 uppercase tracking-wider font-mono">
            🍃 Qalla Tea
          </span>
        );
      case "Qalla Juice":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-400 border border-red-500/15 uppercase tracking-wider font-mono">
            🍓 Qalla Juice
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-white/5 text-slate-400 border border-white/5 uppercase tracking-wider font-mono">
            ✨ {category}
          </span>
        );
    }
  };

  // Grouped products lists
  const foodProducts = useMemo(() => {
    const getFoodWeight = (cat: string) => {
      switch (cat) {
        case "Mie Pedas":
          return 1;
        case "Mie Tek Tek":
          return 2;
        case "Pangsit":
          return 3;
        case "Lumpia Beef":
          return 4;
        case "Kebab":
          return 5;
        case "Snack":
          return 6;
        default:
          return 7;
      }
    };

    const filtered = products.filter((p) => !isDrinkCategory(p.category));
    const subFiltered = activeSubCategory === "Semua"
      ? filtered
      : filtered.filter((p) => p.category === activeSubCategory);

    const getSnackWeight = (name: string) => {
      const lower = name.toLowerCase();
      if (lower.includes("lumpia udang")) return 1;
      if (lower.includes("udang keju")) return 2;
      if (lower.includes("chicken katsu")) return 3;
      if (lower.startsWith("risoles")) return 4;
      return 5;
    };

    return subFiltered.sort((a, b) => {
      // 1. Sort by productOrder index first if available
      if (productOrder && productOrder.length > 0) {
        const aIdx = productOrder.indexOf(a.id);
        const bIdx = productOrder.indexOf(b.id);
        const aVal = aIdx !== -1 ? aIdx : 999999;
        const bVal = bIdx !== -1 ? bIdx : 999999;
        if (aVal !== bVal) {
          return aVal - bVal;
        }
      }

      // Fallback
      const weightA = getFoodWeight(a.category);
      const weightB = getFoodWeight(b.category);
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      if (a.category === "Snack" && b.category === "Snack") {
        const sWeightA = getSnackWeight(a.name);
        const sWeightB = getSnackWeight(b.name);
        if (sWeightA !== sWeightB) {
          return sWeightA - sWeightB;
        }
      }
      return a.name.localeCompare(b.name);
    });
  }, [products, activeSubCategory, productOrder]);

  const drinkProducts = useMemo(() => {
    const getDrinkWeight = (cat: string) => {
      const lower = (cat || "").toLowerCase();
      if (lower === "tea series" || lower === "qalla tea") return 1;
      if (lower === "delight series" || lower === "chocolatte") return 2;
      if (lower === "qalla coffee") return 3;
      if (lower === "qalla juice") return 4;
      return 5;
    };

    const filtered = products.filter((p) => isDrinkCategory(p.category));
    const subFiltered = activeSubCategory === "Semua"
      ? filtered
      : filtered.filter((p) => {
          if (activeSubCategory === "Delight Series") {
            return p.category === "Delight Series" || p.category.toLowerCase() === "chocolatte";
          }
          return p.category === activeSubCategory;
        });

    return subFiltered.sort((a, b) => {
      // 1. Sort by productOrder index first if available
      if (productOrder && productOrder.length > 0) {
        const aIdx = productOrder.indexOf(a.id);
        const bIdx = productOrder.indexOf(b.id);
        const aVal = aIdx !== -1 ? aIdx : 999999;
        const bVal = bIdx !== -1 ? bIdx : 999999;
        if (aVal !== bVal) {
          return aVal - bVal;
        }
      }

      // Fallback
      const weightA = getDrinkWeight(a.category);
      const weightB = getDrinkWeight(b.category);
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      if (a.sellPrice !== b.sellPrice) {
        return a.sellPrice - b.sellPrice;
      }
      return a.name.localeCompare(b.name);
    });
  }, [products, activeSubCategory, productOrder]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Makanan":
        return <Utensils className="w-4 h-4 text-red-500" />;
      case "Minuman":
        return <Coffee className="w-4 h-4 text-cyan-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-500" />;
    }
  };

  // Surcharge calculator matching cashier logic
  const calculateConfiguredPrice = (product: Product, level: number, toppings: string[], filling?: string, size?: string) => {
    const isBypassed = isCabang2 
      ? (product.category === "Tea Series" || product.category === "Delight Series" || product.category.toLowerCase() === "chocolatte")
      : ["Snack", "Qalla Coffee", "Qalla Tea", "Qalla Juice"].includes(product.category);
    if (isBypassed) return product.sellPrice;

    // Spicy surcharge ONLY for non-Kebab, non-Lumpia Beef, non-bypassed
    const isSpicySurcharged = !isBypassed && product.category !== "Kebab" && product.category !== "Lumpia Beef";
    const spicySurcharge = (isSpicySurcharged && (level === 4 || level === 5)) ? 2000 : 0;

    // Toppings surcharge logic
    const specialKeys = isCabang2 
      ? ["Ceker", "Kulit Ayam", "Pangsit Goreng", "Telur"] 
      : ["Beef Slice", "Keju Slice", "Telur"];

    const specialToppings = toppings.filter((t) => specialKeys.includes(t));
    const standardToppings = toppings.filter((t) => !specialKeys.includes(t));

    const stdCount = standardToppings.length;
    const stdSurcharge = stdCount === 3 
      ? 5000 
      : (stdCount === 7 
        ? 10000 
        : stdCount * 2000);

    let specialSurcharge = 0;
    specialToppings.forEach((t) => {
      if (t === "Beef Slice") specialSurcharge += 2500;
      else if (t === "Ceker") specialSurcharge += 2500;
      else if (t === "Kulit Ayam") specialSurcharge += 2500;
      else if (t === "Pangsit Goreng") specialSurcharge += 2500;
      else if (t === "Telur") specialSurcharge += 4000;
      else if (t === "Keju Slice") specialSurcharge += 3000;
    });

    let fillingSurcharge = 0;
    if (product.category === 'Kebab') {
      if (size === 'REGULER') {
        if (filling === 'Beef') fillingSurcharge = 2000;
      } else if (size === 'LARGE') {
        if (filling === 'Special') fillingSurcharge = 10000;
        else fillingSurcharge = 5000;
      }
    } else if (product.category === 'Lumpia Beef') {
      if (filling === 'Beef Patty' || filling === 'Chicken Katsu') fillingSurcharge = 5000;
      else if (filling === 'Special') fillingSurcharge = 10000;
    }

    const isSpaghetti = product.name.toLowerCase().includes("spaghetti");
    const spaghettiSurcharge = (isSpaghetti && size === "Double") ? 4000 : 0;

    return product.sellPrice + spicySurcharge + stdSurcharge + specialSurcharge + fillingSurcharge + spaghettiSurcharge;
  };

  // Add to cart trigger
  const handleAddClick = (product: Product) => {
    const isBypassed = isCabang2 
      ? (product.category === "Tea Series" || product.category === "Delight Series" || product.category.toLowerCase() === "chocolatte")
      : ["Snack", "Qalla Coffee", "Qalla Tea", "Qalla Juice"].includes(product.category);
    if (isBypassed) {
      // Direct add to cart bypass customization
      const cartItemId = `${product.id}-lvl0-`;
      setCart((current) => {
        const existingIndex = current.findIndex((item) => item.id === cartItemId);
        if (existingIndex !== -1) {
          const updated = [...current];
          updated[existingIndex].quantity += 1;
          toast.success(`Ditambahkan: ${product.name}`);
          return updated;
        }
        toast.success(`Ditambahkan: ${product.name}`);
        return [
          ...current,
          {
            id: cartItemId,
            productId: product.id,
            quantity: 1,
            spicyLevel: 0,
            toppings: [],
            product,
            sellPrice: product.sellPrice,
          },
        ];
      });
    } else {
      // Open customization modal
      setCustomizingProduct(product);
      setSpicyLevel(0);
      setSelectedToppings([]);
      // Default filling and size for Kebab / Lumpia Beef / Spaghetti Goreng
      const isSpaghetti = product.name.toLowerCase().includes("spaghetti");
      setSelectedSize(isSpaghetti ? "Single" : "REGULER");
      if (product.category === "Kebab") {
        setSelectedFilling("Beef Slice");
      } else if (product.category === "Lumpia Beef") {
        setSelectedFilling("Beef Slice");
      } else {
        setSelectedFilling("");
      }
    }
  };

  // Customize submit
  const handleConfirmCustomization = () => {
    if (!customizingProduct) return;
    const product = customizingProduct;
    
    const fillingToPass = product.category === "Kebab" || product.category === "Lumpia Beef" ? selectedFilling : undefined;
    const isSpaghetti = product.name.toLowerCase().includes("spaghetti");
    const sizeToPass = (product.category === "Kebab" || isSpaghetti) ? selectedSize : undefined;

    const configuredPrice = calculateConfiguredPrice(product, spicyLevel, selectedToppings, fillingToPass, sizeToPass);
    const toppingsKey = [...selectedToppings].sort().join(",");
    const cartItemId = `${product.id}-lvl${spicyLevel}-${toppingsKey}${fillingToPass ? `-${fillingToPass}` : ""}${sizeToPass ? `-${sizeToPass}` : ""}`;

    setCart((current) => {
      const existingIndex = current.findIndex((item) => item.id === cartItemId);
      if (existingIndex !== -1) {
        const updated = [...current];
        updated[existingIndex].quantity += 1;
        toast.success(`Ditambahkan: ${product.name}`);
        return updated;
      }
      toast.success(`Ditambahkan: ${product.name}`);
      return [
        ...current,
        {
          id: cartItemId,
          productId: product.id,
          quantity: 1,
          spicyLevel,
          toppings: selectedToppings,
          product,
          sellPrice: configuredPrice,
          filling: fillingToPass,
          size: sizeToPass
        },
      ];
    });

    setCustomizingProduct(null);
  };

  // Toggle topping helper
  const handleToggleTopping = (topping: string) => {
    setSelectedToppings((current) =>
      current.includes(topping) ? current.filter((t) => t !== topping) : [...current, topping]
    );
  };

  // Cart quantity handlers
  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Total cart calculation
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.sellPrice * item.quantity, 0);
  }, [cart]);

  // Auto-reset claim promo state if subtotal drops below Rp 15.000
  useEffect(() => {
    if (subtotal < 15000) {
      setClaimPromo(false);
    }
  }, [subtotal]);

  // Order submission
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error("Harap masukkan nama Anda.");
      return;
    }
    if (cart.length === 0) {
      toast.error("Keranjang belanja kosong.");
      return;
    }

    setPlacingOrder(true);

    try {
      const response = await fetch("/api/public/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          tableName: tableId,
          customerName: customerName.trim(),
          claimPromo: claimPromo || subtotal >= 50000,
          whatsappNumber: (claimPromo || subtotal >= 50000) ? whatsappNumber.trim() : undefined,
          emailAddress: (claimPromo || subtotal >= 50000) ? emailAddress.trim() : undefined,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            spicyLevel: item.spicyLevel,
            toppings: item.toppings,
            sellPrice: item.sellPrice,
            filling: item.filling,
            size: item.size,
            product: {
              id: item.product.id,
              name: item.product.name,
              category: item.product.category,
              sellPrice: item.product.sellPrice,
            },
          })),
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const hasPromo = result.savedBill.items.some((item: any) => item.productId === "promo_jasmine_tea");
        if (claimPromo && !hasPromo) {
          toast.warning("Pesanan dikirim tanpa promo gratis (pastikan No. WhatsApp & Email aktif belum pernah diklaim sebelumnya).", { duration: 6000 });
        }
        setLastBillName(result.savedBill.name);
        setPromoEarned(hasPromo);
        setOrderSuccess(true);
        setCart([]);
        setCustomerName("");
        setClaimPromo(false);
        setWhatsappNumber("");
        setEmailAddress("");
        setCartOpen(false);
      } else {
        throw new Error(result.error || "Gagal mengirimkan order");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Terjadi kesalahan sistem saat mengirim order.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans p-6">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-4" />
        <span className="text-sm font-bold tracking-widest text-slate-400 uppercase">Memuat katalog menu...</span>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans relative overflow-hidden select-none">
        {/* Decorative elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] bg-yellow-600/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.15)] scale-110">
          <Check className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight uppercase leading-none">PESANAN TERKIRIM!</h2>
        
        {/* Distressed Stamp Seal Notification */}
        {promoEarned ? (
          <div className="my-5 transform rotate-[-6deg] animate-in zoom-in duration-300 flex flex-col items-center select-none font-sans">
            <div className="border-4 border-dashed border-emerald-500 bg-emerald-950/30 text-emerald-400 px-5 py-3.5 rounded-[2rem] flex flex-col items-center gap-1 shadow-[0_0_20px_rgba(16,185,129,0.15)] font-mono max-w-[280px]">
              <span className="text-[9px] font-black tracking-widest bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full uppercase leading-none mb-1">
                ★ PROMO APPROVED ★
              </span>
              <span className="text-sm font-black tracking-tight text-center leading-none uppercase">
                CONGRATULATIONS!
              </span>
              <span className="text-[11.5px] font-extrabold text-white text-center leading-tight">
                {isCabang2 ? "FREE TEA SERIES GRANTED! 🍃" : "FREE QALLA TEA GRANTED! 🍃"}
              </span>
              <span className="text-[8.5px] font-bold text-emerald-300/80 tracking-wide uppercase mt-0.5">
                {isCabang2 ? "Refreshing Tea Included" : "Refreshing Jasmine Tea Included"}
              </span>
            </div>
          </div>
        ) : (
          <div className="my-5 transform rotate-[5deg] animate-in zoom-in duration-300 flex flex-col items-center select-none font-sans">
            <div className="border-4 border-dashed border-rose-500 bg-rose-950/30 text-rose-400 px-5 py-3.5 rounded-[2rem] flex flex-col items-center gap-1 shadow-[0_0_20px_rgba(244,63,94,0.15)] font-mono max-w-[280px]">
              <span className="text-[9px] font-black tracking-widest bg-rose-500 text-slate-950 px-2.5 py-0.5 rounded-full uppercase leading-none mb-1">
                ★ NO PROMO ★
              </span>
              <span className="text-sm font-black tracking-tight text-center leading-none uppercase">
                ORDER PLACED
              </span>
              <span className="text-[11.5px] font-extrabold text-white text-center leading-tight">
                NO FREE DRINK INCLUDED ❌
              </span>
              <span className="text-[8.5px] font-bold text-rose-300/80 tracking-wide uppercase mt-0.5">
                Standard Menu Items Only
              </span>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
          Pesanan Anda telah berhasil masuk ke antrean dapur kasir dengan rincian identitas:
        </p>

        <div className="bg-white/5 border border-white/5 rounded-2xl p-4.5 my-5 w-full max-w-xs text-left backdrop-blur-xl">
          <div className="flex justify-between items-center border-b border-white/5 pb-2.5 mb-2.5">
            <span className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Nomor Order</span>
            <span className="text-sm font-extrabold text-red-500">{tableNumOnly}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-455 uppercase font-black tracking-wider">Identitas Bill</span>
            <span className="text-xs font-bold text-white truncate max-w-[150px]">{lastBillName}</span>
          </div>
        </div>

        <p className="text-[11px] text-yellow-500 font-bold max-w-xs leading-relaxed italic bg-yellow-500/5 border border-yellow-500/10 p-3.5 rounded-2xl">
          Silakan konfirmasi ke kasir untuk pembayaran, atau tunggu makanan lezat Anda disajikan langsung!
        </p>

        <button
          onClick={() => setOrderSuccess(false)}
          className="mt-8 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-extrabold cursor-pointer transition-colors"
        >
          Pesan Menu Tambahan
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden select-none pb-24">
      <Toaster position="top-center" theme="dark" />
      {/* Decorative gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute top-[30%] left-[40%] w-[35%] h-[35%] bg-yellow-600/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header bar */}
      <header className="sticky top-0 bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center shadow-md">
            <Store className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-tight text-white uppercase leading-none">{storeName}</h1>
            <span className="text-[9px] text-slate-400 font-bold block mt-0.5 uppercase tracking-widest">Digital Self-Order</span>
          </div>
        </div>
        <div className="px-3 py-1 bg-red-500/10 border border-red-500/25 rounded-full text-[9px] font-black text-red-400 uppercase tracking-widest">
          Order: {tableNumOnly}
        </div>
      </header>

      {/* Category selector */}
      <div className="sticky top-[53px] bg-slate-950/80 backdrop-blur-md py-3.5 px-4 border-b border-white/5 z-20 flex flex-col gap-3">
        {/* Main Categories Selector */}
        <div className="w-full bg-white/5 p-1 rounded-2xl border border-white/5 grid grid-cols-3 gap-1 backdrop-blur-md">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setActiveSubCategory("Semua");
              }}
              className={`py-2 px-1 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer ${
                activeCategory === cat
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/25 border border-red-500 scale-[1.02]"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {cat !== "Semua" && getCategoryIcon(cat)}
              <span className="uppercase tracking-wider text-[10px]">{cat}</span>
            </button>
          ))}
        </div>

        {/* Sub Category Selector */}
        {activeCategory !== "Semua" && (
          <div className={activeCategory === "Makanan" ? (isCabang2 ? "grid grid-cols-3 gap-1.5" : "grid grid-cols-4 gap-1.5") : (isCabang2 ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 gap-2")}>
            {(activeCategory === "Makanan"
              ? (isCabang2 ? ["Mie Pedas", "Mie Tek Tek", "Pangsit"] : ["Mie Pedas", "Lumpia Beef", "Kebab", "Snack"])
              : (isCabang2 ? ["Tea Series", "Delight Series"] : ["Qalla Tea", "Qalla Coffee", "Qalla Juice"])
            ).map((subCat) => {
              const isSelected = activeSubCategory === subCat;
              return (
                <button
                  key={subCat}
                  type="button"
                  onClick={() => {
                    if (activeSubCategory === subCat) {
                      setActiveSubCategory("Semua");
                    } else {
                      setActiveSubCategory(subCat);
                    }
                  }}
                  className={`py-2 px-1 text-[9px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer text-center rounded-xl border leading-tight ${
                    isSelected
                      ? "bg-red-600 text-white border-red-500 shadow-md scale-[1.02]"
                      : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {subCat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Menu Catalog Grid */}
      <main className="p-4 flex flex-col gap-6">
        {products.length === 0 ? (
          <div className="py-24 text-center">
            <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <span className="text-sm font-bold text-slate-400 block">Katalog Menu Kosong</span>
            <p className="text-xs text-slate-600 mt-1">Tidak ada produk aktif saat ini.</p>
          </div>
        ) : (
          <>
            {/* 1. Makanan Section */}
            {(activeCategory === "Semua" || activeCategory === "Makanan") && (
              <div>
                {activeCategory === "Semua" && (
                  <div className="flex items-center gap-2 py-2 border-b border-white/5 mb-4 select-none">
                    <Utensils className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs font-black text-white uppercase tracking-wider">Makanan</span>
                  </div>
                )}

                {foodProducts.length === 0 ? (
                  <div className="py-12 text-center bg-white/2 border border-dashed border-white/5 rounded-3xl">
                    <span className="text-xs font-bold text-slate-500">Menu Makanan Kosong</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3.5">
                    {foodProducts.map((p) => {
                      const isOut = !p.stock || p.stock <= 0;
                      return (
                        <div
                          key={p.id}
                          onClick={() => !isOut && handleAddClick(p)}
                          className={`bg-white/5 border border-white/5 rounded-3xl p-3 flex flex-col justify-between h-[235px] relative overflow-hidden transition-all duration-300 ${
                            isOut ? "opacity-45 cursor-not-allowed" : "cursor-pointer active:scale-[0.97] hover:border-white/10"
                          }`}
                        >
                          <div>
                            {/* Image frame */}
                            <div className="w-full h-20 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden p-1 relative">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} className="max-w-full max-h-full object-contain rounded-xl" />
                              ) : (
                                <div className="opacity-10 scale-[2.2] absolute">
                                  {getCategoryIcon(p.category)}
                                </div>
                              )}
                              {isOut && (
                                <span className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center text-[9px] font-black text-rose-500 uppercase tracking-widest border border-rose-500/20 rounded-xl">
                                  Habis
                                </span>
                              )}
                            </div>

                            <div className="mt-2.5 block leading-none">
                              {getSubCategoryBadge(p.category)}
                            </div>
                            <h3 className="text-xs font-extrabold text-white line-clamp-2 leading-tight mt-1.5">
                              {p.name}
                            </h3>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                            <span className="text-xs font-mono font-black text-yellow-500">
                              {formatRupiah(p.sellPrice)}
                            </span>
                            {!isOut && (
                              <div className="w-5.5 h-5.5 bg-red-600 rounded-md flex items-center justify-center text-white text-[10px] font-black shadow-md">
                                +
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. Minuman Section */}
            {(activeCategory === "Semua" || activeCategory === "Minuman") && (
              <div className={activeCategory === "Semua" ? "mt-4" : ""}>
                {activeCategory === "Semua" && (
                  <div className="flex items-center gap-2 py-2 border-b border-white/5 mb-4 select-none">
                    <Coffee className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-black text-white uppercase tracking-wider">Minuman</span>
                  </div>
                )}

                {drinkProducts.length === 0 ? (
                  <div className="py-12 text-center bg-white/2 border border-dashed border-white/5 rounded-3xl">
                    <span className="text-xs font-bold text-slate-500">Menu Minuman Kosong</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3.5">
                    {drinkProducts.map((p) => {
                      const isOut = !p.stock || p.stock <= 0;
                      return (
                        <div
                          key={p.id}
                          onClick={() => !isOut && handleAddClick(p)}
                          className={`bg-white/5 border border-white/5 rounded-3xl p-3 flex flex-col justify-between h-[235px] relative overflow-hidden transition-all duration-300 ${
                            isOut ? "opacity-45 cursor-not-allowed" : "cursor-pointer active:scale-[0.97] hover:border-white/10"
                          }`}
                        >
                          <div>
                            {/* Image frame */}
                            <div className="w-full h-20 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden p-1 relative">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} className="max-w-full max-h-full object-contain rounded-xl" />
                              ) : (
                                <div className="opacity-10 scale-[2.2] absolute">
                                  {getCategoryIcon(p.category)}
                                </div>
                              )}
                              {isOut && (
                                <span className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center text-[9px] font-black text-rose-500 uppercase tracking-widest border border-rose-500/20 rounded-xl">
                                  Habis
                                </span>
                              )}
                            </div>

                            <div className="mt-2.5 block leading-none">
                              {getSubCategoryBadge(p.category)}
                            </div>
                            <h3 className="text-xs font-extrabold text-white line-clamp-2 leading-tight mt-1.5">
                              {p.name}
                            </h3>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                            <span className="text-xs font-mono font-black text-yellow-500">
                              {formatRupiah(p.sellPrice)}
                            </span>
                            {!isOut && (
                              <div className="w-5.5 h-5.5 bg-red-600 rounded-md flex items-center justify-center text-white text-[10px] font-black shadow-md">
                                +
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Cart Button (Floating Action Panel) */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3.5 px-4.5 rounded-2xl flex items-center justify-between shadow-xl shadow-red-600/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-black">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </div>
              <span className="text-xs uppercase tracking-wider font-black">Lihat Keranjang</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-mono font-black">{formatRupiah(subtotal)}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </button>
        </div>
      )}

      {/* 1. Customizer Dialog Modal */}
      {customizingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-slate-900 border-t sm:border border-white/10 sm:rounded-3xl p-5 flex flex-col justify-between max-h-[90vh] overflow-y-auto rounded-t-3xl animate-in slide-in-from-bottom duration-300">
            <div>
              <div className="flex justify-between items-start border-b border-white/5 pb-3">
                <div>
                  <span className="text-[8px] font-extrabold text-red-500 uppercase tracking-widest font-mono block">
                    {customizingProduct.category}
                  </span>
                  <h3 className="text-sm font-extrabold text-white mt-1 leading-tight">{customizingProduct.name}</h3>
                  <span className="text-xs font-mono font-bold text-yellow-500 block mt-1">
                    {formatRupiah(customizingProduct.sellPrice)}
                  </span>
                </div>
                <button
                  onClick={() => setCustomizingProduct(null)}
                  className="p-1 bg-white/5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Spicy level selector */}
              <div className="my-5">
                <label className="text-[9px] font-black text-slate-455 uppercase tracking-wider block mb-2.5">
                  Tingkat Kepedasan
                </label>
                {customizingProduct.category === "Kebab" || customizingProduct.category === "Lumpia Beef" ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Tidak Pedas", lvl: 0 },
                      { label: "Sedang", lvl: 1 },
                      { label: "Pedas", lvl: 2 },
                    ].map((opt) => {
                      const isSelected = spicyLevel === opt.lvl;
                      return (
                        <button
                          key={opt.lvl}
                          type="button"
                          onClick={() => setSpicyLevel(opt.lvl)}
                          className={`py-3 border rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center ${
                            isSelected
                              ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/25 font-black"
                              : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-6 gap-2">
                      {[0, 1, 2, 3, 4, 5].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setSpicyLevel(lvl)}
                          className={`py-2.5 border rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                            spicyLevel === lvl
                              ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/25"
                              : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                    {(spicyLevel === 4 || spicyLevel === 5) && (
                      <span className="text-[9px] text-yellow-500 font-bold block mt-1.5">
                        * Level 4 & 5 ada biaya tambahan +Rp 2.000
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Size Selection (Only for Kebab and Spaghetti Goreng) */}
              {(customizingProduct.category === "Kebab" || customizingProduct.name.toLowerCase().includes("spaghetti")) && (
                <div className="my-5 border-t border-white/5 pt-4">
                  <label className="text-[9px] font-black text-slate-455 uppercase tracking-wider block mb-2.5">
                    {customizingProduct.name.toLowerCase().includes("spaghetti") ? "Pilihan Porsi Spaghetti" : "Ukuran Kebab"}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(customizingProduct.name.toLowerCase().includes("spaghetti")
                      ? ["Single", "Double"]
                      : ["REGULER", "LARGE"]
                    ).map((sz) => {
                      const isSelected = selectedSize === sz;
                      const surcharge = (customizingProduct.name.toLowerCase().includes("spaghetti") && sz === "Double") ? 4000 : (sz === "LARGE" ? 5000 : 0);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => {
                            setSelectedSize(sz);
                            if (customizingProduct.category === "Kebab") {
                              if (sz === "REGULER" && (selectedFilling === "Chicken Katsu" || selectedFilling === "Special")) {
                                setSelectedFilling("Beef");
                              } else if (sz === "LARGE" && selectedFilling === "Beef Slice") {
                                setSelectedFilling("Beef");
                              }
                            }
                          }}
                          className={`py-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                            isSelected
                              ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/25"
                              : "bg-white/5 border-white/5 text-slate-450 hover:text-white"
                          }`}
                        >
                          <span>{sz}</span>
                          {surcharge > 0 && (
                            <span className="text-[8px] text-yellow-500 font-mono mt-0.5">
                              +{formatRupiah(surcharge)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Filling Selection (Kebab) */}
              {customizingProduct.category === "Kebab" && (
                <div className="my-5 border-t border-white/5 pt-4">
                  <label className="text-[9px] font-black text-slate-455 uppercase tracking-wider block mb-2.5">
                    Varian Isi Kebab
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Beef Slice", reqLarge: false, reqReguler: true },
                      { label: "Beef", reqLarge: false, reqReguler: false },
                      { label: "Chicken Katsu", reqLarge: true, reqReguler: false },
                      { label: "Special", reqLarge: true, reqReguler: false },
                    ].map((filling) => {
                      const isSelected = selectedFilling === filling.label;
                      const isDisabled = (filling.reqLarge && selectedSize === "REGULER") || (filling.reqReguler && selectedSize === "LARGE");
                      let surcharge = 0;
                      if (selectedSize === "REGULER" && filling.label === "Beef") surcharge = 2000;
                      if (selectedSize === "LARGE" && filling.label === "Special") surcharge = 5000;

                      if (isDisabled) return null;

                      return (
                        <button
                          key={filling.label}
                          type="button"
                          onClick={() => setSelectedFilling(filling.label)}
                          className={`py-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                            isSelected
                              ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/25"
                              : "bg-white/5 border-white/5 text-slate-450 hover:text-white"
                          }`}
                        >
                          <span>{filling.label}</span>
                          {surcharge > 0 && (
                            <span className="text-[8px] text-yellow-500 font-mono mt-0.5">
                              +{formatRupiah(surcharge)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Filling Selection (Lumpia Beef) */}
              {customizingProduct.category === "Lumpia Beef" && (
                <div className="my-5 border-t border-white/5 pt-4">
                  <label className="text-[9px] font-black text-slate-455 uppercase tracking-wider block mb-2.5">
                    Varian Isi Lumpia Beef
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Beef Slice", surcharge: 0 },
                      { label: "Kornet", surcharge: 0 },
                      { label: "Beef Patty", surcharge: 5000 },
                      { label: "Chicken Katsu", surcharge: 5000 },
                      { label: "Special", surcharge: 10000 },
                    ].map((filling) => {
                      const isSelected = selectedFilling === filling.label;
                      return (
                        <button
                          key={filling.label}
                          type="button"
                          onClick={() => setSelectedFilling(filling.label)}
                          className={`py-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                            isSelected
                              ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/25"
                              : "bg-white/5 border-white/5 text-slate-450 hover:text-white"
                          }`}
                        >
                          <span>{filling.label}</span>
                          {filling.surcharge > 0 && (
                            <span className="text-[8px] text-yellow-500 font-mono mt-0.5">
                              +{formatRupiah(filling.surcharge)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Toppings selector (Only for non-Kebab, non-Lumpia Beef) */}
              {customizingProduct.category !== "Kebab" && customizingProduct.category !== "Lumpia Beef" && (
                <div className="my-5 border-t border-white/5 pt-4">
                  <label className="text-[9px] font-black text-slate-455 uppercase tracking-wider block mb-2">
                    Toppings Tambahan
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 no-scrollbar">
                    {toppingsList.map((t) => {
                      const isPremium = isCabang2 
                        ? ["Ceker", "Kulit Ayam", "Pangsit Goreng", "Telur"].includes(t)
                        : ["Beef Slice", "Keju Slice", "Telur"].includes(t);
                      const premiumPrice = isCabang2 
                        ? (t === "Telur" ? 4000 : 2500)
                        : (t === "Beef Slice" ? 2500 : t === "Telur" ? 4000 : 3000);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleToggleTopping(t)}
                          className={`p-2.5 border rounded-xl text-left text-xs font-semibold flex flex-col justify-between h-14 transition-all cursor-pointer ${
                            selectedToppings.includes(t)
                              ? "bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-sm"
                              : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                          }`}
                        >
                          <span className="block leading-none truncate w-full">{t}</span>
                          <span className={`text-[9.5px] font-mono font-bold leading-none mt-1 select-none ${
                            isPremium ? "text-yellow-400 font-extrabold" : "text-slate-500"
                          }`}>
                            {isPremium ? `+${formatRupiah(premiumPrice)}` : "+Rp 2.000"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm buttons */}
            <div className="border-t border-white/5 pt-4 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-slate-450 uppercase font-black tracking-wider block">Harga Item</span>
                <span className="text-sm font-mono font-black text-yellow-500">
                  {formatRupiah(calculateConfiguredPrice(
                    customizingProduct, 
                    spicyLevel, 
                    selectedToppings,
                    customizingProduct.category === "Kebab" || customizingProduct.category === "Lumpia Beef" ? selectedFilling : undefined,
                    customizingProduct.category === "Kebab" ? selectedSize : undefined
                  ))}
                </span>
              </div>
              <button
                type="button"
                onClick={handleConfirmCustomization}
                className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-red-600/20 active:scale-[0.98] cursor-pointer"
              >
                Tambahkan Ke Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Cart Drawer Sheet Overlay */}
      {cartOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end">
          <form
            onSubmit={handlePlaceOrder}
            className="w-full max-w-md bg-slate-900 h-full flex flex-col justify-between border-l border-white/5 animate-in slide-in-from-right duration-300 overflow-hidden"
          >
            {/* Header - Fixed */}
            <div className="flex justify-between items-center border-b border-white/5 p-5 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-black text-white uppercase">Keranjang Pemesanan</h3>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="p-1 bg-white/5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body - Cart items + Checkout details */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
              {/* Items List */}
              <div className="flex flex-col gap-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white/4 border border-white/5 rounded-2xl flex items-center justify-between gap-3"
                  >
                    <div className="overflow-hidden flex-1">
                      <h4 className="text-xs font-bold text-white truncate">{item.product.name}</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {!(isCabang2 
                          ? (item.product.category === "Tea Series" || item.product.category === "Delight Series" || item.product.category.toLowerCase() === "chocolatte") 
                          : ["Snack", "Qalla Coffee", "Qalla Tea", "Qalla Juice", "Kebab", "Lumpia Beef"].includes(item.product.category)
                        ) && (
                          <span className="text-[8px] font-black bg-red-500/10 text-red-400 px-1 py-0.5 rounded uppercase font-mono">
                            Lvl {item.spicyLevel}
                          </span>
                        )}
                        {item.size && (
                          <span className="text-[8px] font-black bg-cyan-500/10 text-cyan-400 px-1 py-0.5 rounded uppercase font-mono">
                            {item.size}
                          </span>
                        )}
                        {item.filling && (
                          <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-400 px-1 py-0.5 rounded uppercase font-mono">
                            {item.filling}
                          </span>
                        )}
                        {item.toppings.length > 0 && (
                          <span className="text-[8px] font-black bg-yellow-500/10 text-yellow-400 px-1 py-0.5 rounded uppercase max-w-[150px] truncate" title={item.toppings.join(", ")}>
                            {item.toppings.join(", ")}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold text-yellow-500 block mt-1">
                        {formatRupiah(item.sellPrice)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        className="w-6.5 h-6.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-mono font-extrabold text-white w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        className="w-6.5 h-6.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

              </div>

              {/* Place Order Fields */}
              <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-455 uppercase tracking-wider block mb-1.5">
                    Nama Pemesan (Untuk Antrean)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Andi, Rina, Order 5"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 placeholder-slate-600"
                  />
                </div>

                {/* Promo Checkbox & WhatsApp Input */}
                {(() => {
                  const MIN_PROMO_SUBTOTAL = 15000;
                  const VIP_PROMO_SUBTOTAL = 50000;
                  const isPromoUnlocked = subtotal >= MIN_PROMO_SUBTOTAL;
                  const isVipUnlocked = subtotal >= VIP_PROMO_SUBTOTAL;
                  
                  let percent = 0;
                  if (subtotal <= MIN_PROMO_SUBTOTAL) {
                    percent = (subtotal / MIN_PROMO_SUBTOTAL) * 40;
                  } else if (subtotal <= VIP_PROMO_SUBTOTAL) {
                    percent = 40 + ((subtotal - MIN_PROMO_SUBTOTAL) / (VIP_PROMO_SUBTOTAL - MIN_PROMO_SUBTOTAL)) * 60;
                  } else {
                    percent = 100;
                  }

                  const remainingNormal = MIN_PROMO_SUBTOTAL - subtotal;
                  const remainingVip = VIP_PROMO_SUBTOTAL - subtotal;

                  const hasDuplicate = (whatsappUsed && whatsappNumber.trim().length >= 9) || 
                                      (emailUsed && emailAddress.trim().includes("@"));

                  return (
                    <div className={`border rounded-2xl p-4 my-1 transition-all duration-300 ${
                      isVipUnlocked
                        ? "bg-indigo-500/5 border-indigo-500/20 shadow-lg shadow-indigo-500/5"
                        : isPromoUnlocked 
                          ? "bg-emerald-500/5 border-emerald-500/20 shadow-lg shadow-emerald-500/5" 
                          : "bg-yellow-500/5 border-yellow-500/10"
                    }`}>
                      {/* Progress Header */}
                      <div className="mb-2">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-1.5">
                            {isVipUnlocked ? (
                              <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 animate-bounce">
                                <Sparkles className="w-3 h-3" />
                              </div>
                            ) : isPromoUnlocked ? (
                              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <Check className="w-3 h-3" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                                <Gift className="w-3 h-3" />
                              </div>
                            )}
                            <span className="text-[10px] font-black tracking-wide text-white uppercase flex items-center gap-1">
                              {isCabang2 ? "Promo Tea Series" : "Promo Qalla Tea"} {isVipUnlocked && <span className="text-indigo-400 font-extrabold text-[8px] px-1 bg-indigo-500/20 rounded">VIP</span>}
                            </span>
                          </div>
                          
                          <div className="flex gap-1">
                            <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full ${
                              isPromoUnlocked ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
                            }`}>
                              Min. 15k
                            </span>
                            <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full ${
                              isVipUnlocked ? "bg-indigo-500/20 text-indigo-400 animate-pulse" : "bg-slate-800 text-slate-400"
                            }`}>
                              VIP 50k
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar with markers */}
                        <div className="relative w-full h-2 bg-slate-800 rounded-full my-2.5">
                          {/* Progress Fill */}
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ease-out ${
                              isVipUnlocked 
                                ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500" 
                                : isPromoUnlocked 
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-400" 
                                  : "bg-gradient-to-r from-amber-500 to-orange-400"
                            }`}
                            style={{ width: `${percent}%` }}
                          />

                          {/* Marker Rp 15.000 (at 40%) */}
                          <div className="absolute top-1/2 left-[40%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full border flex items-center justify-center transition-all ${
                              isPromoUnlocked 
                                ? "bg-emerald-500 border-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" 
                                : "bg-slate-900 border-slate-700"
                            }`}>
                              {isPromoUnlocked && <span className="text-[6px] text-white">✓</span>}
                            </div>
                          </div>

                          {/* Marker Rp 50.000 (at 100%) */}
                          <div className="absolute top-1/2 left-[100%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full border flex items-center justify-center transition-all ${
                              isVipUnlocked 
                                ? "bg-indigo-500 border-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.8)]" 
                                : "bg-slate-900 border-slate-700"
                            }`}>
                              {isVipUnlocked && <span className="text-[6px] text-white">★</span>}
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar Labels */}
                        <div className="flex justify-between items-center text-[8px] font-black text-slate-500 uppercase tracking-wider mb-2">
                          <span>Rp 15.000</span>
                          <span>Rp 50.000</span>
                        </div>

                        {/* Progress Status Text */}
                        <div className="text-[9px] font-bold mt-1">
                          {isVipUnlocked ? (
                            <span className="text-indigo-400 flex items-center gap-1 font-extrabold">
                              {isCabang2 ? "🌟 VIP UNLOCKED: Free Es Teh Manis Activated!" : "🌟 VIP UNLOCKED: Free Qalla Tea Activated!"}
                            </span>
                          ) : isPromoUnlocked ? (
                            <span className="text-emerald-400">
                              🎉 Promo Standar terbuka! Tambah <span className="font-mono text-white">{formatRupiah(remainingVip)}</span> lagi untuk klaim instan VIP (Pasti dapat).
                            </span>
                          ) : (
                            <span className="text-yellow-500">
                              Kurang <span className="font-mono text-white">{formatRupiah(remainingNormal)}</span> lagi untuk teh gratis.
                            </span>
                          )}
                        </div>
                      </div>

                      {isVipUnlocked ? (
                        /* VIP Reward Active Banner - No Inputs Needed */
                        <div className="mt-3 border-t border-white/5 pt-3.5 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2 animate-bounce">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest">🌟 VIP Promo Active</h4>
                          <p className="text-[10px] text-slate-350 font-bold max-w-[285px] leading-relaxed mt-1">
                            {isCabang2
                              ? "Free Es Teh Manis has been automatically added to your cart! No phone number or email required."
                              : "Free Jasmine Tea has been automatically added to your cart! No phone number or email required."}
                          </p>
                        </div>
                      ) : (
                        /* Normal Checkbox & Inputs */
                        <>
                          <label className={`flex items-start gap-3 select-none mt-3 ${isPromoUnlocked ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={claimPromo && isPromoUnlocked}
                                disabled={!isPromoUnlocked}
                                onChange={(e) => setClaimPromo(e.target.checked)}
                                className="w-4 h-4 rounded text-emerald-600 bg-white/5 border-white/10 focus:ring-0 focus:ring-offset-0 mt-0.5 cursor-pointer accent-emerald-600 disabled:cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <span className="text-xs font-extrabold text-white block">
                                {isCabang2 ? "Klaim GRATIS Es Teh Tawar 🍃" : "Klaim GRATIS Qalla Tea (Jasmine) 🍃"}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium block mt-0.5 leading-tight">
                                Masukkan No. WhatsApp dan Email untuk klaim promo.
                              </span>
                            </div>
                          </label>

                          {claimPromo && isPromoUnlocked && (
                            <div className="mt-3 border-t border-white/5 pt-3 animate-in fade-in slide-in-from-top-1 duration-200 flex flex-col gap-3">
                              <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 flex justify-between">
                                  <span>Nomor WhatsApp (Aktif)</span>
                                  {whatsappUsed && whatsappNumber.trim().length >= 9 && (
                                    <span className="text-rose-455 font-extrabold animate-pulse">
                                      ⚠️ Sudah Digunakan
                                    </span>
                                  )}
                                </label>
                                <input
                                  type="tel"
                                  placeholder="Contoh: 08123456789"
                                  value={whatsappNumber}
                                  onChange={(e) => setWhatsappNumber(e.target.value)}
                                  className={`w-full bg-white/5 border rounded-2xl py-3 px-4 text-xs font-bold text-white focus:outline-none focus:ring-1 placeholder-slate-600 ${
                                    whatsappUsed && whatsappNumber.trim().length >= 9
                                      ? "border-rose-500/30 focus:ring-rose-500"
                                      : "border-white/5 focus:ring-emerald-500"
                                  }`}
                                />
                              </div>

                              <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 flex justify-between">
                                  <span>Alamat Email / Gmail</span>
                                  {emailUsed && emailAddress.trim().includes("@") && (
                                    <span className="text-rose-455 font-extrabold animate-pulse">
                                      ⚠️ Sudah Digunakan
                                    </span>
                                  )}
                                </label>
                                <input
                                  type="email"
                                  placeholder="Contoh: nama@gmail.com"
                                  value={emailAddress}
                                  onChange={(e) => setEmailAddress(e.target.value)}
                                  className={`w-full bg-white/5 border rounded-2xl py-3 px-4 text-xs font-bold text-white focus:outline-none focus:ring-1 placeholder-slate-600 ${
                                    emailUsed && emailAddress.trim().includes("@")
                                      ? "border-rose-500/30 focus:ring-rose-500"
                                      : "border-white/5 focus:ring-emerald-500"
                                  }`}
                                />
                              </div>

                              {/* Real-time Warning Banners */}
                              {hasDuplicate && (
                                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] text-rose-300 font-bold flex flex-col gap-1 animate-in fade-in duration-300">
                                  <div className="flex items-start gap-2 text-white font-extrabold">
                                    <X className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                                    <span>⚠️ Kontak Sudah Pernah Digunakan</span>
                                  </div>
                                  <p className="pl-5.5 text-slate-300 leading-normal text-[9px]">
                                    Nomor WhatsApp atau Email ini sudah pernah mengklaim promo. Anda tidak akan menerima teh gratis.
                                  </p>
                                  <div className="pl-5.5 mt-1 text-yellow-500 font-extrabold text-[9px]">
                                    Buka Kunci VIP! Tambah belanjaan senilai <span className="font-mono text-white">{formatRupiah(remainingVip)}</span> lagi agar klaim tetap berhasil tanpa pembatasan.
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="border-t border-white/5 p-5 shrink-0 bg-slate-900">
              <div className="flex justify-between items-center text-sm font-extrabold mb-4 pb-3 border-b border-dashed border-white/5">
                <span className="text-slate-400">Total Harga</span>
                <span className="text-yellow-500 font-mono text-base">{formatRupiah(subtotal)}</span>
              </div>

              <button
                type="submit"
                disabled={placingOrder}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-red-600/25 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
              >
                {placingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Mengirimkan...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Kirim Pesanan Order
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
