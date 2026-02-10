"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Plus, AlertCircle, Trash, SearchX, Package, ArrowUpRight, Download, Layers, Grid, Copy } from "lucide-react";
import { getProducts, deleteProduct, copyInventoryToSamples } from "@/app/actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from 'xlsx';

export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState('product'); // 'product' | 'sample'
    const [selectedCategory, setSelectedCategory] = useState("Todas");
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getProducts().then((data) => {
            setProducts(data);
            setFilteredProducts(data);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        const filtered = products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const type = p.type || 'product';
            const matchesTab = type === activeTab;
            const matchesCategory = selectedCategory === "Todas" || p.category === selectedCategory;
            return matchesSearch && matchesTab && matchesCategory;
        });
        setFilteredProducts(filtered);
    }, [searchTerm, products, activeTab, selectedCategory]);

    const categories = ["Todas", ...new Set(products.filter(p => (p.type || 'product') === activeTab).map(p => p.category).filter(Boolean).sort())];

    const handleDelete = async (e, id) => {
        e.preventDefault();
        if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
            await deleteProduct(id);
            setProducts(products.filter(p => p.id !== id));
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
                    onClick={() => setActiveTab('product')}
                    className={`text-lg font-bold pb-2 transition-all ${activeTab === 'product' ? 'text-primary border-b-2 border-primary' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                    Inventario General
                </button>
                <button
                    onClick={() => setActiveTab('sample')}
                    className={`text-lg font-bold pb-2 transition-all ${activeTab === 'sample' ? 'text-primary border-b-2 border-primary' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                    Inventario de Muestras
                </button>
            </div>

            <div className="relative group">
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
                                onClick={() => setSelectedCategory(cat)}
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
                        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                            {filteredProducts.map(product => (
                                <ProductCard key={product.id} product={product} handleDelete={handleDelete} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div >
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
                                onClick={(e) => handleDelete(e, product.id)}
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

                    <div className="flex items-end justify-between mt-auto">
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
