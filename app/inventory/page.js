"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Plus, AlertCircle } from "lucide-react";
import { getProducts } from "@/app/actions";
import Link from "next/link";

export default function InventoryPage() {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        getProducts().then(setProducts);
    }, []);

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center justify-between py-4 mb-2">
                <h1 className="text-xl font-bold">Inventario</h1>
                {/* TODO: Add Product Modal */}
                <Link href="/products/new" className="btn btn-primary p-2 rounded-full">
                    <Plus size={24} />
                </Link>
            </header>

            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        className="input pl-10 py-2"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-3 pb-20 overflow-y-auto">
                {filtered.map((product) => (
                    <Link href={`/inventory/${product.id}`} key={product.id} className="card flex justify-between items-center p-3">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg bg-surface-hover flex items-center justify-center text-2xl">
                                {product.image}
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">{product.name}</h3>
                                <p className="text-xs text-secondary">{product.category}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm font-semibold">${product.price}</span>
                                    <span className="text-xs text-muted">Costo: ${product.cost}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                            <div className={`badge ${product.stock <= product.min_stock ? 'badge-danger' : 'badge-success'}`}>
                                {product.stock} un.
                            </div>
                            {product.stock <= product.min_stock && (
                                <AlertCircle size={14} className="text-danger" />
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
