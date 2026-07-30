// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Expense } from '@/lib/types';
import { useAppState } from '@/components/providers/app-state-provider';
import { isMobileOrWebView, triggerPrint } from '@/lib/utils';
import { useSession } from '@/lib/auth-client';
import ClientPortal from '@/components/ClientPortal';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileSpreadsheet, 
  Activity, 
  Calendar,
  Layers,
  Sparkles,
  Award,
  Plus,
  Trash2,
  Printer,
  Download,
  CheckCircle,
  Clock,
  BookOpen,
  Wallet,
  Settings
} from 'lucide-react';

interface FinancialReportProps {
  transactions: Transaction[];
}

export default function FinancialReport({ transactions }: FinancialReportProps) {
  const { expenses, addExpense, deleteExpense, settings } = useAppState();
  const { data: session } = useSession();
  const userEmail = session?.user?.email;
  const isCabang2 = settings?.branchCode === 'CABANG_2';

  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'sixMonths' | 'year' | 'all'>('month');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'sales' | 'expenses' | 'shift'>('sales');

  // Petty Cash Flow states
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<string>('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  // Cashier Shift states
  const [shiftActive, setShiftActive] = useState<boolean>(false);
  const [startingCash, setStartingCash] = useState<number>(0);
  const [startTime, setStartTime] = useState<string>('');
  const [shiftHistory, setShiftHistory] = useState<any[]>([]);

  // Open Shift Form input
  const [inputStartingCash, setInputStartingCash] = useState('');

  // Close Shift Form inputs
  const [actualCash, setActualCash] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');

  // Load shift data from localStorage on mount
  useEffect(() => {
    const active = localStorage.getItem("miejebew_shift_active_v1") === "true";
    const startCash = parseFloat(localStorage.getItem("miejebew_shift_starting_cash_v1") || "0");
    const sTime = localStorage.getItem("miejebew_shift_start_time_v1") || "";
    const history = JSON.parse(localStorage.getItem("miejebew_shift_history_v1") || "[]");

    setShiftActive(active);
    setStartingCash(startCash);
    setStartTime(sTime);
    setShiftHistory(history);
  }, []);

  // Load custom expense categories from localStorage on mount
  useEffect(() => {
    const defaultCategories = ['Operasional', 'Belanja', 'Utilitas'];
    const saved = localStorage.getItem('warung_expense_categories');
    let cats = defaultCategories;
    if (saved) {
      try {
        cats = JSON.parse(saved);
        if (!Array.isArray(cats) || cats.length === 0) {
          cats = defaultCategories;
        }
      } catch (e) {
        cats = defaultCategories;
      }
    }
    setCustomCategories(cats);
    localStorage.setItem('warung_expense_categories', JSON.stringify(cats));
    if (cats.length > 0) {
      setExpenseCategory(cats[0]);
    }
  }, []);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Filter transactions based on selected range
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter(tx => {
      if (timeRange === 'all') return true;
      const txDate = new Date(tx.createdAt);
      if (timeRange === 'today') {
        return txDate.toDateString() === now.toDateString();
      } else if (timeRange === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return txDate >= oneWeekAgo;
      } else if (timeRange === 'month') {
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      } else if (timeRange === 'sixMonths') {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        return txDate >= sixMonthsAgo;
      } else {
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        return txDate >= oneYearAgo;
      }
    });
  }, [transactions, timeRange]);

  // Filter expenses based on selected range
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return (expenses || []).filter(exp => {
      if (timeRange === 'all') return true;
      const expDate = new Date(exp.createdAt);
      if (timeRange === 'today') {
        return expDate.toDateString() === now.toDateString();
      } else if (timeRange === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return expDate >= oneWeekAgo;
      } else if (timeRange === 'month') {
        return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
      } else if (timeRange === 'sixMonths') {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        return expDate >= sixMonthsAgo;
      } else {
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        return expDate >= oneYearAgo;
      }
    });
  }, [expenses, timeRange]);

  // Financial aggregates
  const totalGrossRevenue = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
  }, [filteredTransactions]);

  // dynamic Cost of Goods Sold (COGS/HPP) calculation from transaction items
  const totalHPP = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) => {
      const txHPP = (tx.items || []).reduce((itemSum, item) => {
        // Use costPrice or product's buyPrice, fallback to 60% of unitPrice
        const cost = item.costPrice || item.product?.buyPrice || (item.unitPrice * 0.6);
        return itemSum + (cost * (item.quantity || 0));
      }, 0);
      return sum + txHPP;
    }, 0);
  }, [filteredTransactions]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  }, [filteredExpenses]);

  // Real Net Profit = Gross Revenue - dynamic Cost of Goods Sold (COGS/HPP) - Expenses
  const netProfit = useMemo(() => {
    return totalGrossRevenue - totalHPP - totalExpenses;
  }, [totalGrossRevenue, totalHPP, totalExpenses]);

  const transactionCount = filteredTransactions.length;

  const averageTransactionValue = useMemo(() => {
    return transactionCount > 0 ? Math.round(totalGrossRevenue / transactionCount) : 0;
  }, [totalGrossRevenue, transactionCount]);

  // Profit Margin %
  const netProfitMargin = useMemo(() => {
    return totalGrossRevenue > 0 ? Math.round((netProfit / totalGrossRevenue) * 100) : 0;
  }, [netProfit, totalGrossRevenue]);

  // Detailed HPP Breakdown by sold products
  const hppBreakdown = useMemo(() => {
    const productsMap: Record<string, {
      name: string;
      category: string;
      quantity: number;
      unitPrice: number;
      unitHPP: number;
      totalHPP: number;
      totalRevenue: number;
    }> = {};

    filteredTransactions.forEach(tx => {
      (tx.items || []).forEach(item => {
        const key = item.productId || item.productName || item.id;
        if (!key) return;

        // Use costPrice or product's buyPrice, fallback to 60% of unitPrice
        const cost = item.costPrice || item.product?.buyPrice || (item.unitPrice * 0.6);
        const qty = item.quantity || 0;
        const price = item.sellPrice || item.unitPrice || 0;
        
        if (!productsMap[key]) {
          let cleanName = item.productName || item.product?.name || "Menu";
          cleanName = cleanName.split('\n')[0].trim();
          
          productsMap[key] = {
            name: cleanName,
            category: item.category || item.product?.category || "Lainnya",
            quantity: 0,
            unitPrice: price,
            unitHPP: cost,
            totalHPP: 0,
            totalRevenue: 0
          };
        }

        productsMap[key].quantity += qty;
        productsMap[key].totalHPP += (cost * qty);
        productsMap[key].totalRevenue += (price * qty);
      });
    });

    return Object.values(productsMap).sort((a, b) => b.totalHPP - a.totalHPP);
  }, [filteredTransactions]);

  // Product sales breakdown (dynamically computed from all actual items sold)
  const salesByCategory = useMemo(() => {
    const defaultCats = isCabang2
      ? ['Mie Pedas', 'Mie Tek Tek', 'Pangsit', 'Tea Series', 'Delight Series']
      : ['Mie Pedas', 'Lumpia Beef', 'Kebab', 'Snack', 'Qalla Coffee', 'Qalla Tea', 'Qalla Juice'];

    const categories: Record<string, number> = {};
    defaultCats.forEach(cat => { categories[cat] = 0; });

    filteredTransactions.forEach(tx => {
      (tx.items || []).forEach(item => {
        let category = item.category || item.product?.category || 'Lainnya';
        // Map Chocolatte → Delight Series for Cabang 2
        if (isCabang2 && category.toLowerCase() === 'chocolatte') {
          category = 'Delight Series';
        }
        const price = item.sellPrice || item.unitPrice || 0;
        const totalLine = price * (item.quantity || 0);
        
        if (categories[category] !== undefined) {
          categories[category] += totalLine;
        } else {
          categories[category] = totalLine;
        }
      });
    });

    const result = Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0 || defaultCats.includes(item.name));

    if (result.length === 0) {
      return defaultCats.map(name => ({ name, value: 0 }));
    }

    return result.sort((a, b) => b.value - a.value);
  }, [filteredTransactions, isCabang2]);

  // Payment methods breakdown
  const paymentMethodStats = useMemo(() => {
    const stats = {
      'Tunai': 0,
      'QRIS': 0,
      'Transfer': 0
    };

    filteredTransactions.forEach(tx => {
      const pm = tx.paymentMethod;
      if (pm in stats) {
        stats[pm as keyof typeof stats] += tx.total || 0;
      }
    });

    const grandTotal = Object.values(stats).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(stats).map(([method, value]) => ({
      method,
      amount: value,
      percentage: Math.round((value / grandTotal) * 100)
    }));
  }, [filteredTransactions]);

  const salesByMethod = useMemo(() => {
    const stats: Record<string, { count: number; total: number }> = {
      'Tunai': { count: 0, total: 0 },
      'QRIS': { count: 0, total: 0 },
      'Transfer': { count: 0, total: 0 }
    };

    filteredTransactions.forEach(tx => {
      const pm = tx.paymentMethod;
      if (pm in stats) {
        stats[pm].count += 1;
        stats[pm].total += tx.total || 0;
      }
    });

    return stats;
  }, [filteredTransactions]);

  // Sales Trend chart data (Hourly for 'today', daily for 'week', weekly for 'month', monthly for 6m/1y/'all')
  const salesChartData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const now = new Date();

    if (timeRange === 'today') {
      const hours = [
        { label: 'Pagi (08-11)', sum: 0 },
        { label: 'Lunch Rush (11-14)', sum: 0 },
        { label: 'Sore Nyantai (14-17)', sum: 0 },
        { label: 'Dinner Peak (17-21)', sum: 0 },
        { label: 'Malam (21-23)', sum: 0 }
      ];

      filteredTransactions.forEach(tx => {
        const hour = new Date(tx.createdAt).getHours();
        if (hour >= 8 && hour < 11) hours[0].sum += tx.total || 0;
        else if (hour >= 11 && hour < 14) hours[1].sum += tx.total || 0;
        else if (hour >= 14 && hour < 17) hours[2].sum += tx.total || 0;
        else if (hour >= 17 && hour < 21) hours[3].sum += tx.total || 0;
        else if (hour >= 21) hours[4].sum += tx.total || 0;
      });

      return hours;
    } else if (timeRange === 'week') {
      // Last 7 days by exact calendar date
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const label = `${d.getDate()} ${monthNames[d.getMonth()]}`;
        days.push({
          label,
          dateStr: d.toDateString(),
          sum: 0,
        });
      }

      filteredTransactions.forEach(tx => {
        const txDateStr = new Date(tx.createdAt).toDateString();
        const target = days.find(d => d.dateStr === txDateStr);
        if (target) {
          target.sum += tx.total || 0;
        }
      });

      return days.map(d => ({ label: d.label, sum: d.sum }));
    } else if (timeRange === 'month') {
      // 5 Weekly buckets for current month to keep chart ultra clean & readable
      const weeks = [
        { label: 'Mgg 1 (1-7)', minDay: 1, maxDay: 7, sum: 0 },
        { label: 'Mgg 2 (8-14)', minDay: 8, maxDay: 14, sum: 0 },
        { label: 'Mgg 3 (15-21)', minDay: 15, maxDay: 21, sum: 0 },
        { label: 'Mgg 4 (22-28)', minDay: 22, maxDay: 28, sum: 0 },
        { label: 'Mgg 5 (29-31)', minDay: 29, maxDay: 31, sum: 0 },
      ];

      filteredTransactions.forEach(tx => {
        const txDate = new Date(tx.createdAt);
        const day = txDate.getDate();
        const target = weeks.find(w => day >= w.minDay && day <= w.maxDay);
        if (target) {
          target.sum += tx.total || 0;
        }
      });

      return weeks.map(w => ({ label: w.label, sum: w.sum }));
    } else {
      // 'sixMonths', 'year', 'all': Monthly breakdown
      const numMonths = timeRange === 'sixMonths' ? 6 : 12;
      const months = [];
      
      for (let i = numMonths - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = monthNames[d.getMonth()] + ' ' + String(d.getFullYear()).slice(-2);
        months.push({ 
          label: monthLabel, 
          sum: 0,
          monthVal: d.getMonth(),
          yearVal: d.getFullYear()
        });
      }

      filteredTransactions.forEach(tx => {
        const txDate = new Date(tx.createdAt);
        const txMonth = txDate.getMonth();
        const txYear = txDate.getFullYear();
        
        const target = months.find(m => m.monthVal === txMonth && m.yearVal === txYear);
        if (target) {
          target.sum += tx.total || 0;
        }
      });

      // Filter out leading empty months if viewing 'all' so only months with sales or recent 6 months are shown
      if (timeRange === 'all') {
        const firstNonZero = months.findIndex(m => m.sum > 0);
        if (firstNonZero !== -1) {
          return months.slice(firstNonZero).map(m => ({ label: m.label, sum: m.sum }));
        }
      }

      return months.map(m => ({ label: m.label, sum: m.sum }));
    }
  }, [filteredTransactions, timeRange]);

  const maxChartValue = useMemo(() => {
    const m = Math.max(...salesChartData.map(d => d.sum));
    return m === 0 ? 100000 : m;
  }, [salesChartData]);

  // Find most popular catalog item in filtered dataset
  const bestSellerProduct = useMemo(() => {
    const products: Record<string, { name: string; qty: number }> = {};
    filteredTransactions.forEach(tx => {
      (tx.items || []).forEach(item => {
        const key = item.productId || item.id;
        if (key) {
          if (!products[key]) {
            let cleanName = item.product?.name || item.productName || 'Menu';
            cleanName = cleanName.split('\n')[0];
            if (cleanName.includes(' Level ')) {
              cleanName = cleanName.split(' Level ')[0];
            }
            if (cleanName.includes(' level ')) {
              cleanName = cleanName.split(' level ')[0];
            }
            if (cleanName.includes(' Level-')) {
              cleanName = cleanName.split(' Level-')[0];
            }
            if (cleanName.includes(' » ')) {
              cleanName = cleanName.split(' » ')[0];
            }
            cleanName = cleanName.trim();

            products[key] = { name: cleanName, qty: 0 };
          }
          products[key].qty += item.quantity || 0;
        }
      });
    });

    const sorted = Object.values(products).sort((a, b) => b.qty - a.qty);
    return sorted[0] || { name: 'Belum ada penjualan', qty: 0 };
  }, [filteredTransactions]);

  // Petty Cash submit handler
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseAmount) return;

    const amt = parseFloat(expenseAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Masukkan nominal pengeluaran yang valid");
      return;
    }

    setIsSubmittingExpense(true);
    try {
      await addExpense({
        title: expenseTitle.trim(),
        amount: amt,
        category: expenseCategory
      });
      setExpenseTitle('');
      setExpenseAmount('');
    } catch (err) {
      console.error(err);
      alert("Gagal mencatat pengeluaran");
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus catatan pengeluaran ini?")) return;
    try {
      await deleteExpense(id);
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus pengeluaran");
    }
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (customCategories.includes(trimmed)) {
      alert("Kategori tersebut sudah terdaftar!");
      return;
    }
    const updated = [...customCategories, trimmed];
    setCustomCategories(updated);
    localStorage.setItem('warung_expense_categories', JSON.stringify(updated));
    setNewCategoryName('');
    setExpenseCategory(trimmed); // Auto-select the newly added category
  };

  const handleDeleteCategory = (catToDelete: string) => {
    if (customCategories.length <= 1) {
      alert("Harus ada minimal 1 kategori pengeluaran!");
      return;
    }
    if (!confirm(`Apakah Anda yakin ingin menghapus kategori "${catToDelete}"? (Catatan pengeluaran lama dengan kategori ini tetap tersimpan, namun tidak akan muncul lagi sebagai pilihan dropdown)`)) {
      return;
    }
    const updated = customCategories.filter(c => c !== catToDelete);
    setCustomCategories(updated);
    localStorage.setItem('warung_expense_categories', JSON.stringify(updated));
    if (expenseCategory === catToDelete) {
      setExpenseCategory(updated[0]);
    }
  };

  const handleDeleteShiftHistory = (shiftId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus catatan shift ini dari riwayat permanen? Tindakan ini tidak dapat dibatalkan.")) return;
    const updated = shiftHistory.filter(s => s.id !== shiftId);
    setShiftHistory(updated);
    localStorage.setItem("miejebew_shift_history_v1", JSON.stringify(updated));
  };

  const handleCancelActiveShift = () => {
    if (!confirm("Apakah Anda yakin ingin membatalkan shift aktif saat ini? Saldo awal laci akan dihapus dan dibatalkan. Catatan penjualan tidak akan hilang, hanya status shift yang di-reset.")) return;
    localStorage.removeItem("miejebew_shift_active_v1");
    localStorage.removeItem("miejebew_shift_starting_cash_v1");
    localStorage.removeItem("miejebew_shift_start_time_v1");
    setShiftActive(false);
    setStartingCash(0);
    setStartTime('');
  };

  // Cashier Shift management handlers
  const handleOpenShift = () => {
    const amt = parseFloat(inputStartingCash);
    if (isNaN(amt) || amt < 0) {
      alert("Masukkan nominal modal awal laci yang valid");
      return;
    }

    const isoTime = new Date().toISOString();
    localStorage.setItem("miejebew_shift_active_v1", "true");
    localStorage.setItem("miejebew_shift_starting_cash_v1", amt.toString());
    localStorage.setItem("miejebew_shift_start_time_v1", isoTime);

    setShiftActive(true);
    setStartingCash(amt);
    setStartTime(isoTime);
    setInputStartingCash('');
  };

  const shiftCashSales = useMemo(() => {
    if (!shiftActive || !startTime) return 0;
    const start = new Date(startTime);
    return transactions
      .filter(tx => tx.paymentMethod === 'Tunai' && new Date(tx.createdAt) >= start)
      .reduce((sum, tx) => sum + (tx.total || 0), 0);
  }, [transactions, shiftActive, startTime]);

  const expectedDrawerCash = useMemo(() => {
    return startingCash + shiftCashSales;
  }, [startingCash, shiftCashSales]);

  const liveSelisih = useMemo(() => {
    const act = parseFloat(actualCash);
    if (isNaN(act)) return 0;
    return act - expectedDrawerCash;
  }, [actualCash, expectedDrawerCash]);

  const handleCloseShift = () => {
    const act = parseFloat(actualCash);
    if (isNaN(act) || act < 0) {
      alert("Masukkan nominal uang tunai aktual di laci");
      return;
    }

    const endTime = new Date().toISOString();
    const newShiftRecord = {
      id: `shift_${Date.now()}`,
      startTime,
      endTime,
      startingCash,
      cashSales: shiftCashSales,
      expectedCash: expectedDrawerCash,
      actualCash: act,
      difference: act - expectedDrawerCash,
      notes: shiftNotes.trim()
    };

    const nextHistory = [newShiftRecord, ...shiftHistory];
    localStorage.setItem("miejebew_shift_history_v1", JSON.stringify(nextHistory));
    localStorage.setItem("miejebew_shift_active_v1", "false");
    localStorage.setItem("miejebew_shift_starting_cash_v1", "0");
    localStorage.setItem("miejebew_shift_start_time_v1", "");

    setShiftHistory(nextHistory);
    setShiftActive(false);
    setStartingCash(0);
    setStartTime('');
    setActualCash('');
    setShiftNotes('');

    alert("Shift kasir berhasil ditutup dan direkonsiliasi!");
  };

  // CSV Export Handler
  const exportToCSV = () => {
    const headers = ["Invoice No", "Tanggal & Waktu", "Nama Pelanggan", "Metode Pembayaran", "Total Penjualan (Rp)", "Rincian Item"];
    
    const rows = filteredTransactions.map(tx => {
      const invoiceNo = tx.invoiceNo || tx.id;
      const dateStr = new Date(tx.createdAt).toLocaleString('id-ID');
      const customer = tx.customerName || "Umum";
      const payment = tx.paymentMethod;
      const total = tx.total || 0;
      const itemsList = (tx.items || []).map(item => {
        const cleanName = item.productName.replace(/\n/g, ' ');
        return `${cleanName} (${item.quantity || 0}x @ Rp ${item.unitPrice || 0})`;
      }).join('; ');
      
      return [invoiceNo, dateStr, customer, payment, total, itemsList];
    });

    const csvRows = [headers.join(",")];
    rows.forEach(row => {
      csvRows.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","));
    });
    
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_MieJebew_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Summary PDF handler
  const printReport = () => {
    triggerPrint();
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1 sm:pr-2 pb-8">
      
      {/* Dynamic Scoped Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media screen {
          .print-only {
            display: none !important;
          }
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          #financial-print-area, #financial-print-area * {
            visibility: visible !important;
          }
          #financial-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
            background: white !important;
            color: black !important;
            padding: 24px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      {/* Printable Area (ONLY visible in printer) */}
      <ClientPortal>
        <div id="financial-print-area" className="print-only font-sans">
          <div className="text-center border-b pb-4 mb-6">
            <h1 className="text-2xl font-black tracking-wider uppercase text-black">{settings.storeName || "MIE JEBEW GDC"}</h1>
            <p className="text-xs text-gray-600 mt-1">{settings.storeAddress || "Gelar Depok City"}</p>
            <p className="text-xs text-gray-500">Telp: {settings.ownerWhatsapp || "-"}</p>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-lg font-bold tracking-wide uppercase text-black">LAPORAN RINGKASAN KEUANGAN & PENJUALAN</h2>
            <p className="text-xs text-gray-600 mt-1">Periode: {timeRange === 'today' ? 'Hari Ini' : timeRange === 'week' ? '7 Hari Terakhir' : timeRange === 'month' ? 'Bulan Ini' : timeRange === 'sixMonths' ? '6 Bulan Terakhir' : '1 Tahun Terakhir'}</p>
            <p className="text-[10px] text-gray-500">Dicetak Pada: {new Date().toLocaleString('id-ID')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 border p-4 rounded-lg bg-gray-50">
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Omset Kotor (Revenue)</span>
              <span className="text-sm font-black text-black font-mono">{formatRupiah(totalGrossRevenue)}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Total Pengeluaran (Expenses)</span>
              <span className="text-sm font-black text-red-650 font-mono">{formatRupiah(totalExpenses)}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Transaksi Sukses</span>
              <span className="text-sm font-black text-black font-mono">{filteredTransactions.length} Transaksi</span>
            </div>
            <div className="border-t pt-2 mt-2 col-span-2">
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Estimasi Omset Bersih</span>
              <span className={`text-base font-black font-mono ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-750'}`}>
                {formatRupiah(netProfit)}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-black border-b pb-1 mb-2">Rincian Penjualan per Kategori</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-gray-550">
                  <th className="text-left py-1">Kategori</th>
                  <th className="text-center py-1">Qty Terjual</th>
                  <th className="text-right py-1">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(salesByCategory).map(([cat, info]: [string, any]) => (
                  <tr key={cat} className="border-b">
                    <td className="py-1.5 text-black font-bold">{cat}</td>
                    <td className="text-center py-1.5 text-black">{info.quantity} pcs</td>
                    <td className="text-right py-1.5 text-black font-mono font-bold">{formatRupiah(info.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-black border-b pb-1 mb-2">Metode Pembayaran</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-gray-550">
                  <th className="text-left py-1">Metode</th>
                  <th className="text-center py-1">Jumlah Transaksi</th>
                  <th className="text-right py-1">Total Dana</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(salesByMethod).map(([method, info]: [string, any]) => (
                  <tr key={method} className="border-b">
                    <td className="py-1.5 text-black font-extrabold uppercase">{method}</td>
                    <td className="text-center py-1.5 text-black">{info.count} kali</td>
                    <td className="text-right py-1.5 text-black font-mono font-bold">{formatRupiah(info.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-end mt-12 px-6">
            <div className="text-center w-48">
              <p className="text-xs text-gray-500">Petugas Shift/Kasir</p>
              <div className="h-16"></div>
              <p className="text-xs font-bold border-t pt-1 border-gray-400 text-black">{settings.userProfileName || "Kasir Utama"}</p>
            </div>
            <div className="text-center w-48">
              <p className="text-xs text-gray-500">Pemilik Warung</p>
              <div className="h-16"></div>
              <p className="text-xs font-bold border-t pt-1 border-gray-400 text-black">{settings.ownerName || "Rania"}</p>
            </div>
          </div>
        </div>
      </ClientPortal>

      {/* Top Header & Toggles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="text-red-500 w-5 h-5 sm:w-6 sm:h-6" /> Laporan Keuangan
          </h2>
          <p className="text-slate-550 dark:text-slate-400 text-xs sm:text-sm mt-1">Arsip laba rugi, petty cash, rekonsiliasi shift, dan ekspor data</p>
        </div>

        {/* Action Buttons & Time range toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Print/Export buttons */}
          <div className="flex items-center gap-1 bg-black/5 dark:bg-slate-800/50 p-1 rounded-2xl">
            <button
              onClick={exportToCSV}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Ekspor Laporan ke Excel/CSV"
            >
              <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Ekspor CSV</span>
            </button>
            <button
              onClick={printReport}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Cetak Ringkasan PDF Laporan"
            >
              <Printer className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Cetak PDF</span>
            </button>
          </div>

          {/* Timeframe selector */}
          <div className="flex bg-black/5 dark:bg-slate-800/50 p-1 rounded-2xl overflow-x-auto no-scrollbar shadow-inner">
            {(['today', 'week', 'month', 'sixMonths', 'year', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-xl transition-all duration-300 whitespace-nowrap cursor-pointer ${
                  timeRange === range
                    ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {range === 'today' ? 'Hari Ini' : range === 'week' ? '7 Hari' : range === 'month' ? 'Bulan Ini' : range === 'sixMonths' ? '6 Bulan' : range === 'year' ? '1 Tahun' : 'Semua'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="w-full grid grid-cols-3 md:flex items-end border-b border-slate-200 dark:border-white/10 gap-1 md:gap-6 pt-2.5 pb-0 no-print shadow-sm">
        <button 
          onClick={() => setActiveTab('sales')}
          className={`pb-3 pt-2 text-[11px] xs:text-xs md:text-sm font-extrabold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'sales' 
              ? 'border-red-500 text-red-600 dark:text-red-400' 
              : 'border-transparent text-slate-400 dark:text-slate-400/80 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Sales</span>
        </button>
        <button 
          onClick={() => setActiveTab('expenses')}
          className={`pb-3 pt-2 text-[11px] xs:text-xs md:text-sm font-extrabold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 relative whitespace-nowrap ${
            activeTab === 'expenses' 
              ? 'border-red-500 text-red-600 dark:text-red-400' 
              : 'border-transparent text-slate-400 dark:text-slate-400/80 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Petty Cash</span>
          {filteredExpenses.length > 0 && (
            <span className="absolute -top-1 -right-2 text-[9px] bg-red-500 text-white font-black px-1.5 py-0.5 rounded-full scale-75 animate-bounce">
              {filteredExpenses.length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('shift')}
          className={`pb-3 pt-2 text-[11px] xs:text-xs md:text-sm font-extrabold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap ${
            activeTab === 'shift' 
              ? 'border-red-500 text-red-600 dark:text-red-400' 
              : 'border-transparent text-slate-400 dark:text-slate-400/80 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Shifts</span>
          {shiftActive && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          )}
        </button>
      </div>

      {/* KPI Cards Grid - Premium Cohesive Look (Hanya tampil di tab Ringkasan Penjualan) */}
      {activeTab === 'sales' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 no-print animate-in fade-in duration-300">
          
          {/* Gross Revenue Card */}
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-[24px] p-5 border border-slate-200/50 dark:border-white/5 relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none"></div>
            <div className="flex justify-between items-start mb-3 relative z-10">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase">Omset Kotor</span>
              <div className="p-1.5 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl group-hover:scale-110 transition-transform">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <span className="text-xl font-black font-mono text-slate-800 dark:text-white tracking-tight block relative z-10">
              {formatRupiah(totalGrossRevenue)}
            </span>
            <div className="flex items-center gap-1.5 text-[9px] text-slate-550 dark:text-slate-400 font-bold mt-2">
              <Activity className="w-3 h-3 text-amber-500" />
              <span>{transactionCount} Bill ({formatRupiah(averageTransactionValue)}/bill)</span>
            </div>
          </div>

          {/* HPP Card */}
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-[24px] p-5 border border-slate-200/50 dark:border-white/5 relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all pointer-events-none"></div>
            <div className="flex justify-between items-start mb-3 relative z-10">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase">Beban HPP / COGS</span>
              <div className="p-1.5 bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl group-hover:scale-110 transition-transform">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <span className="text-xl font-black font-mono text-slate-800 dark:text-white tracking-tight block relative z-10">
              {formatRupiah(totalHPP)}
            </span>
            <div className="flex items-center gap-1.5 text-[9px] text-rose-500 dark:text-rose-400 font-bold mt-2">
              <span>Beban Bahan Baku Menu</span>
            </div>
          </div>

          {/* Expenses Card */}
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-[24px] p-5 border border-slate-200/50 dark:border-white/5 relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all pointer-events-none"></div>
            <div className="flex justify-between items-start mb-3 relative z-10">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase">Kas Keluar</span>
              <div className="p-1.5 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl group-hover:scale-110 transition-transform">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <span className="text-xl font-black font-mono text-slate-800 dark:text-white tracking-tight block relative z-10">
              {formatRupiah(totalExpenses)}
            </span>
            <div className="flex items-center gap-1.5 text-[9px] text-red-550 dark:text-red-400 font-bold mt-2">
              <span>{filteredExpenses.length} Operasional Tercatat</span>
            </div>
          </div>

          {/* Laba Bersih Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900/40 backdrop-blur-xl rounded-[24px] p-5 border border-emerald-200/50 dark:border-emerald-500/10 relative overflow-hidden group hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300">
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition-all pointer-events-none"></div>
            <div className="flex justify-between items-start mb-3 relative z-10">
              <span className="text-[10px] text-emerald-800/70 dark:text-emerald-300/70 font-bold tracking-widest uppercase">Laba Bersih Riil</span>
              <div className="p-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight block relative z-10">
              {formatRupiah(netProfit)}
            </span>
            <div className="flex items-center gap-1.5 text-[9px] text-emerald-600/80 dark:text-emerald-400/80 font-bold mt-2 relative z-10">
              <Award className="w-3 h-3" />
              <span>Bersih Setelah HPP & Operasional</span>
            </div>
          </div>

          {/* Profit Margin Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-slate-900/40 backdrop-blur-xl rounded-[24px] p-5 border border-indigo-200/50 dark:border-indigo-500/10 relative overflow-hidden group hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300">
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-indigo-500/20 dark:bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-all pointer-events-none"></div>
            <div className="flex justify-between items-start mb-3 relative z-10">
              <span className="text-[10px] text-indigo-800/70 dark:text-indigo-300/70 font-bold tracking-widest uppercase">Margin Keuntungan</span>
              <div className="p-1.5 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:scale-110 transition-transform">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <span className={`text-2xl font-black font-mono tracking-tight block relative z-10 ${netProfitMargin >= 20 ? 'text-indigo-600 dark:text-indigo-450' : 'text-amber-600 dark:text-indigo-400'}`}>
              {netProfitMargin}%
            </span>
            <div className="flex items-center gap-1.5 text-[9px] text-indigo-650 dark:text-indigo-400 font-bold mt-2 relative z-10">
              <span>Rasio Efisiensi Penjualan</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab Renderings */}
      {activeTab === 'sales' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2 no-print animate-in fade-in slide-in-from-bottom-3 duration-300">
          {/* Sales Trend Chart */}
          <div className="lg:col-span-8 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-[32px] p-5 sm:p-6 flex flex-col justify-between min-h-[340px] shadow-sm">
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Grafik Volume Omset</h3>
              <p className="text-slate-550 dark:text-slate-400 text-xs mt-1">Aktivitas penjualan di berbagai waktu</p>
            </div>

            <div className="flex items-end justify-between h-52 sm:h-64 pt-6 pb-2 px-1 sm:px-4 border-b border-slate-200 dark:border-white/10 relative">
              {/* Guide gridlines */}
              <div className="absolute inset-x-0 top-0 border-b border-dashed border-slate-200 dark:border-white/5 text-[9px] text-slate-400 font-mono pt-1 pl-1">
                {formatRupiah(maxChartValue)}
              </div>
              <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-slate-200 dark:border-white/5 text-[9px] text-slate-400 font-mono pt-1 pl-1">
                {formatRupiah(maxChartValue / 2)}
              </div>

              {salesChartData.map((data, index) => {
                const heightPercent = maxChartValue > 0 ? (data.sum / maxChartValue) * 85 : 0;
                const isHovered = hoveredBarIndex === index;
                const barHeightStyle = data.sum > 0 ? `${Math.max(8, heightPercent)}%` : '0%';

                return (
                  <div 
                    key={index}
                    className="flex flex-col items-center flex-1 gap-2 group relative h-full justify-end px-0.5 sm:px-1"
                    onMouseEnter={() => setHoveredBarIndex(index)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                  >
                    {/* Tooltip on Hover */}
                    <div className={`absolute bottom-[calc(100%+8px)] z-30 bg-slate-800 dark:bg-slate-700 text-white text-[10px] font-bold py-1.5 px-2 rounded-xl text-center shadow-lg pointer-events-none transform font-mono whitespace-nowrap transition-all duration-200 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                      {formatRupiah(data.sum)}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[3px] border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
                    </div>

                    {/* Visual Bar with Modern Gradient */}
                    <div 
                      className="w-full max-w-[32px] sm:max-w-[48px] rounded-t-2xl transition-all duration-300 relative cursor-pointer overflow-hidden"
                      style={{ 
                        height: barHeightStyle,
                        opacity: isHovered || hoveredBarIndex === null ? 1 : 0.6
                      }}
                    >
                      {data.sum > 0 && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-t from-red-600/90 to-amber-400/90 dark:from-red-600 dark:to-amber-50"></div>
                          <div className="absolute inset-x-1 top-1 bg-white/20 h-1/3 rounded-t-xl backdrop-blur-sm"></div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between px-1 sm:px-4 text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-mono pt-3">
              {salesChartData.map((data, index) => (
                <span key={index} className="flex-1 text-center leading-tight">
                  {data.label.replace(' ', '\n')}
                </span>
              ))}
            </div>
          </div>

          {/* TOP Category Share Panel */}
          <div className="lg:col-span-4 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-[32px] p-5 sm:p-6 flex flex-col shadow-sm mt-4 lg:mt-0">
            <div className="mb-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Distribusi Menu</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Kontribusi kategori menu ke omset kotor</p>
            </div>

            {/* Progress stack */}
            <div className="flex-1 flex flex-col gap-5 justify-center mb-6">
              {salesByCategory.slice(0, 8).map((category, index) => {
                const maxCategoryVal = Math.max(...salesByCategory.map(c => c.value)) || 1;
                const barPercent = maxCategoryVal === 0 ? 0 : Math.round((category.value / maxCategoryVal) * 100);

                const gradients = [
                  'from-red-600 to-red-400',
                  'from-red-500 to-orange-400',
                  'from-orange-500 to-amber-400',
                  'from-amber-500 to-yellow-400',
                  'from-yellow-500 to-yellow-300',
                  'from-emerald-500 to-teal-400',
                  'from-slate-400 to-slate-300'
                ];
                const gradientClass = gradients[Math.min(index, gradients.length - 1)];

                return (
                  <div key={category.name} className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-200">{category.name}</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white">{formatRupiah(category.value)}</span>
                    </div>
                    
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden shadow-inner border border-black/5 dark:border-white/5">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${gradientClass}`}
                        style={{ width: `${barPercent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Best Seller Highlight */}
            <div className="mt-auto p-4 bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-950/30 dark:to-amber-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] text-red-800/60 dark:text-red-200/60 font-bold uppercase tracking-wider block mb-0.5">Menu Terlaris</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white block truncate">{bestSellerProduct.name}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-mono font-black text-red-600 dark:text-red-400 bg-white/60 dark:bg-slate-900/60 px-2 py-1 rounded-lg border border-red-100 dark:border-red-900/50 shadow-sm">
                  {bestSellerProduct.qty}x
                </span>
              </div>
            </div>
          </div>

          {/* Detailed HPP Breakdown Section */}
          <div className="lg:col-span-12 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-[32px] p-5 sm:p-6 shadow-sm mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-black/10 dark:border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="text-red-500 w-4 h-4" /> Perincian Beban Bahan Baku (HPP) & Margin
                </h3>
                <p className="text-slate-550 dark:text-slate-400 text-xs mt-1">
                  Analisis laba kotor, HPP, dan margin keuntungan per varian menu terjual
                </p>
              </div>
            </div>

            {hppBreakdown.length === 0 ? (
              <div className="py-10 text-center text-slate-500 dark:text-slate-400 text-xs font-bold bg-black/2 dark:bg-white/2 rounded-2xl border border-dashed border-black/10 dark:border-white/5">
                Belum ada transaksi pada periode ini untuk memetakan HPP
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-black/15 dark:border-white/10 text-slate-550 dark:text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="pb-3 pr-2">Menu Produk</th>
                      <th className="pb-3 px-2 text-center">Qty Terjual</th>
                      <th className="pb-3 px-2 text-right">Harga Jual</th>
                      <th className="pb-3 px-2 text-right">HPP Satuan</th>
                      <th className="pb-3 px-2 text-right">Total HPP</th>
                      <th className="pb-3 px-2 text-right">Beban Share (%)</th>
                      <th className="pb-3 pl-2 text-right">Margin Keuntungan (Gross)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5 font-medium">
                    {hppBreakdown.map((item) => {
                      const sharePercent = totalHPP > 0 ? Math.round((item.totalHPP / totalHPP) * 100) : 0;
                      const unitMargin = item.unitPrice - item.unitHPP;
                      const marginPercent = item.unitPrice > 0 ? Math.round((unitMargin / item.unitPrice) * 100) : 0;

                      return (
                        <tr key={item.name} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="py-3.5 pr-2">
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 block">
                              {item.name}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider font-bold text-red-500">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-350">
                            {item.quantity} porsi
                          </td>
                          <td className="py-3.5 px-2 text-right font-mono text-slate-500 dark:text-slate-400">
                            {formatRupiah(item.unitPrice)}
                          </td>
                          <td className="py-3.5 px-2 text-right font-mono text-slate-500 dark:text-slate-400">
                            {formatRupiah(item.unitHPP)}
                          </td>
                          <td className="py-3.5 px-2 text-right font-mono font-extrabold text-slate-800 dark:text-white">
                            {formatRupiah(item.totalHPP)}
                          </td>
                          <td className="py-3.5 px-2 text-right">
                            <span className="font-mono text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-lg">
                              {sharePercent}%
                            </span>
                          </td>
                          <td className="py-3.5 pl-2 text-right">
                            <div className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                              +{formatRupiah(unitMargin * item.quantity)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold">
                              Margin: {marginPercent}%
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2 no-print animate-in fade-in slide-in-from-bottom-3 duration-300">
          
          {/* Form recording expense (Left side) */}
          <div className="lg:col-span-5 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-[32px] p-5 sm:p-6 shadow-sm flex flex-col">
            <div className="mb-6">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Catat Pengeluaran Operasional
              </h3>
              <p className="text-slate-550 dark:text-slate-400 text-xs mt-1">Gunakan untuk mencatat belanja es batu, bumbu, utilitas, plastik, dll.</p>
            </div>

            <form onSubmit={handleAddExpense} className="flex flex-col gap-4 flex-1">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Keterangan / Item</label>
                <input
                  type="text"
                  placeholder="Misal: Belanja Es Batu Kristal"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  className="w-full bg-black/5 dark:bg-slate-800 border border-slate-200/50 dark:border-white/5 rounded-2xl py-3 px-4 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Kategori Pengeluaran</label>
                  <button
                    type="button"
                    onClick={() => setIsManagingCategories(true)}
                    className="text-[10px] font-extrabold text-red-650 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer no-print"
                  >
                    <Settings className="w-3 h-3 animate-spin-hover" /> Kelola Kategori
                  </button>
                </div>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full bg-black/5 dark:bg-slate-800 border border-slate-200/50 dark:border-white/5 rounded-2xl py-3 px-4 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 cursor-pointer"
                >
                  {customCategories.map((cat) => (
                    <option key={cat} value={cat} className="dark:bg-slate-900">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Nominal (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-450 font-mono">Rp</span>
                  <input
                    type="number"
                    placeholder="15000"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full bg-black/5 dark:bg-slate-800 border border-slate-200/50 dark:border-white/5 rounded-2xl py-3 pl-10 pr-4 text-xs font-black text-slate-800 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingExpense}
                className="w-full bg-gradient-to-r from-red-600 to-amber-500 text-white font-extrabold text-xs py-3.5 px-4 rounded-2xl shadow-md shadow-red-500/10 hover:shadow-red-500/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-auto"
              >
                <Plus className="w-4 h-4" /> {isSubmittingExpense ? 'Mencatat...' : 'Simpan Pengeluaran'}
              </button>
            </form>
          </div>

          {/* List of expenses (Right side) */}
          <div className="lg:col-span-7 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-[32px] p-5 sm:p-6 shadow-sm flex flex-col">
            <div className="mb-4">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="text-red-500 w-4 h-4" /> Buku Kas Harian ({filteredExpenses.length})
              </h3>
              <p className="text-slate-550 dark:text-slate-400 text-xs mt-1">Daftar kas keluar dalam rentang waktu yang terfilter di atas</p>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[380px] pr-1">
              {filteredExpenses.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-405">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Belum Ada Pengeluaran</h4>
                    <p className="text-[10px] text-slate-450 dark:text-slate-450 mt-0.5">Catat pengeluran operasional di panel sebelah kiri</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredExpenses.map((exp) => (
                    <div 
                      key={exp.id}
                      className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between hover:border-slate-350 dark:hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl shrink-0">
                          <TrendingDown className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 pr-1">
                          <span className="text-xs font-bold text-slate-800 dark:text-white block truncate leading-tight">{exp.title}</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md text-white ${
                              exp.category === 'Operasional' 
                                ? 'bg-amber-600' 
                                : exp.category === 'Belanja' 
                                ? 'bg-blue-600' 
                                : 'bg-purple-600'
                            }`}>
                              {exp.category}
                            </span>
                            <span className="text-[9px] text-slate-450 dark:text-slate-400 font-mono">
                              {new Date(exp.createdAt).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-black font-mono text-red-600 dark:text-red-400">
                          -{formatRupiah(exp.amount)}
                        </span>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shift' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2 no-print animate-in fade-in slide-in-from-bottom-3 duration-300">
          
          {/* Shift Panel Left (Either Open form or Live status) */}
          <div className="lg:col-span-5 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-[32px] p-5 sm:p-6 shadow-sm flex flex-col min-h-[380px]">
            {!shiftActive ? (
              // Buka shift form
              <div className="flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Wallet className="text-red-500 w-4 h-4" /> Buka Shift Kasir Baru
                  </h3>
                  <p className="text-slate-550 dark:text-slate-400 text-xs mt-1">Mulai shift baru dan input modal awal laci untuk pencatatan rekonsiliasi yang aman.</p>
                </div>

                <div className="flex flex-col gap-4 flex-1">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Modal Awal Laci Tunai (Rp)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-450 font-mono">Rp</span>
                      <input
                        type="number"
                        placeholder="100000"
                        value={inputStartingCash}
                        onChange={(e) => setInputStartingCash(e.target.value)}
                        className="w-full bg-black/5 dark:bg-slate-800 border border-slate-200/50 dark:border-white/5 rounded-2xl py-3 pl-10 pr-4 text-xs font-black text-slate-800 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-red-500/50"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleOpenShift}
                    className="w-full bg-gradient-to-r from-red-600 to-amber-505 text-white font-extrabold text-xs py-3.5 px-4 rounded-2xl shadow-md shadow-red-500/10 hover:shadow-red-500/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-auto"
                  >
                    <CheckCircle className="w-4 h-4" /> Buka Shift Sekarang
                  </button>
                </div>
              </div>
            ) : (
              // Active shift status
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Wallet className="text-red-500 w-4 h-4" /> Status Shift Aktif
                    </h3>
                    <span className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[8px] font-black px-2 py-0.5 rounded-full border border-emerald-500/20 animate-pulse">
                      SHIFT BERJALAN
                    </span>
                  </div>

                  <div className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-2">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Mulai Sejak</span>
                      <span className="text-xs text-slate-800 dark:text-white font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-2">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Modal Awal Laci</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-white font-mono">
                        {formatRupiah(startingCash)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-2">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Penjualan Tunai Shift</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatRupiah(shiftCashSales)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Ekspektasi Uang Laci</span>
                      <span className="text-sm font-black text-slate-850 dark:text-white font-mono bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 px-2 py-0.5 rounded-lg shadow-sm">
                        {formatRupiah(expectedDrawerCash)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-4">
                  <div className="text-[10px] text-slate-450 dark:text-slate-450 italic bg-slate-50/50 dark:bg-slate-850/20 p-3 rounded-xl border border-dashed border-slate-200 dark:border-white/5 leading-relaxed">
                    Lakukan hitung manual uang tunai laci kasir saat shift berakhir dan masukkan nominal di panel rekonsiliasi sebelah kanan untuk menutup shift.
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelActiveShift}
                    className="w-full bg-slate-100/80 hover:bg-red-50 hover:text-red-600 dark:bg-slate-800/80 dark:hover:bg-red-950/20 dark:hover:text-red-400 text-slate-500 font-extrabold text-[10px] sm:text-xs py-2.5 rounded-2xl transition-all border border-slate-200/50 dark:border-white/5 cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.97] no-print"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Batalkan / Reset Shift Aktif Ini
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Shift Panel Right (Archived logs if shift is not active, Close Shift form if active) */}
          <div className="lg:col-span-7 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-[32px] p-5 sm:p-6 shadow-sm flex flex-col min-h-[380px]">
            {shiftActive ? (
              // Tutup Shift Form
              <div className="flex flex-col h-full justify-between gap-4">
                <div className="mb-4">
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle className="text-red-500 w-4 h-4" /> Rekonsiliasi Drawer & Tutup Shift
                  </h3>
                  <p className="text-slate-550 dark:text-slate-400 text-xs mt-1">Input nominal uang fisik tunai yang Anda hitung di laci saat ini.</p>
                </div>

                <div className="flex flex-col gap-4 flex-1">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Uang Tunai Fisik Aktual (Rp)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-450 font-mono">Rp</span>
                      <input
                        type="number"
                        placeholder="Misal: 650000"
                        value={actualCash}
                        onChange={(e) => setActualCash(e.target.value)}
                        className="w-full bg-black/5 dark:bg-slate-800 border border-slate-200/50 dark:border-white/5 rounded-2xl py-3 pl-10 pr-4 text-xs font-black text-slate-800 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-red-500/50"
                      />
                    </div>
                  </div>

                  {actualCash && (
                    <div className="flex items-center justify-between p-3.5 bg-black/5 dark:bg-slate-850/40 border border-slate-200/50 dark:border-white/5 rounded-2xl">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Kalkulasi Selisih Laci</span>
                        <span className="text-xs text-slate-450 mt-0.5 block">Aktual vs Ekspektasi Uang Tunai</span>
                      </div>
                      <div>
                        {liveSelisih === 0 ? (
                          <span className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-xl shadow-sm border border-emerald-400/20">
                            SEPADAN / COCOK (Rp 0)
                          </span>
                        ) : liveSelisih > 0 ? (
                          <span className="bg-emerald-600 dark:bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-xl shadow-sm border border-emerald-400/20">
                            LEBIH (+{formatRupiah(liveSelisih)})
                          </span>
                        ) : (
                          <span className="bg-red-650 dark:bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-xl shadow-sm border border-red-400/20 animate-pulse">
                            KURANG ({formatRupiah(liveSelisih)})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Catatan Shift (Opsional)</label>
                    <input
                      type="text"
                      placeholder="Contoh: Kurang 2000 karena salah kembalian nota #..."
                      value={shiftNotes}
                      onChange={(e) => setShiftNotes(e.target.value)}
                      className="w-full bg-black/5 dark:bg-slate-800 border border-slate-200/50 dark:border-white/5 rounded-2xl py-3 px-4 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    />
                  </div>

                  <button
                    onClick={handleCloseShift}
                    className="w-full bg-gradient-to-r from-red-600 to-amber-500 text-white font-extrabold text-xs py-3.5 px-4 rounded-2xl shadow-md shadow-red-500/10 hover:shadow-red-500/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-auto"
                  >
                    <CheckCircle className="w-4 h-4" /> Simpan Rekonsiliasi & Tutup Shift
                  </button>
                </div>
              </div>
            ) : (
              // Shift History log
              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock className="text-red-500 w-4 h-4" /> Arsip Log Shift Kasir ({shiftHistory.length})
                  </h3>
                  <p className="text-slate-550 dark:text-slate-400 text-xs mt-1">Riwayat rekonsiliasi dan selisih kasir terdahulu</p>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[380px] pr-1">
                  {shiftHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-center py-12">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-350">Belum Ada Riwayat Shift</h4>
                        <p className="text-[10px] text-slate-450 dark:text-slate-450 mt-0.5">Selesaikan shift kasir untuk melihat arsip log di sini</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {shiftHistory.map((shift) => (
                        <div 
                          key={shift.id}
                          className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-3 hover:border-slate-350 dark:hover:border-white/10 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs font-black text-slate-850 dark:text-white">
                                Shift {new Date(shift.startTime).toLocaleDateString('id-ID')}
                              </span>
                              <span className="text-[9px] text-slate-450 dark:text-slate-400 font-mono block mt-0.5">
                                Period: {new Date(shift.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <div>
                                {shift.difference === 0 ? (
                                  <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-black px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    COCOK
                                  </span>
                                ) : shift.difference > 0 ? (
                                  <span className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full">
                                    LEBIH (+{formatRupiah(shift.difference)})
                                  </span>
                                ) : (
                                  <span className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full animate-pulse">
                                    SELISIH ({formatRupiah(shift.difference)})
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteShiftHistory(shift.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all cursor-pointer no-print"
                                title="Hapus Riwayat Shift"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/40 dark:border-white/5 text-[10px] text-center font-mono">
                            <div>
                              <span className="text-[8px] text-slate-500 uppercase block mb-0.5">Modal Awal</span>
                              <span className="font-bold text-slate-700 dark:text-slate-350">{formatRupiah(shift.startingCash)}</span>
                            </div>
                            <div>
                              <span className="text-[8px] text-slate-500 uppercase block mb-0.5">Tunai Shift</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(shift.cashSales)}</span>
                            </div>
                            <div>
                              <span className="text-[8px] text-slate-500 uppercase block mb-0.5">Uang Aktual</span>
                              <span className="font-bold text-slate-800 dark:text-white">{formatRupiah(shift.actualCash)}</span>
                            </div>
                          </div>

                          {shift.notes && (
                            <div className="text-[9px] text-slate-550 dark:text-slate-400 italic bg-black/5 dark:bg-slate-950/20 px-3 py-1.5 rounded-lg border border-black/5 dark:border-white/5">
                              Catatan: {shift.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Kategori Management Modal */}
      {isManagingCategories && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200 no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[32px] w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 animate-in scale-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-white/5">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Settings className="text-red-500 w-4 h-4" /> Kelola Kategori
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-1">Tambah atau hapus kategori kas keluar operasional</p>
              </div>
              <button
                onClick={() => setIsManagingCategories(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold transition-all flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* List of current categories */}
            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
              <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Daftar Kategori ({customCategories.length})</label>
              {customCategories.map((cat) => (
                <div
                  key={cat}
                  className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-white/5 rounded-2xl py-2 px-3 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{cat}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    disabled={customCategories.length <= 1}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                    title="Hapus Kategori"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new category form */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Tambah Kategori Baru</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Misal: Gaji Karyawan"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 bg-black/5 dark:bg-slate-800 border border-slate-200/50 dark:border-white/5 rounded-2xl py-2.5 px-4 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="bg-gradient-to-r from-red-650 to-amber-500 hover:brightness-110 text-white font-extrabold text-xs px-4 rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-[0.97]"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setIsManagingCategories(false)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-200 font-extrabold text-xs py-2.5 px-5 rounded-2xl transition-all cursor-pointer active:scale-[0.97]"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
