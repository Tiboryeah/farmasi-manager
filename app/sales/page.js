"use client";

import { useState, useEffect } from "react";
import { Plus, ShoppingCart, Calendar, ArrowUpRight, History, Trash2, XCircle, User, Package, CreditCard } from "lucide-react";
import Link from "next/link";
import { getSales, cancelSale } from "@/app/actions";

export default function SalesHistoryPage() {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSales();
    }, []);

    const loadSales = async () => {
        setLoading(true);
        const data = await getSales();
        setSales(data);
        setLoading(false);
    };

    const handleCancelSale = async (id) => {
        if (!confirm("⚠️ ¿Deseas ANULAR esta venta?\n\nEl stock se devolverá a los productos y la venta se borrará de los registros.")) return;

        const secondConfirm = confirm("❗ ¿Estás totalmente seguro? Esta acción no se puede deshacer.");
        if (!secondConfirm) return;

        const res = await cancelSale(id);
        if (res.error) {
            alert(res.error);
        } else {
            alert("Venta anulada correctamente.");
            loadSales();
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
    );

    return (
        <div className="flex flex-col gap-6 animate-fade-in pb-10">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--color-text-main)]">Historial de Ventas</h1>
                    <p className="text-[var(--color-text-muted)] text-sm">Registro cronológico de pedidos</p>
                </div>
                <Link href="/sales/new" className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 hover:scale-110 transition-transform">
                    <Plus size={24} />
                </Link>
            </header>

            <div className="flex flex-col gap-4">
                {sales.length === 0 ? (
                    <div className="card py-20 flex flex-col items-center text-[var(--color-text-muted)] dashed border border-[var(--color-glass-border)] border-dashed rounded-2xl">
                        <History size={64} className="opacity-20 mb-4" />
                        <p className="text-lg font-medium">No hay ventas registradas</p>
                        <Link href="/sales/new" className="text-primary mt-2 text-sm font-bold hover:underline">Crear primera venta</Link>
                    </div>
                ) : (
                    sales.map((sale) => (
                        <div key={sale.id} className="card p-5 group hover:bg-[var(--color-surface-hover)] transition-all bg-[var(--color-surface)] border border-[var(--color-glass-border)] shadow-sm rounded-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-2xl bg-[var(--color-surface-highlight)] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform border border-[var(--color-glass-border)]">
                                        🛍️
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-black text-lg text-[var(--color-text-main)]">Venta #{sale.id.slice(-6).toUpperCase()}</h3>
                                            <div className="flex gap-1.5">
                                                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-wider border border-emerald-500/20">Completada</span>
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${sale.paymentMethod === 'Tarjeta' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                                    {sale.paymentMethod}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-3 mt-1.5 font-medium">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={13} className="text-primary" />
                                                {new Date(sale.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} • {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-[var(--color-surface-highlight)] px-2 py-0.5 rounded-md border border-[var(--color-glass-border)] text-[var(--color-text-main)]">
                                                <User size={13} className="text-primary" />
                                                {sale.customerName || "Consumidor Final"}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 w-full bg-[var(--color-background)]/50 rounded-xl p-3 border border-[var(--color-glass-border)]">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2 flex items-center gap-1.5">
                                        <Package size={12} /> Artículos
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {sale.items?.map((item, idx) => (
                                            <div key={idx} className="bg-[var(--color-surface-highlight)] px-2.5 py-1 rounded-lg border border-[var(--color-glass-border)] text-[11px] flex items-center gap-2">
                                                <span className="font-black text-primary">{item.quantity}x</span>
                                                <span className="text-[var(--color-text-main)] font-medium max-w-[120px] truncate">{item.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-6 sm:text-right border-t sm:border-t-0 border-[var(--color-glass-border)] pt-4 sm:pt-0">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Ganancia</span>
                                        <span className="font-bold text-emerald-500 text-xl">+${sale.profit.toFixed(2)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-widest">Total</span>
                                        <span className="font-black text-2xl text-[var(--color-text-main)]">${sale.total.toFixed(2)}</span>
                                    </div>
                                    <button
                                        onClick={() => handleCancelSale(sale.id)}
                                        className="btn h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20 group-hover:scale-105"
                                        title="Anular Venta"
                                    >
                                        <XCircle size={24} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
