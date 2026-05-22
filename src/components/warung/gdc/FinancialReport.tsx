// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { Transaction } from '@/lib/types';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileSpreadsheet, 
  Activity, 
  Calendar,
  Layers,
  Sparkles,
  Award
} from 'lucide-react';

interface FinancialReportProps {
  transactions: Transaction[];
}

export default function FinancialReport({ transactions }: FinancialReportProps) {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Simulated operational factor overhead: e.g. 45% represents active cost of ingredients and packaging (HPP), 55% represents clean profit!
  const hppFactor = 0.45;

  // Filter transactions based on selected range
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter(tx => {
      const txDate = new Date(tx.createdAt);
      if (timeRange === 'today') {
        return txDate.toDateString() === now.toDateString();
      } else if (timeRange === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return txDate >= oneWeekAgo;
      } else {
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        return txDate >= oneMonthAgo;
      }
    });
  }, [transactions, timeRange]);

  // Financial aggregates
  const totalGrossRevenue = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) => sum + tx.total, 0);
  }, [filteredTransactions]);

  const estimatedHpp = useMemo(() => {
    return Math.round(totalGrossRevenue * hppFactor);
  }, [totalGrossRevenue]);

  const netProfit = useMemo(() => {
    return totalGrossRevenue - estimatedHpp;
  }, [totalGrossRevenue, estimatedHpp]);

  const transactionCount = filteredTransactions.length;

  const averageTransactionValue = useMemo(() => {
    return transactionCount > 0 ? Math.round(totalGrossRevenue / transactionCount) : 0;
  }, [totalGrossRevenue, transactionCount]);

  // Product sales breakdown (dynamically computed from all actual items sold)
  const salesByCategory = useMemo(() => {
    const categories: Record<string, number> = {};

    filteredTransactions.forEach(tx => {
      tx.items.forEach(item => {
        const category = item.category || item.product?.category || 'Lainnya';
        const price = item.sellPrice || item.unitPrice || 0;
        if (categories[category] !== undefined) {
          categories[category] += price * item.quantity;
        } else {
          categories[category] = price * item.quantity;
        }
      });
    });

    // Convert to array, filter out categories with 0 sales if there are others, and sort by highest revenue
    const result = Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);

    // Fallback if no sales yet, so chart doesn't look empty
    if (result.length === 0) {
      return [
        { name: 'Mie Pedas', value: 0 },
        { name: 'Lumpia Beef', value: 0 },
        { name: 'Kebab', value: 0 },
        { name: 'Snack', value: 0 }
      ];
    }

    return result.sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // Payment methods breakdown
  const paymentMethodStats = useMemo(() => {
    const stats = {
      'Tunai': 0,
      'QRIS': 0,
      'Debit': 0
    };

    filteredTransactions.forEach(tx => {
      if (tx.paymentMethod in stats) {
        stats[tx.paymentMethod as keyof typeof stats] += tx.total;
      }
    });

    const grandTotal = Object.values(stats).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(stats).map(([method, value]) => ({
      method,
      amount: value,
      percentage: Math.round((value / grandTotal) * 100)
    }));
  }, [filteredTransactions]);

  // Sales Trend chart data (Hourly for 'today', daily for others)
  const salesChartData = useMemo(() => {
    if (timeRange === 'today') {
      // Hours split: Lunch peak (11:00-14:00), Afternoon (14:00-17:00), Dinner Rush (17:00-21:00), Rest
      const hours = [
        { label: 'Pagi (08-11)', sum: 0 },
        { label: 'Lunch Rush (11-14)', sum: 0 },
        { label: 'Sore Nyantai (14-17)', sum: 0 },
        { label: 'Dinner Peak (17-21)', sum: 0 },
        { label: 'Malam (21-23)', sum: 0 }
      ];

      filteredTransactions.forEach(tx => {
        const hour = new Date(tx.createdAt).getHours();
        if (hour >= 8 && hour < 11) hours[0].sum += tx.total;
        else if (hour >= 11 && hour < 14) hours[1].sum += tx.total;
        else if (hour >= 14 && hour < 17) hours[2].sum += tx.total;
        else if (hour >= 17 && hour < 21) hours[3].sum += tx.total;
        else if (hour >= 21) hours[4].sum += tx.total;
      });

      return hours;
    } else {
      // Days of week
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const days = dayNames.map(name => ({ label: name, sum: 0 }));

      filteredTransactions.forEach(tx => {
        const dayIdx = new Date(tx.createdAt).getDay();
        days[dayIdx].sum += tx.total;
      });

      // Reorder days starting from current day backwards
      const currentDay = new Date().getDay();
      const orderedDays = [];
      for (let i = 6; i >= 0; i--) {
        const idx = (currentDay - i + 7) % 7;
        orderedDays.push(days[idx]);
      }

      return orderedDays;
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
      tx.items.forEach(item => {
        const key = item.productId || item.id;
        if (key) {
          if (!products[key]) {
            products[key] = { name: item.productName || item.product?.name || 'Menu', qty: 0 };
          }
          products[key].qty += item.quantity;
        }
      });
    });

    const sorted = Object.values(products).sort((a, b) => b.qty - a.qty);
    return sorted[0] || { name: 'Belum ada penjualan', qty: 0 };
  }, [filteredTransactions]);

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1">
      
      {/* Top filter toggles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-foreground dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="text-red-500 w-5 h-5" /> Laporan Keuangan Neraca
          </h2>
          <p className="text-slate-550 dark:text-slate-400 text-xs">Arsip laba rugi, omset kotor, dan rasio hidangan pedas</p>
        </div>

        <div className="flex bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-1 shrink-0">
          <button
            onClick={() => setTimeRange('today')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              timeRange === 'today'
                ? 'bg-red-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setTimeRange('week')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              timeRange === 'week'
                ? 'bg-red-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            7 Hari Terakhir
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              timeRange === 'month'
                ? 'bg-red-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Bulan Ini
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - Spicy hot design elements */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Gross Revenue Card */}
        <div className="glass-morphism rounded-3xl p-5 border-l-4 border-l-yellow-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/5 rounded-full blur-xl group-hover:bg-yellow-500/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wider">OMSET KOTOR</span>
            <div className="p-1 px-1.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl font-bold font-mono text-foreground dark:text-white tracking-tight block">
            {formatRupiah(totalGrossRevenue)}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-yellow-600 dark:text-yellow-400/80 font-bold font-mono mt-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Target Kasir Terkontrol</span>
          </div>
        </div>

        {/* Dynamic Estimated Costs Card (HPP) */}
        <div className="glass-morphism rounded-3xl p-5 border-l-4 border-l-slate-400 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wider">BIAYA OPERASIONAL (HPP)</span>
            <div className="p-1 px-1.5 bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl font-bold font-mono text-foreground dark:text-slate-300 tracking-tight block">
            {formatRupiah(estimatedHpp)}
          </span>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-2">Rasio HPP Bahan Baku: 45%</p>
        </div>

        {/* Laba Bersih Card (Highlight with hot fiery Red Theme) */}
        <div className="glass-morphism rounded-3xl p-5 border-l-4 border-l-red-500 relative overflow-hidden group shadow-lg shadow-red-500/5">
          <div className="absolute -right-5 -bottom-5 w-20 h-20 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/25 transition-all pointer-events-none"></div>
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wider">LABA BERSIH RESTO</span>
            <div className="p-1 px-1.5 bg-red-500/15 text-red-650 dark:text-red-500 rounded-lg animate-pulse">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl font-extrabold font-mono text-red-650 dark:text-red-400 tracking-tight block">
            {formatRupiah(netProfit)}
          </span>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-2 font-mono">
            <span> Margin Kunci: ~55% Netto</span>
          </div>
        </div>

        {/* Ticket Stats Card */}
        <div className="glass-morphism rounded-3xl p-5 border-l-4 border-l-indigo-400 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wider">NOTA TERBAYAR</span>
            <div className="p-1 px-1.5 bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl font-bold font-mono text-foreground dark:text-white tracking-tight block">
            {transactionCount} Bill
          </span>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-mono">
            Rerata: {formatRupiah(averageTransactionValue)} / Nota
          </p>
        </div>
      </div>

      {/* Main Charts & Breakdown Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sales Trend Chart (Mock container but fully interactive using SVGs / custom flexbars in absolute values) */}
        <div className="lg:col-span-8 glass-morphism rounded-3xl p-6 flex flex-col justify-between min-h-[340px]">
          <div>
            <h3 className="text-sm font-bold text-foreground dark:text-white uppercase tracking-wider mb-1">Grafik Volume Omset</h3>
            <p className="text-slate-550 dark:text-slate-400 text-xs">Aktivitas arus masuk dana dari seluruh terminal POS</p>
          </div>

          {/* Interactive Graph Plotting bar container */}
          <div className="flex items-end justify-between h-52 pt-6 pb-2 px-2 border-b border-black/5 dark:border-white/10 relative">
            
            {/* Guide gridlines */}
            <div className="absolute inset-x-0 top-0 border-b border-dashed border-black/5 dark:border-white/5 text-[9px] text-slate-500 font-mono pt-0.5">
              Target Level Max: {formatRupiah(maxChartValue)}
            </div>
            <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-black/5 dark:border-white/5 text-[9px] text-slate-500 font-mono">
              Level 50%: {formatRupiah(maxChartValue / 2)}
            </div>

            {salesChartData.map((data, index) => {
              const heightPercent = maxChartValue > 0 ? (data.sum / maxChartValue) * 85 : 5;
              const isHovered = hoveredBarIndex === index;

              return (
                <div 
                  key={index}
                  className="flex flex-col items-center flex-1 gap-2 group relative h-full justify-end"
                  onMouseEnter={() => setHoveredBarIndex(index)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                >
                  {/* Tooltip on Hover */}
                  {isHovered && (
                    <div className="absolute -top-10 z-30 bg-red-600 border border-yellow-400 text-white text-[10px] font-bold py-1.5 px-2.5 rounded-xl text-center shadow-lg pointer-events-none transform -translate-y-1 font-mono">
                      {formatRupiah(data.sum)}
                    </div>
                  )}

                  {/* Visual Bar with Hot-Gradient styling */}
                  <div 
                    className={`w-10 rounded-t-xl transition-all duration-300 relative cursor-pointer ${
                      isHovered 
                        ? 'bg-gradient-to-t from-red-650 to-yellow-500 opacity-100 scale-x-110 shadow-lg shadow-red-500/10' 
                        : 'bg-gradient-to-t from-red-750/50 to-red-550/60 dark:from-red-700/60 dark:to-red-500/70 group-hover:from-red-650 group-hover:to-yellow-500 group-hover:opacity-100'
                    }`}
                    style={{ height: `${Math.max(4, heightPercent)}%` }}
                  >
                    {/* Inner core beam highlight */}
                    <div className="absolute inset-x-1.5 top-1 bg-white/20 h-1/2 rounded-t-lg"></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Label coordinates along the charts */}
          <div className="flex justify-between px-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono pt-2">
            {salesChartData.map((data, index) => (
              <span key={index} className="flex-1 text-center truncate">
                {data.label}
              </span>
            ))}
          </div>
        </div>

        {/* TOP Category Share Panel */}
        <div className="lg:col-span-4 glass-morphism rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground dark:text-white uppercase tracking-wider mb-3">Distribusi Menu</h3>
            <p className="text-slate-550 dark:text-slate-400 text-xs mb-4">Urutan sumbangsih kategori menu terhadap omset kotor</p>
          </div>

          {/* Progress stack */}
          <div className="flex-1 flex flex-col gap-4 justify-center">
            {salesByCategory.map((category, index) => {
              const maxCategoryVal = Math.max(...salesByCategory.map(c => c.value)) || 1;
              const barPercent = maxCategoryVal === 0 ? 0 : Math.round((category.value / maxCategoryVal) * 100);

              // Cycle through beautiful modern gradients for dynamic categories
              const gradients = [
                'from-red-600 to-red-500',
                'from-orange-500 to-amber-500',
                'from-yellow-500 to-yellow-400',
                'from-emerald-500 to-teal-500',
                'from-sky-500 to-blue-500',
                'from-purple-500 to-indigo-500',
                'from-pink-500 to-rose-400'
              ];
              const gradientClass = gradients[index % gradients.length];

              return (
                <div key={category.name} className="flex flex-col gap-1.5 animate-fade-in">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{category.name}</span>
                    <span className="font-mono font-bold text-foreground dark:text-slate-100">{formatRupiah(category.value)}</span>
                  </div>
                  
                  {/* Fire Theme Double bar stack container */}
                  <div className="w-full h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${gradientClass}`}
                      style={{ width: `${barPercent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top highlight indicator */}
          <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 bg-red-500/5 rounded-2xl p-3 border border-red-500/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-600 dark:text-yellow-500 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">MENU TERLARIS</span>
                <span className="text-xs font-bold text-foreground dark:text-white block line-clamp-1">{bestSellerProduct.name}</span>
              </div>
            </div>
            <span className="text-xs font-mono font-extrabold bg-yellow-500 text-slate-950 px-2 py-1 rounded-lg">
              {bestSellerProduct.qty} porsi
            </span>
          </div>

        </div>

      </div>

      {/* Payment methods stats */}
      <div className="glass-morphism rounded-3xl p-6">
        <h3 className="text-sm font-bold text-foreground dark:text-white uppercase tracking-wider mb-5">Analisis Aliran Kas & E-Payment</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {paymentMethodStats.map((item) => (
            <div 
              key={item.method} 
              className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between h-28 relative overflow-hidden"
            >
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{item.method}</span>
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">{item.percentage}% Share</span>
                </div>
                <span className="text-lg font-bold font-mono text-foreground dark:text-white block">
                  {formatRupiah(item.amount)}
                </span>
              </div>
              
              {/* Payment proportion micro bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden mt-3">
                <div 
                  className={`h-full rounded-full ${
                    item.method === 'QRIS' 
                      ? 'bg-red-500' 
                      : item.method === 'Debit' 
                      ? 'bg-yellow-500' 
                      : 'bg-slate-650 dark:bg-white'
                  }`}
                  style={{ width: `${item.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
