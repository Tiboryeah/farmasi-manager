"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Correct import for App Router
import { getProduct, updateProductStock } from "@/app/actions"; // verify path
import { ChevronLeft, Save, History, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { use } from "react"; // For params

export default function ProductDetailPage({ params }) {
    const router = useRouter();
    // Unwrap params using React.use() in Next 15 or just access if it's sync (Next 14 it's async, sticking to safe pattern)
    // Actually in standard Next 14 app dir, p is a promise or object. 
    // Let's assume standard behavior: params is a promise in latest next, but object in 14. 
    // We'll treat it as object for now, if error we fix.
    // Wait, Next 15 `params` is async. I'll use `use(params)` logic if I can, or just async component.
    // But this is "use client", so params is prob passed as prop.
    // Let's keep it simple: `params.id`
    const { id } = use(params);

    const [product, setProduct] = useState(null);
    const [adjustment, setAdjustment] = useState(0);
    const [reason, setReason] = useState("Ajuste Manual");

    useEffect(() => {
        if (id) getProduct(id).then(setProduct);
    }, [id]);

    const handleAdjust = async (e) => {
        e.preventDefault();
        if (!adjustment) return;
        const newStock = product.stock + parseInt(adjustment);
        await updateProductStock(product.id, newStock, reason);
        setProduct({ ...product, stock: newStock });
        setAdjustment(0);
        setReason("Ajuste Manual");
        alert("Stock actualizado");
    };

    if (!product) return <div className="p-4">Cargando...</div>;

    return (
        <div className="flex flex-col h-full pb-20">
            <header className="flex items-center gap-3 py-4 mb-2">
                <Link href="/inventory" className="btn btn-ghost p-1"><ChevronLeft /></Link>
                <h1 className="text-xl font-bold truncate">{product.name}</h1>
            </header>

            <div className="card p-4 mb-4 flex gap-4 items-center">
                <div className="h-20 w-20 bg-surface-hover rounded-xl overflow-hidden flex items-center justify-center">
                    {product.image && product.image.startsWith('data:image') ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-4xl">{product.image || "📦"}</span>
                    )}
                </div>
                <div>
                    <div className="text-sm text-secondary uppercase font-bold">{product.category}</div>
                    <div className="text-2xl font-bold text-white">{product.stock} un.</div>
                    <div className="text-xs text-secondary">Stock Mínimo: {product.min_stock}</div>
                </div>
            </div>

            <div className="card p-4 mb-6">
                <h2 className="text-sm font-bold mb-3 text-secondary border-b border-border pb-2">Ajuste de Inventario</h2>
                <form onSubmit={handleAdjust} className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            className={`btn ${adjustment > 0 ? 'btn-primary' : 'btn-outline'} flex gap-2`}
                            onClick={() => setAdjustment(1)}
                        >
                            <TrendingUp size={16} /> Entrada
                        </button>
                        <button
                            type="button"
                            className={`btn ${adjustment < 0 ? 'bg-danger text-white' : 'btn-outline'} flex gap-2`}
                            onClick={() => setAdjustment(-1)}
                        >
                            <TrendingDown size={16} /> Salida
                        </button>
                    </div>

                    <div className="flex gap-2 items-center">
                        <input
                            type="number"
                            className="input text-center font-bold text-lg"
                            value={adjustment}
                            onChange={(e) => setAdjustment(parseInt(e.target.value) || 0)}
                        />
                        <span className="text-sm text-secondary">Ajuste (+/-)</span>
                    </div>

                    <input
                        className="input"
                        placeholder="Motivo (Ej. Regalo, Error, Compra)"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />

                    <button className="btn btn-primary w-full">Aplicar Ajuste</button>
                </form>
            </div>

            <div className="card p-4">
                <h2 className="text-sm font-bold mb-2 text-secondary">Detalles Financieros</h2>
                <div className="flex justify-between py-2 border-b border-border">
                    <span>Costo Unitario</span>
                    <span className="font-bold">${product.cost}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                    <span>Precio Sugerido</span>
                    <span className="font-bold text-success">${product.price}</span>
                </div>
                <div className="flex justify-between py-2">
                    <span>Margen Sugerido</span>
                    <span className="text-success">+${(product.price - product.cost).toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
}
