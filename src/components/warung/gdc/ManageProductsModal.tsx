// @ts-nocheck
import React, { useState } from 'react';
import { Product } from '@/lib/types';
import { Plus, Edit2, Trash2, X, PlusCircle, AlertTriangle, Coffee, Tag, Sparkles, ArrowUp, ArrowDown } from 'lucide-react';

interface ManageProductsModalProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  categories: string[];
  onUpdateCategories: (categories: string[]) => void;
  onMoveProduct?: (productId: string, direction: 'up' | 'down') => void;
}

export default function ManageProductsModal({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  categories,
  onUpdateCategories,
  onMoveProduct
}: ManageProductsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Sub-tab toggling
  const [subTab, setSubTab] = useState<'products' | 'categories'>('products');

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Form states for Product
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [buyPrice, setBuyPrice] = useState<number>(0);
  const [category, setCategory] = useState(categories[0] || 'Mie Pedas');
  const [image, setImage] = useState('');
  const [bestSeller, setBestSeller] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [stock, setStock] = useState<number>(50);
  const [mentaiImage, setMentaiImage] = useState('');
  const [ragoutImage, setRagoutImage] = useState('');

  // Filter products based on search
  const filteredProducts = products.filter(prod => 
    prod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prod.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Category manager states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');

  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.2 * 1024 * 1024) {
        alert('Ukuran file gambar menu terlalu besar! Harap gunakan file di bawah 1.2MB agar dapat disimpan di local storage browser Anda.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const openAddForm = () => {
    setEditingProduct(null);
    setName('');
    setPrice(0);
    setBuyPrice(0);
    setCategory(categories[0] || 'Mie Pedas');
    setImage('');
    setBestSeller(false);
    setIsAvailable(true);
    setStock(50);
    setMentaiImage('');
    setRagoutImage('');
    setIsEditing(true);
  };

  const openEditForm = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setPrice(prod.sellPrice);
    setBuyPrice(prod.buyPrice || 0);
    setCategory(prod.category);
    setImage(prod.imageUrl || '');
    setBestSeller(prod.bestSeller || false);
    setIsAvailable(prod?.stock > 0);
    setStock(prod.stock !== undefined ? prod.stock : 50);
    const isRisoles = prod.name.toLowerCase().includes("risoles");
    let mentaiImg = "";
    let ragoutImg = "";
    if (isRisoles && prod.description) {
      try {
        if (prod.description.trim().startsWith("{")) {
          const parsed = JSON.parse(prod.description);
          mentaiImg = parsed.mentaiImageUrl || "";
          ragoutImg = parsed.ragoutImageUrl || "";
        }
      } catch (e) {}
    }
    setMentaiImage(mentaiImg);
    setRagoutImage(ragoutImg);
    setIsEditing(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price <= 0) return;

    let finalDescription = editingProduct ? editingProduct.description || "" : "";
    if (name.toLowerCase().includes("risoles")) {
      finalDescription = JSON.stringify({
        text: "Menu asli Mie Jebew GDC",
        mentaiImageUrl: mentaiImage.trim(),
        ragoutImageUrl: ragoutImage.trim()
      });
    }

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        name: name.trim(),
        price,
        buyPrice,
        category,
        image,
        bestSeller,
        isAvailable,
        stock,
        description: finalDescription
      });
    } else {
      onAddProduct({
        name: name.trim(),
        price,
        buyPrice,
        category,
        image,
        bestSeller,
        isAvailable,
        stock,
        description: finalDescription
      });
    }

    setIsEditing(false);
    setEditingProduct(null);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-6 h-full overflow-hidden p-1 select-none">
      
      {/* Product List Panel */}
      <div className="flex-1 glass-morphism rounded-3xl p-6 flex flex-col overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-black/10 dark:border-white/5 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-foreground dark:text-white uppercase tracking-tight flex items-center gap-2">
              <PlusCircle className="text-red-500 w-5 h-5 animate-pulse" /> Pengelolaan Toko
            </h2>
            <div className="flex gap-2 mt-2 bg-black/5 dark:bg-slate-900/60 p-1 rounded-xl w-fit border border-black/10 dark:border-white/5">
              <button 
                type="button"
                onClick={() => setSubTab('products')} 
                className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all duration-150 cursor-pointer ${
                  subTab === 'products' 
                    ? 'bg-red-650 text-white shadow shadow-red-600/30 font-bold' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Inventaris Menu
              </button>
              <button 
                type="button"
                onClick={() => setSubTab('categories')} 
                className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all duration-150 cursor-pointer ${
                  subTab === 'categories' 
                    ? 'bg-red-650 text-white shadow shadow-red-600/30 font-bold' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Kelola Kategori {`(${categories.length})`}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {subTab === 'products' && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari menu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl py-2.5 px-3 pl-8 text-xs text-foreground dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500 w-44 md:w-56"
                />
                <svg
                  className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            )}

            {subTab === 'products' && (
              <button
                onClick={openAddForm}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-red-600/25 cursor-pointer transition-colors animate-fade-in shrink-0"
              >
                <Plus className="w-4 h-4" /> TAMBAH MENU BARU
              </button>
            )}
          </div>
        </div>

        {subTab === 'products' ? (
          /* Catalog Table */
          <div className="flex-1 overflow-y-auto">
            {products.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-black/2 dark:bg-white/2 rounded-2xl border border-dashed border-black/10 dark:border-white/5">
                <Coffee className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-3" />
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Belum Ada Menu</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">Tambahkan menu mie, dimsum atau minuman dingin pertama Anda untuk memulai perdagangan.</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-black/2 dark:bg-white/2 rounded-2xl border border-dashed border-black/10 dark:border-white/5 animate-fade-in">
                <Coffee className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-3" />
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Menu Tidak Ditemukan</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">Tidak ada menu dengan kata kunci "{searchTerm}". Silakan gunakan nama atau kategori lain.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-black/15 dark:border-white/10 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="pb-3 pr-2">Nama Menu</th>
                    <th className="pb-3 px-2">Kategori</th>
                    <th className="pb-3 px-2">Harga (HPP)</th>
                    <th className="pb-3 px-2">Stok Fisik</th>
                    <th className="pb-3 px-2">Status</th>
                    <th className="pb-3 pl-2 text-right">Opsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {filteredProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td className="py-2.5 pr-2 font-bold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/5 dark:bg-slate-900 border border-black/10 dark:border-white/10 shrink-0 flex items-center justify-center">
                            {prod.imageUrl ? (
                              <img 
                                src={prod.imageUrl} 
                                alt={prod.name} 
                                className="w-full h-full object-cover animate-fade-in"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-500 dark:text-slate-650 font-bold uppercase font-mono">
                                {prod.category.slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold leading-tight block max-w-[150px] md:max-w-[220px] truncate" title={prod.name}>
                            {prod.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-xs font-mono font-bold text-red-650 dark:text-red-500">
                        {prod.category}
                      </td>
                      <td className="py-3.5 px-2 font-mono text-foreground dark:text-white">
                        <div className="text-xs font-extrabold">{formatRupiah(prod.sellPrice)}</div>
                        <div className="text-[10px] text-slate-400 font-medium">HPP: {formatRupiah(prod.buyPrice || 0)}</div>
                      </td>
                      <td className="py-3.5 px-2 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        {prod.stock !== undefined ? prod.stock : '-'} pkt
                      </td>
                      <td className="py-3.5 px-2">
                        <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-lg border uppercase tracking-widest font-mono ${
                          prod?.stock > 0 
                            ? 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-300 border-emerald-550/20' 
                            : 'bg-zinc-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-500 border-black/5 dark:border-white/5'
                        }`}>
                          {prod?.stock > 0 ? 'Komersial' : 'Habis / Off'}
                        </span>
                      </td>
                      <td className="py-3.5 pl-2 text-right">
                        <div className="flex gap-2 justify-end">
                          {searchTerm === '' && onMoveProduct && (
                            <>
                              <button
                                onClick={() => onMoveProduct(prod.id, 'up')}
                                className="p-1 px-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg cursor-pointer transition-colors"
                                title="Geser ke atas"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onMoveProduct(prod.id, 'down')}
                                className="p-1 px-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg cursor-pointer transition-colors"
                                title="Geser ke bawah"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => openEditForm(prod)}
                            className="p-1 px-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-lg cursor-pointer transition-colors"
                            title="Edit produk"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Yakin ingin menghapus produk "${prod.name}" dari sistem?`)) {
                                onDeleteProduct(prod.id);
                              }
                            }}
                            className="p-1 px-2 bg-red-600/10 hover:bg-red-600/20 text-red-550 dark:text-red-400 rounded-lg cursor-pointer transition-colors"
                            title="Hapus produk"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* Category List and Form Manager */
          <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
            <div className="mb-6 bg-black/5 dark:bg-white/3 border border-black/10 dark:border-white/5 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-foreground dark:text-slate-200 uppercase tracking-wider mb-2">Tambah Kategori Baru</h3>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimName = newCategoryName.trim();
                  if (!trimName) return;
                  if (categories.some(c => c.toLowerCase() === trimName.toLowerCase())) {
                    alert('Kategori ini sudah terdaftar!');
                    return;
                  }
                  onUpdateCategories([...categories, trimName]);
                  setNewCategoryName('');
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  required
                  placeholder="e.g. Ricebowl, Minuman Hangat, Dessert"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-foreground dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-650 hover:bg-red-750 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition shadow-md cursor-pointer shrink-0"
                >
                  Tambah Kategori
                </button>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto">
              {categories.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-black/2 dark:bg-white/2 rounded-2xl border border-dashed border-black/10 dark:border-white/5">
                  <Tag className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-3" />
                  <h3 className="text-base font-bold text-slate-750 dark:text-slate-300">Belum Ada Kategori</h3>
                  <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 max-w-xs">Tambahkan kategori baru di form atas untuk memisahkan menu makanan Anda.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-black/15 dark:border-white/10 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="pb-3 pr-2">Nama Kategori</th>
                      <th className="pb-3 px-2 text-center">Jumlah Produk Terkait</th>
                      <th className="pb-3 pl-2 text-right">Opsi Pengelolaan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {categories.map((cat, index) => {
                      const productCount = products.filter(p => p.category === cat).length;
                      const isRowEditing = editingCategoryIndex === index;

                      return (
                        <tr key={index} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="py-2.5 pr-2 font-bold text-slate-800 dark:text-slate-200">
                            {isRowEditing ? (
                              <input
                                type="text"
                                value={editingCategoryValue}
                                onChange={(e) => setEditingCategoryValue(e.target.value)}
                                className="bg-white dark:bg-slate-900 border border-black/20 dark:border-white/20 rounded-lg py-1 px-2.5 text-xs text-foreground dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500 w-full max-w-[200px]"
                                required
                              />
                            ) : (
                              <span className="text-xs text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <Tag className="w-3.5 h-3.5 text-red-500" />
                                {cat}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-yellow-600 dark:text-yellow-500 text-xs">
                            {productCount} Menu
                          </td>
                          <td className="py-2.5 pl-2 text-right">
                            <div className="flex justify-end gap-2">
                              {isRowEditing ? (
                                <>
                                  <button
                                    onClick={() => {
                                      const val = editingCategoryValue.trim();
                                      if (!val) return;
                                      if (categories.some((c, idx) => idx !== index && c.toLowerCase() === val.toLowerCase())) {
                                        alert('Nama kategori sudah terdaftar!');
                                        return;
                                      }
                                      const oldCatName = categories[index];
                                      const updatedCats = [...categories];
                                      updatedCats[index] = val;
                                      onUpdateCategories(updatedCats);

                                      // Cascade update products category
                                      products.forEach(p => {
                                        if (p.category === oldCatName) {
                                          onUpdateProduct({ ...p, category: val });
                                        }
                                      });

                                      setEditingCategoryIndex(null);
                                    }}
                                    className="py-1 px-2.5 bg-emerald-650/15 hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-400 font-bold rounded-lg text-[10px] uppercase cursor-pointer"
                                  >
                                    Simpan
                                  </button>
                                  <button
                                    onClick={() => setEditingCategoryIndex(null)}
                                    className="py-1 px-2.5 bg-black/10 hover:bg-black/15 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-[10px] uppercase cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingCategoryIndex(index);
                                      setEditingCategoryValue(cat);
                                    }}
                                    className="p-1 px-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 rounded-lg cursor-pointer transition-colors"
                                    title="Edit Kategori"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Apakah Anda yakin ingin menghapus kategori "${cat}"?\nSistem akan memindahkan semua produk di kategori ini ke kategori lain.`)) {
                                        const remainingCats = categories.filter((_, i) => i !== index);
                                        const fallbackCat = remainingCats[0] || 'Lainnya';
                                        
                                        const oldCatName = cat;
                                        onUpdateCategories(remainingCats);
                                        products.forEach(p => {
                                          if (p.category === oldCatName) {
                                            onUpdateProduct({ ...p, category: fallbackCat });
                                          }
                                        });
                                      }
                                    }}
                                    className="p-1 px-2 bg-red-600/10 hover:bg-red-600/20 text-red-555 rounded-lg cursor-pointer transition-colors"
                                    title="Hapus Kategori"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Editor Sidebar Drawer */}
      {isEditing && (
        <aside className="w-80 glass-morphism rounded-3xl p-6 flex flex-col justify-between shrink-0 h-full overflow-hidden">
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-y-auto pr-1">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center pb-3 border-b border-black/10 dark:border-white/5">
                <h3 className="text-sm font-bold text-foreground dark:text-white uppercase tracking-tight">
                  {editingProduct ? 'Ubah Informasi Menu' : 'Tambah Menu Baru'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-slate-500 hover:text-foreground dark:text-slate-400 dark:hover:text-white bg-black/5 dark:bg-white/5 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Input fields */}
              <div className="flex flex-col gap-3.5">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 font-semibold">NAMA MENU / DISH</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mie Setan Level 20"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-foreground dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 font-semibold">HARGA JUAL (RP)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={price || ''}
                    onChange={(e) => setPrice(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-foreground dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 font-semibold">HARGA MODAL / HPP (RP)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={buyPrice || ''}
                    onChange={(e) => setBuyPrice(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-foreground dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-red-500"
                    placeholder="e.g. 7000"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 font-semibold">KATEGORI UTAMA</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-foreground dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat} className="text-slate-800 dark:text-white bg-white dark:bg-slate-900">{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 font-semibold">STOK PRODUK / OUTLET</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-foreground dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-red-500"
                    placeholder="50"
                  />
                </div>

                {name.toLowerCase().includes("risoles") && (
                  <>
                    <div>
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1 font-bold uppercase tracking-wider">FOTO RISOLES MENTAI</label>
                      <div className="flex flex-col gap-2 mb-2">
                        {mentaiImage && (
                          <div className="w-full h-20 rounded-xl relative overflow-hidden bg-black/10 dark:bg-slate-950/60 border border-black/5 dark:border-white/5 flex items-center justify-center p-1">
                            <img 
                              src={mentaiImage} 
                              alt="Pratinjau Mentai" 
                              className="w-full h-full object-cover rounded-lg"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => setMentaiImage('')}
                              className="absolute top-2 right-2 bg-red-650 text-white rounded p-1 hover:bg-red-700 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="URL Foto Mentai (https://...)"
                            value={mentaiImage}
                            onChange={(e) => setMentaiImage(e.target.value)}
                            className="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl py-2 px-3 text-[11px] text-foreground dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1 font-bold uppercase tracking-wider">FOTO RISOLES RAGOUT</label>
                      <div className="flex flex-col gap-2 mb-2">
                        {ragoutImage && (
                          <div className="w-full h-20 rounded-xl relative overflow-hidden bg-black/10 dark:bg-slate-950/60 border border-black/5 dark:border-white/5 flex items-center justify-center p-1">
                            <img 
                              src={ragoutImage} 
                              alt="Pratinjau Ragout" 
                              className="w-full h-full object-cover rounded-lg"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => setRagoutImage('')}
                              className="absolute top-2 right-2 bg-red-650 text-white rounded p-1 hover:bg-red-700 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="URL Foto Ragout (https://...)"
                            value={ragoutImage}
                            onChange={(e) => setRagoutImage(e.target.value)}
                            className="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl py-2 px-3 text-[11px] text-foreground dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1 font-bold uppercase tracking-wider">GAMBAR MENU / FOTO PRODUK</label>
                  <div className="flex flex-col gap-2">
                    {image && (
                      <div className="w-full h-24 rounded-2xl relative overflow-hidden bg-black/10 dark:bg-slate-950/60 border border-black/5 dark:border-white/5 flex items-center justify-center p-1 shadow-inner">
                        <img 
                          src={image} 
                          alt="Pratinjau Foto Menu" 
                          className="w-full h-full object-cover rounded-xl"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setImage('')}
                          className="absolute top-2 right-2 bg-red-600/90 text-white rounded-lg p-1 hover:bg-red-700 transition shadow"
                          title="Hapus gambar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Tempel URL Gambar (https://...)"
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                        className="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl py-2 px-3 text-[11px] text-foreground dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                      <input
                        type="file"
                        id="product_photo_input"
                        accept="image/*"
                        onChange={handleProductImageChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="product_photo_input"
                        className="py-2 px-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 hover:border-red-500/30 font-bold rounded-xl text-[10px] cursor-pointer flex items-center justify-center shrink-0 transition"
                        title="Upload gambar dari perangkat"
                      >
                        UPLOAD
                      </label>
                    </div>
                    <span className="text-[9px] text-slate-500 dark:text-slate-500 block leading-normal">Gunakan link internet atau unggah langsung screenshot/foto menu Anda dari galeri HP.</span>
                  </div>
                </div>

                {/* Option Toggles */}
                <div className="flex flex-col gap-2 pt-2 border-t border-black/10 dark:border-white/5 mt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bestSeller}
                      onChange={(e) => setBestSeller(e.target.checked)}
                      className="w-4 h-4 rounded-md accent-red-650 focus:ring-0"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-bold select-none">Setiap Pembeli Rekomendasikan (Best Seller)</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={isAvailable}
                      onChange={(e) => setIsAvailable(e.target.checked)}
                      className="w-4 h-4 rounded-md accent-red-650 focus:ring-0"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-bold select-none">Tersedia untuk Dijual (Ready Stock)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 text-xs font-black transition-colors cursor-pointer text-center"
              >
                SIMPAN MENU
              </button>
            </div>
          </form>
        </aside>
      )}
    </div>
  );
}
