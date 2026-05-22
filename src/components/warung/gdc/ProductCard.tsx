// @ts-nocheck
import React from 'react';
import { Product } from '@/lib/types';
import { Flame, Utensils, Coffee, Sparkles, AlertCircle } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  key?: string;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Harmonious and curated dark mode category-specific gradient styles
  const getGradientByStyle = (category: string) => {
    switch (category) {
      case 'Mie Pedas':
        return 'from-red-950/70 via-red-900/20 to-zinc-950';
      case 'Dimsum':
        return 'from-amber-950/60 via-yellow-900/15 to-zinc-950';
      case 'Minuman Dingin':
        return 'from-cyan-950/60 via-blue-900/15 to-zinc-950';
      case 'Snack':
      case 'Camilan':
        return 'from-orange-950/60 via-amber-950/15 to-zinc-950';
      default:
        return 'from-zinc-900/50 via-zinc-800/20 to-zinc-950';
    }
  };

  const getCategoryIcon = (category: string, sizeClass = "w-5 h-5") => {
    switch (category) {
      case 'Mie Pedas':
        return <Flame className={`${sizeClass} text-red-500 animate-pulse`} />;
      case 'Dimsum':
        return <Utensils className={`${sizeClass} text-yellow-400`} />;
      case 'Minuman Dingin':
        return <Coffee className={`${sizeClass} text-cyan-400`} />;
      default:
        return <Sparkles className={`${sizeClass} text-amber-500`} />;
    }
  };

  const gradient = getGradientByStyle(product.category);
  const imgUrl = product.imageUrl || product.image;

  return (
    <div 
      onClick={() => product?.stock > 0 && onAddToCart(product)}
      className={`glass-morphism rounded-[22px] sm:rounded-3xl flex flex-col h-[215px] sm:h-[275px] overflow-hidden transition-all duration-300 relative group select-none border border-sidebar-border/30 dark:border-white/10 ${
        product?.stock > 0 
          ? 'cursor-pointer hover:border-red-500/40 hover:bg-sidebar-accent/40 dark:hover:bg-white/5 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] active:scale-[0.98]' 
          : 'opacity-45 cursor-not-allowed border-rose-500/5'
      }`}
    >
      {/* Product Image Frame Section */}
      <div className="w-full h-[100px] sm:h-[150px] relative overflow-hidden shrink-0 bg-sidebar-accent dark:bg-slate-900 border-b border-sidebar-border/20 dark:border-white/5">
        {imgUrl ? (
          <>
            <img 
              src={imgUrl} 
              alt={product.name} 
              className="w-full h-full object-cover object-center transition-all duration-700 scale-100 group-hover:scale-105 brightness-[0.98] group-hover:brightness-105 group-hover:contrast-[1.03]"
              referrerPolicy="no-referrer"
            />
            {/* Subtle elegant shadow bottom gradient to blend cleanly */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
          </>
        ) : (
          /* Dynamic stylish fallback gradient matching category design theme with large aesthetic watermark icon */
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
            <div className="opacity-[0.08] transform scale-[3] transition-transform duration-700 group-hover:scale-[3.3] group-hover:rotate-12">
              {getCategoryIcon(product.category, "w-16 h-16")}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
          </div>
        )}

        {/* Category Icon Badge floating on image */}
        <div className="absolute top-3 left-3">
          <div className="p-2 bg-sidebar/85 dark:bg-slate-950/85 rounded-2xl border border-sidebar-border/50 dark:border-white/10 backdrop-blur-md shadow-lg">
            {getCategoryIcon(product.category, "w-4 h-4")}
          </div>
        </div>

        {/* Availability stock level overlay floating on image */}
        <div className="absolute top-3 right-3">
          {product?.stock > 0 ? (
            product.stock !== undefined && (
              <span className={`text-[9px] font-mono font-black px-2.5 py-1 rounded-xl uppercase tracking-wider block backdrop-blur-md shadow-lg border ${
                product.stock <= 5 
                  ? 'bg-amber-600/90 text-white border-amber-400 animate-pulse' 
                  : 'bg-sidebar/85 dark:bg-slate-950/85 text-foreground dark:text-slate-300 border-sidebar-border/60 dark:border-white/15'
              }`}>
                Stok: {product.stock}
              </span>
            )
          ) : (
            <span className="flex items-center gap-1 bg-sidebar/90 dark:bg-zinc-950/90 border border-sidebar-border/60 dark:border-white/15 backdrop-blur-md text-[9px] uppercase font-black text-muted-foreground dark:text-slate-400 px-2.5 py-1 rounded-xl shadow-lg">
              <AlertCircle className="w-3 h-3 text-slate-500" /> Habis
            </span>
          )}
        </div>
      </div>

      {/* Product Details Section with Elegant Spacing */}
      <div className="p-2.5 sm:p-4 flex flex-col justify-between flex-1 relative z-10 bg-sidebar-accent/10 dark:bg-slate-950/20">
        <div className="flex flex-col gap-0.5 sm:gap-1">
          <span className="text-[8px] sm:text-[9px] font-extrabold text-red-500 uppercase tracking-widest font-mono">
            {product.category}
          </span>
          <h3 className="font-extrabold text-foreground dark:text-white group-hover:text-red-650 dark:group-hover:text-red-400 transition-colors line-clamp-2 text-[11px] sm:text-[13px] md:text-sm leading-snug">
            {product.name}
          </h3>
        </div>
        
        <div className="flex items-center justify-between mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-sidebar-border/20 dark:border-white/5">
          <p className="text-xs sm:text-sm md:text-base font-black text-yellow-600 dark:text-yellow-500 font-mono flex items-baseline gap-0.5">
            <span className="text-[9px] sm:text-[10px] text-red-500 font-sans font-extrabold mr-0.5">Rp</span>
            {product.sellPrice.toLocaleString('id-ID')}
          </p>
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 text-[10px] sm:text-xs font-bold group-hover:bg-red-600 group-hover:text-white group-hover:shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all duration-300">
            +
          </div>
        </div>
      </div>

      {/* Subtle background glow highlight on hover */}
      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-red-600/5 rounded-full blur-xl group-hover:bg-red-500/10 transition-all pointer-events-none"></div>
    </div>
  );
}

