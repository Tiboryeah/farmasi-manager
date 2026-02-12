"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Plus, AlertCircle, Trash, SearchX, Package, ArrowUpRight, Download, Layers, Grid, Copy, LayoutList, ArrowDownWideNarrow, ArrowUpWideNarrow, Clock, AlertTriangle, Filter } from "lucide-react";
import { getProducts, deleteProduct, copyInventoryToSamples } from "@/app/actions";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import * as XLSX from 'xlsx';

export default function InventoryPage() {
    return (
        <Suspense fallback={<div className="p-4">Cargando...</div>}>
            <InventoryContent />
        </Suspense>
    );
}

const normalizeText = (text) => {
    if (!text) return "";
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

function InventoryContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // SOURCE OF TRUTH: Read all filters directly from the URL
    const activeTab = searchParams.get('tab') || 'product';
    const selectedCategory = searchParams.get('cat') || 'Todas';
    const viewMode = searchParams.get('view') || 'grid';
    const sortBy = searchParams.get('sort') || 'newest'; // 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc'
    const filterLowStock = searchParams.get('lowStock') === 'true';
    const urlSearchTerm = searchParams.get('q') || '';

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    // Search is local for immediate typing response, but synced to URL
    const [searchTerm, setSearchTerm] = useState(urlSearchTerm);

    // Navigation Helpers
    const updateURL = (newParams) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(newParams).forEach(([key, value]) => {
            if (value && value !== 'Todas') params.set(key, value);
            else params.delete(key);
        });
        router.replace(`/inventory?${params.toString()}`, { scroll: false });
    };

    const handleTabChange = (tab) => updateURL({ tab, cat: 'Todas' });
    const handleCategoryChange = (cat) => updateURL({ cat });
    const handleViewChange = (view) => updateURL({ view });
    const handleSortChange = (sort) => updateURL({ sort });
    const handleToggleLowStock = () => updateURL({ lowStock: !filterLowStock ? 'true' : null });

    // Sync Search to URL with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== urlSearchTerm) {
                updateURL({ q: searchTerm || null });
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Initial load
    useEffect(() => {
        getProducts().then((data) => {
            setProducts(data);
            setLoading(false);
        });
    }, []);

    // Derived States
    const filteredProducts = useMemo(() => {
        const normalizedSearch = normalizeText(searchTerm);
        let result = products.filter(p => {
            const matchesName = normalizeText(p.name).includes(normalizedSearch);
            const matchesCode = p.code ? normalizeText(p.code).includes(normalizedSearch) : false;
            const matchesCategoryInSearch = p.category ? normalizeText(p.category).includes(normalizedSearch) : false;
            const matchesAttributes = p.attributes ? p.attributes.some(attr =>
                normalizeText(attr.value).includes(normalizedSearch)
            ) : false;

            const matchesSearch = matchesName || matchesCode || matchesCategoryInSearch || matchesAttributes;
            const matchesTab = (p.type || 'product') === activeTab;
            const matchesCategory = selectedCategory === "Todas" || p.category === selectedCategory;
            const matchesLowStock = !filterLowStock || (p.stock <= (p.minStock || 0));

            return matchesSearch && matchesTab && matchesCategory && matchesLowStock;
        });

        // Apply Sorting
        return result.sort((a, b) => {
            switch (sortBy) {
                case 'price-asc': return a.price - b.price;
                case 'price-desc': return b.price - a.price;
                case 'stock-asc': return a.stock - b.stock;
                case 'stock-desc': return b.stock - a.stock;
                case 'oldest': return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
                case 'newest':
                default:
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            }
        });
    }, [products, searchTerm, activeTab, selectedCategory, sortBy, filterLowStock]);

    const categories = useMemo(() => {
        return ["Todas", ...new Set(products
            .filter(p => (p.type || 'product') === activeTab)
            .map(p => p.category)
            .filter(Boolean)
            .sort())];
    }, [products, activeTab]);

    const handleDelete = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
            // OPTIMISTIC UPDATE: Immediate disappearance from UI
            setProducts(prev => prev.filter(p => p.id !== id));
            try {
                const res = await deleteProduct(id);
                if (res.error) {
                    alert(res.error);
                    getProducts().then(setProducts); // Reset list on failure
                }
            } catch (err) {
                alert("Error al eliminar el producto");
                getProducts().then(setProducts);
            }
        }
    };

    const handleExport = () => {
        try {
            const headers = ["ID Sistema", "Código Referencia", "Nombre", "Categoría", "Costo", "Precio", "Stock", "Stock Mínimo", "Estado", "Última Actualización"];
            const exportData = products.map(p => ({
                "ID Sistema": p.id || 'N/A',
                "Código Referencia": p.code || 'N/A',
                Nombre: p.name,
                Categoría: p.category,
                Costo: p.cost,
                Precio: p.price,
                Stock: p.stock,
                'Stock Mínimo': p.minStock,
                Estado: p.stock <= p.minStock ? 'BAJO STOCK' : 'OK',
                'Última Actualización': p.updatedAt ? new Date(p.updatedAt).toLocaleString() : 'N/A'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData, { header: headers });
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Inventario");
            XLSX.writeFile(wb, `dianifarmi-inventario-${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error("Export failed:", error);
            alert("Error al exportar el inventario");
        }
    };

    const handleSyncSamples = async () => {
        if (!confirm("Se buscarán productos en el Inventario General que falten en Muestras y se añadirán con stock 0.\n\n¿Continuar?")) return;

        setLoading(true);
        const res = await copyInventoryToSamples();
        if (res.error) {
            alert(res.error);
        } else {
            alert(`Sincronización completada. Se añadieron ${res.count} nuevos artículos.`);
            const refreshed = await getProducts();
            setProducts(refreshed);
        }
        setLoading(false);
    };



    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
    );

    return (
        <div className="flex flex-col gap-10 animate-fade-in pb-20">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-[var(--color-text-main)] tracking-tighter">Inventario</h1>
                    <p className="text-[var(--color-text-muted)] text-sm font-medium mt-1">Gestiona tus productos y stock en tiempo real</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-[var(--color-surface)] border border-[var(--color-glass-border)] p-1 rounded-xl mr-2">
                        <button
                            onClick={() => handleViewChange('grid')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                            title="Vista Cuadrícula"
                        >
                            <Grid size={18} />
                        </button>
                        <button
                            onClick={() => handleViewChange('compact')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'compact' ? 'bg-primary text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                            title="Vista Compacta"
                        >
                            <LayoutList size={18} />
                        </button>
                    </div>
                    {activeTab === 'sample' && (
                        <button
                            onClick={handleSyncSamples}
                            className="h-10 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:bg-amber-500/20 active:scale-95 transition-all shadow-sm"
                            title="Importar productos del Inventario General"
                        >
                            <Layers size={18} />
                            <span className="hidden md:inline">Sincronizar Muestras</span>
                        </button>
                    )}
                    <button
                        onClick={handleExport}
                        className="h-10 w-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-glass-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] transition-all shadow-sm"
                        title="Exportar a Excel"
                    >
                        <Download size={20} />
                    </button>
                    <Link href={`/products/new?type=${activeTab}`} className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg hover:scale-110 transition-all">
                        <Plus size={24} />
                    </Link>
                </div>
            </header>

            <div className="flex gap-4 border-b border-zinc-200 pb-4">
                <button
                    onClick={() => handleTabChange('product')}
                    className={`text-lg font-bold pb-2 transition-all ${activeTab === 'product' ? 'text-primary border-b-2 border-primary' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                    Inventario General
                </button>
                <button
                    onClick={() => handleTabChange('sample')}
                    className={`text-lg font-bold pb-2 transition-all ${activeTab === 'sample' ? 'text-primary border-b-2 border-primary' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                    Inventario de Muestras
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative group flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-primary transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar producto por nombre o categoría..."
                        style={{ height: '3.5rem' }}
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-glass-border)] rounded-2xl pl-12 text-lg outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                        onClick={handleToggleLowStock}
                        className={`h-14 px-4 rounded-2xl border flex items-center gap-2 font-bold transition-all whitespace-nowrap ${filterLowStock ? 'bg-red-500/10 border-red-500 text-red-500 shadow-lg shadow-red-500/20' : 'bg-[var(--color-surface)] border-[var(--color-glass-border)] text-[var(--color-text-muted)] hover:border-red-500/50'}`}
                        title="Filtrar por stock bajo"
                    >
                        <AlertTriangle size={20} className={filterLowStock ? 'animate-pulse' : ''} />
                        <span className="hidden sm:inline">Stock Bajo</span>
                    </button>

                    <div className="relative flex-1 md:flex-none">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" size={18} />
                        <select
                            value={sortBy}
                            onChange={(e) => handleSortChange(e.target.value)}
                            className="h-14 pl-11 pr-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-glass-border)] text-[var(--color-text-main)] font-bold outline-none focus:border-primary transition-all appearance-none cursor-pointer w-full"
                        >
                            <option value="newest">Más Recientes</option>
                            <option value="oldest">Más Antiguos</option>
                            <option value="price-asc">Precio: Menor a Mayor</option>
                            <option value="price-desc">Precio: Mayor a Menor</option>
                            <option value="stock-asc">Stock: Menor a Mayor</option>
                            <option value="stock-desc">Stock: Mayor a Menor</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row bg-[var(--color-surface)] border border-[var(--color-glass-border)] rounded-3xl overflow-hidden shadow-sm min-h-[600px]">
                {/* Category Sidebar/Nav */}
                <aside className="w-full lg:w-64 bg-[var(--color-surface-highlight)] border-b lg:border-b-0 lg:border-r border-[var(--color-glass-border)] flex flex-col shrink-0">
                    <div className="p-3 border-b border-[var(--color-glass-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center bg-[var(--color-surface)]">
                        Categorías
                    </div>
                    <div className="overflow-x-auto lg:overflow-y-auto flex lg:flex-col gap-2 p-3 scrollbar-hide lg:scrollbar-thin">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => handleCategoryChange(cat)}
                                className={`flex items-center justify-center lg:justify-start px-4 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${selectedCategory === cat
                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-transparent hover:bg-[var(--color-surface-hover)]'
                                    }`}
                            >
                                <span className="line-clamp-1">{cat}</span>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Products Grid */}
                <div className="flex-1 p-4 bg-[var(--color-background)] overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-[var(--color-text-muted)]">
                            <SearchX size={60} className="opacity-20 mb-4" />
                            <p className="font-bold">No se encontraron productos</p>
                            <button onClick={() => setSearchTerm("")} className="text-primary mt-4 text-sm font-black uppercase tracking-widest hover:underline">Limpiar búsqueda</button>
                        </div>
                    ) : (
                        <div className={viewMode === 'grid'
                            ? "grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4"
                            : "flex flex-col gap-2"
                        }>
                            {filteredProducts.map(product => (
                                viewMode === 'grid'
                                    ? <ProductCard key={product.id} product={product} handleDelete={handleDelete} />
                                    : <CompactProductRow key={product.id} product={product} handleDelete={handleDelete} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ProductCard({ product, handleDelete }) {
    const router = useRouter();
    const isLowStock = product.stock <= product.minStock;

    return (
        <div
            onClick={() => router.push(`/inventory/${product.id}`)}
            className="card group flex flex-col gap-4 bg-[var(--color-surface)] hover:shadow-xl border border-[var(--color-glass-border)] p-4 transition-all duration-300 rounded-2xl cursor-pointer"
        >
            <div className="flex gap-5">
                <div className="h-28 w-28 rounded-xl bg-[var(--color-surface-highlight)] flex items-center justify-center overflow-hidden border border-[var(--color-glass-border)] group-hover:scale-105 transition-transform duration-500">
                    {product.image && product.image.startsWith('data:image') ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-5xl text-[var(--color-text-muted)]">{product.image || "📦"}</span>
                    )}
                </div>

                <div className="flex-1 flex flex-col justify-between min-w-0 py-1">
                    <div className="flex justify-between items-start gap-2 mb-1">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <span className="text-[10px] bg-[var(--color-surface-highlight)] text-[var(--color-text-main)] px-2 py-1 rounded-md font-black uppercase tracking-widest border border-[var(--color-glass-border)] opacity-80 whitespace-nowrap">{product.category}</span>
                            {product.code && (
                                <span className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-widest bg-[var(--color-surface-highlight)] px-2 py-1 rounded-md border border-[var(--color-glass-border)] whitespace-nowrap">#{product.code}</span>
                            )}
                            {product.batches && product.batches.length > 1 && (
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-md font-black uppercase tracking-widest border border-primary/20 whitespace-nowrap">Varios Lotes</span>
                            )}
                        </div>
                        <div className="flex gap-1 shrink-0 -mr-2 -mt-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/products/new?cloneId=${product.id}`);
                                }}
                                className="p-2 bg-[var(--color-surface)] border border-[var(--color-glass-border)] text-[var(--color-text-muted)] hover:text-primary hover:border-primary rounded-full transition-all shadow-sm"
                                title="Crear Variante (Copiar)"
                            >
                                <Copy size={14} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(e, product.id);
                                }}
                                className="p-2 bg-[var(--color-surface)] border border-[var(--color-glass-border)] text-[var(--color-text-muted)] hover:text-danger hover:bg-danger/10 hover:border-danger rounded-full transition-all shadow-sm"
                                title="Eliminar"
                            >
                                <Trash size={14} />
                            </button>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold text-lg leading-tight text-[var(--color-text-main)] group-hover:text-primary transition-colors pr-6 mb-1">{product.name}</h3>

                        {product.attributes && product.attributes.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                                {product.attributes.slice(0, 3).map((attr, idx) => (
                                    <span key={idx} className="text-[10px] text-[var(--color-text-muted)] border border-[var(--color-glass-border)] px-1.5 py-0.5 rounded-md">
                                        {attr.value}
                                    </span>
                                ))}
                                {product.attributes.length > 3 && <span className="text-[10px] text-[var(--color-text-muted)]">+{product.attributes.length - 3}</span>}
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-2 border-t border-[var(--color-glass-border)]/30">
                        {product.batches && product.batches.length > 0 ? (
                            <div className="flex flex-col gap-1.5 mb-2">
                                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1 flex justify-between items-center">
                                    <span>{product.batches.length > 1 ? "Precios por Lote:" : "Lote:"}</span>
                                    {product.batches.length > 1 && <span className="text-[9px] lowercase opacity-50 font-medium italic">({product.batches.length} lotes)</span>}
                                </div>
                                {product.batches.map((batch, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-[var(--color-surface-highlight)] px-2.5 py-2 rounded-xl border border-[var(--color-glass-border)]/50 shadow-sm transition-all hover:bg-[var(--color-surface-hover)] hover:border-primary/30">
                                        <div className="flex flex-col min-w-0 flex-1 mr-2">
                                            <span className="text-[9px] font-black uppercase tracking-tight text-[var(--color-text-muted)] leading-none truncate">{batch.label || "Sin Etiqueta"}</span>
                                            <span className="text-sm font-black text-[var(--color-text-main)] mt-0.5">${batch.price}</span>
                                        </div>
                                        <div className="text-right shrink-0 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                            <span className="text-[10px] font-black text-emerald-500">{batch.stock} <small className="text-[8px] opacity-70">un.</small></span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {product.stock > 0 && <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-fit">⚠ Sin información de lotes</span>}
                                <div className="flex items-end justify-between">
                                    <div>
                                        <span className="text-xl font-black text-[var(--color-text-main)]">${product.price}</span>
                                        <span className="text-xs text-[var(--color-text-muted)] block font-medium">Precio Público</span>
                                    </div>

                                    <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm border transition-all ${isLowStock ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${isLowStock ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                                        {product.stock} Stock
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="w-full bg-[var(--color-surface-highlight)] h-1.5 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-1000 ${isLowStock ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (product.stock / (product.minStock * 2)) * 100)}%` }}
                />
            </div>
        </div>
    );
}

function CompactProductRow({ product, handleDelete }) {
    const router = useRouter();
    const isLowStock = product.stock <= product.minStock;

    return (
        <div
            onClick={() => router.push(`/inventory/${product.id}`)}
            className="flex items-center gap-2 md:gap-4 bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-glass-border)] p-2 md:p-3 px-3 md:px-4 transition-all duration-200 rounded-xl cursor-pointer group"
        >
            <div className={`w-1 md:w-1.5 h-8 md:h-10 rounded-full shrink-0 ${isLowStock ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />

            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="font-bold text-[var(--color-text-main)] truncate text-xs md:text-sm mb-1">{product.name}</h3>
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-primary bg-primary/10 px-1 py-0.5 rounded border border-primary/20 w-fit shrink-0">{product.category}</span>
                    {product.batches && product.batches.length > 1 && (
                        <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20 w-fit shrink-0">Varios Lotes</span>
                    )}
                    <div className="text-[9px] md:text-[10px] text-[var(--color-text-muted)] font-medium flex items-center gap-1.5 truncate">
                        {product.code && <span className="opacity-60 shrink-0">#{product.code}</span>}
                        {product.attributes && product.attributes.length > 0 && (
                            <span className="truncate opacity-80 italic hidden xs:inline">• {product.attributes.map(a => a.value).join(', ')}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4 xl:gap-6 shrink-0">
                <div className="text-right hidden sm:block min-w-[50px] md:min-w-[60px]">
                    <div className="text-xs font-black text-[var(--color-text-main)]">
                        {product.batches && product.batches.length > 1 ? (
                            `$${Math.min(...product.batches.map(b => b.price))} - $${Math.max(...product.batches.map(b => b.price))}`
                        ) : (
                            `$${product.price}`
                        )}
                    </div>
                    <div className="text-[8px] md:text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-tighter opacity-60">Precio</div>
                </div>

                <div className="text-center min-w-[40px] md:min-w-[60px]">
                    <div className={`text-xs md:text-sm font-black ${isLowStock ? 'text-red-500' : 'text-emerald-500'}`}>{product.stock}</div>
                    <div className="text-[8px] md:text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-tighter opacity-60">Stock</div>
                </div>

                <div className="flex gap-1 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/products/new?cloneId=${product.id}`);
                        }}
                        className="p-1.5 bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] text-[var(--color-text-muted)] hover:text-primary rounded-lg transition-all active:scale-90"
                    >
                        <Copy className="md:size-[14px] size-3" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(e, product.id);
                        }}
                        className="p-1.5 bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] text-[var(--color-text-muted)] hover:text-danger rounded-lg transition-all active:scale-90"
                    >
                        <Trash className="md:size-[14px] size-3" />
                    </button>
                </div>
            </div>
        </div>
    );
}
