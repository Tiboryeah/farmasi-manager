"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Plus, AlertCircle, Trash, SearchX, Package, ArrowUpRight, Download, Layers, Grid } from "lucide-react";
import { getProducts, deleteProduct } from "@/app/actions";
import Link from "next/link";
import * as XLSX from 'xlsx';

export default function InventoryPage() {
    const [viewMode, setViewMode] = useState('category'); // 'grid' | 'category'
    const [activeTab, setActiveTab] = useState('product'); // 'product' | 'sample'
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
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.category.toLowerCase().includes(searchTerm.toLowerCase());
            const type = p.type || 'product';
            const matchesTab = type === activeTab;
            return matchesSearch && matchesTab;
        });
        setFilteredProducts(filtered);
    }, [searchTerm, products, activeTab]);

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

    const groupedProducts = useMemo(() => {
        if (viewMode !== 'category') return null;
        const groups = {};
        filteredProducts.forEach(p => {
            const cat = p.category || 'Sin Categoría';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(p);
        });
        return groups;
    }, [filteredProducts, viewMode]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
    );

    return (
        <div className="flex flex-col gap-10 animate-fade-in pb-20">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent tracking-tighter">Inventario</h1>
                    <p className="text-zinc-500 text-sm font-medium mt-1">Gestiona tus productos y stock en tiempo real</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-zinc-900 rounded-xl p-1 flex gap-1 border border-white/5 mr-2">
                        <button
                            onClick={() => setViewMode('category')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'category' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                            title="Ver por Categorías"
                        >
                            <Layers size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                            title="Ver Todos"
                        >
                            <Grid size={20} />
                        </button>
                    </div>
                    <button
                        onClick={handleExport}
                        className="h-10 w-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all shadow-xl"
                        title="Exportar a Excel"
                    >
                        <Download size={20} />
                    </button>
                    <Link href={`/products/new?type=${activeTab}`} className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-glow hover:scale-110 transition-all">
                        <Plus size={24} />
                    </Link>
                </div>
            </header>

            <div className="flex gap-4 border-b border-white/10 pb-4">
                <button
                    onClick={() => setActiveTab('product')}
                    className={`text-lg font-bold pb-2 transition-all ${activeTab === 'product' ? 'text-primary border-b-2 border-primary' : 'text-zinc-500 hover:text-white'}`}
                >
                    Inventario General
                </button>
                <button
                    onClick={() => setActiveTab('sample')}
                    className={`text-lg font-bold pb-2 transition-all ${activeTab === 'sample' ? 'text-primary border-b-2 border-primary' : 'text-zinc-500 hover:text-white'}`}
                >
                    Inventario de Muestras
                </button>
            </div>

            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#f43f5e] transition-colors" size={20} />
                <input
                    type="text"
                    placeholder="Buscar producto por nombre o categoría..."
                    style={{ height: '3.5rem' }}
                    className="input-field pl-12 text-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {viewMode === 'category' ? (
                <div className="flex flex-col gap-10">
                    {filteredProducts.length === 0 ? (
                        <div className="py-20 flex flex-col items-center text-zinc-600">
                            <SearchX size={60} className="opacity-10 mb-4" />
                            <p className="font-bold">No se encontraron productos</p>
                        </div>
                    ) : (
                        Object.entries(groupedProducts).map(([category, items]) => (
                            <div key={category} className="animate-fade-in">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                                    <span className="w-1 h-6 bg-primary rounded-full"></span>
                                    {category}
                                    <span className="text-xs text-zinc-500 font-normal bg-zinc-900 px-2 py-1 rounded-full">{items.length}</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {items.map(product => (
                                        <ProductCard key={product.id} product={product} handleDelete={handleDelete} />
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.length === 0 ? (
                        <div className="col-span-full py-32 flex flex-col items-center text-zinc-600">
                            <SearchX size={80} className="opacity-10 mb-6" />
                            <p className="text-xl font-bold">No se encontraron productos</p>
                            <button onClick={() => setSearchTerm("")} className="text-primary mt-4 text-sm font-black uppercase tracking-widest hover:underline">Limpiar búsqueda</button>
                        </div>
                    ) : (
                        filteredProducts.map((product) => (
                            <ProductCard key={product.id} product={product} handleDelete={handleDelete} />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

function ProductCard({ product, handleDelete }) {
    const isLowStock = product.stock <= product.minStock;
    return (
        <Link href={`/inventory/${product.id}`} className="card group flex flex-col gap-6">
            <div className="flex gap-5">
                <div className="h-24 w-24 rounded-2xl bg-zinc-900 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-500 shadow-inner">
                    {product.image && product.image.startsWith('data:image') ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-5xl">{product.image || "📦"}</span>
                    )}
                </div>

                <div className="flex-1 flex flex-col justify-between min-w-0 py-1 relative">
                    <button
                        onClick={(e) => handleDelete(e, product.id)}
                        className="absolute -top-1 -right-1 p-2 text-zinc-600 hover:text-danger hover:bg-danger/10 rounded-xl transition-all"
                    >
                        <Trash size={16} />
                    </button>
                    <div>
                        <h3 className="font-bold text-xl truncate text-white tracking-tight pr-8">{product.name}</h3>
                        <div className="flex flex-col gap-1 mt-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{product.category}</span>
                                {product.code && (
                                    <>
                                        <span className="text-zinc-700">•</span>
                                        <span className="text-[10px] text-primary font-black uppercase tracking-widest">{product.code}</span>
                                    </>
                                )}
                            </div>
                            {product.attributes && product.attributes.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {product.attributes.map((attr, idx) => (
                                        <span key={idx} className="px-1.5 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400">
                                            <span className="font-bold text-zinc-500">{attr.name}:</span> {attr.value}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-black text-white">${product.price}</span>
                        <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 ${isLowStock ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-zinc-800 text-zinc-400'}`}>
                            {isLowStock && <div className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />}
                            {product.stock} Stock
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden shadow-inner">
                <div
                    className={`h-full transition-all duration-1000 ${isLowStock ? 'bg-danger' : 'bg-success shadow-[0_0_10px_rgba(16,185,129,0.3)]'}`}
                    style={{ width: `${Math.min(100, (product.stock / (product.minStock * 2)) * 100)}%` }}
                />
            </div>
        </Link>
    );
}
