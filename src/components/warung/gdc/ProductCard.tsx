// @ts-nocheck
import React from 'react';
import { Product } from '@/lib/types';
import { Flame, Utensils, Coffee, Sparkles, AlertCircle, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  key?: string;
  isArrangeMode?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveTop?: () => void;
  onMoveBottom?: () => void;
  index?: number;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}

export default function ProductCard({
  product,
  onAddToCart,
  isArrangeMode = false,
  onMoveUp,
  onMoveDown,
  onMoveTop,
  onMoveBottom,
  index = 0,
  draggable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  isDragging = false,
  isDragOver = false,
}: ProductCardProps) {
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
      onClick={() => !isArrangeMode && product?.stock > 0 && onAddToCart(product)}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`glass-morphism rounded-[22px] sm:rounded-3xl flex flex-col h-[232px] sm:h-[275px] overflow-hidden transition-all duration-300 relative group select-none border border-sidebar-border/30 dark:border-white/10 ${
        isArrangeMode
          ? isDragging
            ? 'opacity-40 border-dashed border-emerald-500 bg-emerald-950/5 scale-95'
            : isDragOver
              ? 'scale-[1.02] border-emerald-400 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.25)] border-solid z-20'
              : 'border-emerald-500/30 hover:border-emerald-500/65 bg-emerald-950/5 dark:bg-emerald-950/10 cursor-grab active:cursor-grabbing hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]'
          : product?.stock > 0 
            ? 'cursor-pointer hover:border-red-500/40 hover:bg-sidebar-accent/40 dark:hover:bg-white/5 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] active:scale-[0.98]' 
            : 'opacity-45 cursor-not-allowed border-rose-500/5'
      }`}
    >
      {/* Product Image Frame Section */}
      <div className="w-full h-[100px] sm:h-[132px] relative overflow-hidden shrink-0 bg-sidebar-accent dark:bg-slate-900 border-b border-sidebar-border/20 dark:border-white/5 p-2 flex items-center justify-center">
        {imgUrl ? (
          <div className="w-full h-full relative rounded-2xl overflow-hidden bg-sidebar/20 dark:bg-slate-950/20 flex items-center justify-center p-1.5">
            <img 
              src={imgUrl} 
              alt={product.name} 
              className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl transition-all duration-700 scale-100 group-hover:scale-105 brightness-[0.98] group-hover:brightness-105 group-hover:contrast-[1.03]"
              referrerPolicy="no-referrer"
            />
            {/* Subtle elegant shadow bottom gradient to blend cleanly */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/10 via-transparent to-transparent pointer-events-none" />
          </div>
        ) : (
          /* Dynamic stylish fallback gradient matching category design theme with large aesthetic watermark icon */
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden w-full h-full rounded-2xl`}>
            <div className="opacity-[0.08] transform scale-[3] transition-transform duration-700 group-hover:scale-[3.3] group-hover:rotate-12">
              {getCategoryIcon(product.category, "w-16 h-16")}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
          </div>
        )}

        {/* Category Icon Badge or Rank Badge floating on image (Only in Arrange Mode to keep normal mode extremely clean!) */}
        {isArrangeMode && (
          <div className="absolute top-3 left-3 z-30">
            <div className="px-2.5 py-1 bg-emerald-600 border border-emerald-500 rounded-xl text-[10px] font-black text-white shadow-lg shadow-emerald-600/35 backdrop-blur-md animate-in zoom-in-75 duration-200">
              #{index + 1}
            </div>
          </div>
        )}
      </div>

      {/* Product Details Section with Elegant Spacing */}
      <div className="pt-2 px-2.5 pb-3 sm:py-3 sm:px-4 flex flex-col justify-between flex-1 relative z-10 bg-sidebar-accent/10 dark:bg-slate-950/20">
        <div className="flex flex-col gap-0.5 sm:gap-1">
          <div className="select-none">
            <span className="text-[8px] sm:text-[9px] font-extrabold text-red-500 uppercase tracking-widest font-mono">
              {product.category}
            </span>
          </div>
          <h3 className="font-extrabold text-foreground dark:text-white group-hover:text-red-650 dark:group-hover:text-red-400 transition-colors line-clamp-2 text-[11px] sm:text-[13px] md:text-sm leading-snug">
            {product.name}
          </h3>
          {product.stock !== undefined && (
            <div className="mt-0.5 select-none">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[7.5px] sm:text-[9.5px] font-extrabold font-mono uppercase tracking-wider border ${
                product.stock <= 0 
                  ? 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/25 text-rose-500 dark:text-rose-400 animate-pulse font-black'
                  : product.stock <= 5
                  ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/25 text-amber-500 dark:text-amber-400 font-black animate-pulse'
                  : 'bg-zinc-800/10 dark:bg-white/5 border-zinc-700/15 dark:border-white/10 text-slate-500 dark:text-slate-450'
              }`}>
                <span className={`w-1 h-1 rounded-full mr-1 ${
                  product.stock <= 0 
                    ? 'bg-rose-500 animate-pulse'
                    : product.stock <= 5
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-slate-400 dark:bg-slate-500'
                }`} />
                {product.stock <= 0 ? 'Habis' : `Stok: ${product.stock}`}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-1 sm:mt-1 pt-1 sm:pt-1 border-t border-sidebar-border/20 dark:border-white/5">
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

      {/* Arrange mode position shifter controls overlay */}
      {isArrangeMode && (
        <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[0.5px] z-30 flex flex-col items-center justify-center p-2 animate-in fade-in duration-200">
          {/* Glassmorphic Control Dock */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900/90 dark:bg-black/90 border border-emerald-500/30 rounded-2xl p-1.5 flex gap-1 shadow-2xl backdrop-blur-md items-center animate-in zoom-in-95 duration-200"
          >
            {/* Button: Move to Top */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveTop?.();
              }}
              className="p-2 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white rounded-xl transition-all cursor-pointer active:scale-90"
              title="Pindahkan ke Paling Atas"
            >
              <ChevronsUp className="w-3.5 h-3.5 sm:w-4 h-4" />
            </button>
            
            {/* Button: Move Up */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp?.();
              }}
              className="p-2 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white rounded-xl transition-all cursor-pointer active:scale-90"
              title="Pindahkan Ke Atas"
            >
              <ChevronUp className="w-3.5 h-3.5 sm:w-4 h-4" />
            </button>
            
            {/* Button: Move Down */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown?.();
              }}
              className="p-2 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white rounded-xl transition-all cursor-pointer active:scale-90"
              title="Pindahkan Ke Bawah"
            >
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 h-4" />
            </button>
            
            {/* Button: Move to Bottom */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveBottom?.();
              }}
              className="p-2 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white rounded-xl transition-all cursor-pointer active:scale-90"
              title="Pindahkan ke Paling Bawah"
            >
              <ChevronsDown className="w-3.5 h-3.5 sm:w-4 h-4" />
            </button>
          </div>
          
          {/* Helpful micro label at bottom of card */}
          <span className="text-[8px] sm:text-[9.5px] font-black tracking-widest text-white mt-2 bg-emerald-950/80 border border-emerald-500/20 px-2 py-0.5 rounded-full shadow-md select-none font-mono">
            DRAG / TAP TOMBOL
          </span>
        </div>
      )}
    </div>
  );
}

