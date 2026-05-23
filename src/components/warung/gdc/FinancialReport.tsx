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
    // Seed default categories so they always appear in the report
    const categories: Record<string, number> = {
      'Mie Pedas': 0,
      'Lumpia Beef': 0,
      'Kebab': 0,
      'Snack': 0,
      'Qalla Coffe': 0,
      'Qalla Tea': 0
    };

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

    const alwaysShow = ['Mie Pedas', 'Lumpia Beef', 'Kebab', 'Snack', 'Qalla Coffe', 'Qalla Tea'];

    // Convert to array, always include standard categories even if 0, filter others if 0
    const result = Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0 || alwaysShow.includes(item.name));

    // Fallback if empty
    if (result.length === 0) {
      return alwaysShow.map(name => ({ name, value: 0 }));
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
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1 sm:pr-2 pb-8">
      
      {/* Top Header & Toggles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="text-red-500 w-5 h-5 sm:w-6 sm:h-6" /> Laporan Keuangan
          </h2>
          <p className="text-slate-550 dark:text-slate-400 text-xs sm:text-sm mt-1">Arsip laba rugi, omset kotor, dan performa penjualan</p>
        </div>

        {/* Modern iOS-like Segmented Control */}
        <div className="flex bg-black/5 dark:bg-slate-800/50 p-1 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar shadow-inner">
          {(['today', 'week', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 md:flex-none px-4 py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all duration-300 whitespace-nowrap cursor-pointer ${
                timeRange === range
                  ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {range === 'today' ? 'Hari Ini' : range === 'week' ? '7 Hari' : 'Bulan Ini'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid - Premium Glassmorphism */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Gross Revenue Card */}
        <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-[24px] p-5 border border-slate-200/50 dark:border-white/5 relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none"></div>
          <div className="flex justify-between items-start mb-3 relative z-10">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase">Omset Kotor</span>
            <div className="p-1.5 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black font-mono text-slate-800 dark:text-white tracking-tight block relative z-10">
            {formatRupiah(totalGrossRevenue)}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-2">
            <TrendingUp className="w-3 h-3" />
            <span>Target Tercapai</span>
          </div>
        </div>

        {/* HPP Card */}
        <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-[24px] p-5 border border-slate-200/50 dark:border-white/5 relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/10 rounded-full blur-2xl group-hover:bg-slate-500/20 transition-all pointer-events-none"></div>
          <div className="flex justify-between items-start mb-3 relative z-10">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase">Operasional (HPP)</span>
            <div className="p-1.5 bg-slate-500/10 dark:bg-slate-500/20 text-slate-600 dark:text-slate-300 rounded-xl group-hover:scale-110 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black font-mono text-slate-800 dark:text-slate-200 tracking-tight block relative z-10">
            {formatRupiah(estimatedHpp)}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-2">
            <TrendingDown className="w-3 h-3" />
            <span>Estimasi {hppFactor * 100}% Modal</span>
          </div>
        </div>

        {/* Laba Bersih Card - The Star! */}
        <div className="bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-slate-900/40 backdrop-blur-xl rounded-[24px] p-5 border border-red-200/50 dark:border-red-500/10 relative overflow-hidden group hover:shadow-xl hover:shadow-red-500/10 hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-red-500/20 dark:bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/30 transition-all pointer-events-none"></div>
          <div className="absolute top-0 left-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-start mb-3 relative z-10">
            <span className="text-[10px] text-red-800/70 dark:text-red-300/70 font-bold tracking-widest uppercase">Laba Bersih</span>
            <div className="p-1.5 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl animate-pulse group-hover:animate-none group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black font-mono text-red-700 dark:text-red-400 tracking-tight block relative z-10">
            {formatRupiah(netProfit)}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-red-600/80 dark:text-red-400/80 font-bold mt-2 relative z-10">
            <Award className="w-3 h-3" />
            <span>Margin Profit Tinggi</span>
          </div>
        </div>

        {/* Ticket Stats Card */}
        <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-[24px] p-5 border border-slate-200/50 dark:border-white/5 relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none"></div>
          <div className="flex justify-between items-start mb-3 relative z-10">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase">Nota Terbayar</span>
            <div className="p-1.5 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black font-mono text-slate-800 dark:text-white tracking-tight block relative z-10">
            {transactionCount} Bill
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-bold font-mono mt-2 relative z-10">
            <span>Rerata {formatRupiah(averageTransactionValue)}</span>
          </div>
        </div>
      </div>

      {/* Main Charts & Breakdown Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
        
        {/* Sales Trend Chart */}
        <div className="lg:col-span-8 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-[32px] p-5 sm:p-6 flex flex-col justify-between min-h-[340px] shadow-sm">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Grafik Volume Omset</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Aktivitas penjualan di berbagai waktu</p>
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
              const heightPercent = maxChartValue > 0 ? (data.sum / maxChartValue) * 85 : 5;
              const isHovered = hoveredBarIndex === index;

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
                      height: `${Math.max(4, heightPercent)}%`,
                      opacity: isHovered || hoveredBarIndex === null ? 1 : 0.6
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-red-600/90 to-amber-400/90 dark:from-red-600 dark:to-amber-500"></div>
                    {/* Inner highlight for 3D glass effect */}
                    <div className="absolute inset-x-1 top-1 bg-white/20 h-1/3 rounded-t-xl backdrop-blur-sm"></div>
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
            {salesByCategory.map((category, index) => {
              const maxCategoryVal = Math.max(...salesByCategory.map(c => c.value)) || 1;
              const barPercent = maxCategoryVal === 0 ? 0 : Math.round((category.value / maxCategoryVal) * 100);

              // Cohesive hot monochrome gradients
              const gradients = [
                'from-red-600 to-red-400',
                'from-red-500 to-orange-400',
                'from-orange-500 to-amber-400',
                'from-amber-500 to-yellow-400',
                'from-yellow-500 to-yellow-300',
                'from-slate-400 to-slate-300',
                'from-slate-500 to-slate-400'
              ];
              const gradientClass = gradients[Math.min(index, gradients.length - 1)];

              return (
                <div key={category.name} className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{category.name}</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-white">{formatRupiah(category.value)}</span>
                  </div>
                  
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden shadow-inner border border-black/5 dark:border-white/5">
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
      </div>

      {/* Payment methods stats */}
      <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-[32px] p-5 sm:p-6 mt-2 mb-4 shadow-sm">
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Analisis Aliran Kas & E-Payment</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Proporsi metode pembayaran yang digunakan pelanggan</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {paymentMethodStats.map((item) => (
            <div 
              key={item.method} 
              className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/5 rounded-[20px] p-5 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow"
            >
              {/* Subtle background icon for premium feel */}
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-5 pointer-events-none transition-transform group-hover:scale-110">
                <DollarSign className="w-24 h-24" />
              </div>

              <div className="relative z-10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{item.method}</span>
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 shadow-sm">
                    {item.percentage}%
                  </span>
                </div>
                <span className="text-xl sm:text-2xl font-black font-mono text-slate-800 dark:text-white block mt-1">
                  {formatRupiah(item.amount)}
                </span>
              </div>
              
              <div className="w-full bg-slate-200 dark:bg-slate-900/80 h-1.5 rounded-full overflow-hidden mt-5 relative z-10 border border-black/5 dark:border-white/5">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    item.method === 'QRIS' 
                      ? 'bg-red-500' 
                      : item.method === 'Debit' 
                      ? 'bg-amber-500' 
                      : 'bg-slate-500 dark:bg-slate-400'
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
