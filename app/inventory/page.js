"use client";

import { useState, useEffect } from "react";
import { Search, Plus, AlertCircle, Trash, SearchX, Package, ArrowUpRight } from "lucide-react";
import { getProducts, deleteProduct } from "@/app/actions";
import Link from "next/link";

export default function InventoryPage() {
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
        const filtered = products.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredProducts(filtered);
    }, [searchTerm, products]);

    const handleDelete = async (e, id) => {
        e.preventDefault();
        if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
            await deleteProduct(id);
            setProducts(products.filter(p => p.id !== id));
        }
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
                    <h1 className="text-4xl font-black bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent tracking-tighter">Inventario</h1>
                    <p className="text-zinc-500 text-sm font-medium mt-1">Gestiona tus productos y stock en tiempo real</p>
                </div>
                <Link href="/products/new" className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-glow hover:scale-110 transition-all duration-300">
                    <Plus size={28} />
                </Link>
            </header>

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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.length === 0 ? (
                    <div className="col-span-full py-32 flex flex-col items-center text-zinc-600">
                        <SearchX size={80} className="opacity-10 mb-6" />
                        <p className="text-xl font-bold">No se encontraron productos</p>
                        <button onClick={() => setSearchTerm("")} className="text-primary mt-4 text-sm font-black uppercase tracking-widest hover:underline">Limpiar búsqueda</button>
                    </div>
                ) : (
                    filteredProducts.map((product) => {
                        const isLowStock = product.stock <= product.minStock;
                        return (
                            <Link href={`/inventory/${product.id}`} key={product.id} className="card group flex flex-col gap-6">
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
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{product.category}</span>
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
                    })
                )}
            </div>
        </div>
    );
}
