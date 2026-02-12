"use client";

import { useState, useEffect } from "react";
import { Plus, ShoppingCart, Calendar, ArrowUpRight, History, Trash2, X, XCircle, User, Package, CreditCard, ChevronRight, Info } from "lucide-react";
import Link from "next/link";
import { getSales, cancelSale } from "@/app/actions";

export default function SalesHistoryPage() {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState(null);

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
        <>
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
                            <div
                                key={sale.id}
                                onClick={() => setSelectedSale(sale)}
                                className="card p-5 group hover:bg-[var(--color-surface-hover)] transition-all bg-[var(--color-surface)] border border-[var(--color-glass-border)] shadow-sm rounded-xl cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute right-0 top-0 h-full w-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 rounded-2xl bg-[var(--color-surface-highlight)] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform border border-[var(--color-glass-border)] shadow-inner">
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

                                    <div className="flex-1 w-full bg-[var(--color-background)]/50 rounded-xl p-3 border border-[var(--color-glass-border)] hidden lg:block">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2 flex items-center gap-1.5">
                                            <Package size={12} /> Artículos
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {sale.items?.slice(0, 3).map((item, idx) => (
                                                <div key={idx} className="bg-[var(--color-surface-highlight)] px-2.5 py-1 rounded-lg border border-[var(--color-glass-border)] text-[11px] flex items-center gap-2">
                                                    <span className="font-black text-primary">{item.quantity}x</span>
                                                    <span className="text-[var(--color-text-main)] font-medium max-w-[120px] truncate">{item.name}</span>
                                                </div>
                                            ))}
                                            {sale.items?.length > 3 && (
                                                <div className="text-[10px] font-bold text-primary flex items-center px-1">
                                                    +{sale.items.length - 3} más
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:text-right border-t sm:border-t-0 border-[var(--color-glass-border)] pt-4 sm:pt-0">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Ganancia</span>
                                            <span className="font-bold text-emerald-500 text-xl tracking-tight">+${sale.profit.toFixed(2)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-widest">Total</span>
                                            <span className="font-black text-2xl text-[var(--color-text-main)] tracking-tighter">${sale.total.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCancelSale(sale.id);
                                                }}
                                                className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20 flex items-center justify-center"
                                                title="Anular Venta"
                                            >
                                                <X size={20} />
                                            </button>
                                            <div className="h-10 w-10 flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-primary transition-colors">
                                                <ChevronRight size={20} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {selectedSale && (
                <SaleDetailModal
                    sale={selectedSale}
                    onClose={() => setSelectedSale(null)}
                    onCancel={() => {
                        handleCancelSale(selectedSale.id);
                        setSelectedSale(null);
                    }}
                />
            )}
        </>
    );
}

function SaleDetailModal({ sale, onClose, onCancel }) {
    return (
        <div
            onClick={onClose}
            className="fixed inset-0 z-[9999] flex justify-center bg-black/70 backdrop-blur-sm overflow-y-auto pt-4 sm:pt-14 pb-14 px-4"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--color-surface)] border border-[var(--color-glass-border)] w-full max-w-sm rounded-[2rem] shadow-2xl relative h-fit animate-in slide-in-from-top-4 duration-300"
            >
                {/* Header Compacto */}
                <div className="p-4 border-b border-[var(--color-glass-border)] flex items-center justify-between bg-[var(--color-surface-highlight)] rounded-t-[2rem]">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <History size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-[var(--color-text-main)]">Venta #{sale.id.slice(-6).toUpperCase()}</h2>
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)]">{new Date(sale.date).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-8 w-8 rounded-full bg-[var(--color-background)] border border-[var(--color-glass-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-primary transition-all">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5">
                    {/* Info Cliente/Pago Compacta */}
                    <div className="flex gap-2 mb-4">
                        <div className="flex-1 bg-[var(--color-background)] p-3 rounded-xl border border-[var(--color-glass-border)]">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Cliente</p>
                            <p className="text-xs font-bold text-[var(--color-text-main)] truncate">{sale.customerName || "Venta Directa"}</p>
                        </div>
                        <div className="flex-1 bg-[var(--color-background)] p-3 rounded-xl border border-[var(--color-glass-border)]">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Método</p>
                            <p className="text-xs font-bold text-primary">{sale.paymentMethod || "Efectivo"}</p>
                        </div>
                    </div>

                    {/* Totales en Fila */}
                    <div className="flex gap-2 mb-6">
                        <div className="flex-1 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl">
                            <p className="text-[9px] font-black text-emerald-500 uppercase mb-0.5">Ganancia</p>
                            <p className="text-lg font-black text-emerald-500">+${sale.profit.toFixed(2)}</p>
                        </div>
                        <div className="flex-1 bg-primary/5 border border-primary/10 p-3 rounded-xl">
                            <p className="text-[9px] font-black text-primary uppercase mb-0.5">Total</p>
                            <p className="text-lg font-black text-[var(--color-text-main)]">${sale.total.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Lista Mini */}
                    <div className="mb-6">
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3 flex items-center gap-2">
                            <ShoppingCart size={12} /> PRODUCTOS ({sale.items?.length})
                        </h3>
                        <div className="space-y-2">
                            {sale.items?.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-background)] border border-[var(--color-glass-border)]">
                                    <div className="h-9 w-9 rounded-lg bg-[var(--color-surface-highlight)] flex flex-col items-center justify-center border border-[var(--color-glass-border)] flex-shrink-0">
                                        <span className="text-xs font-black text-primary leading-none">{item.quantity}</span>
                                        <span className="text-[7px] font-black text-[var(--color-text-muted)]">CANT</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-[var(--color-text-main)] text-[13px] truncate">{item.name}</p>
                                        <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">{item.batchLabel || "General"}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[13px] font-black text-[var(--color-text-main)]">${(item.unitPrice * item.quantity).toFixed(2)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Acciones Compactas */}
                    <div className="flex gap-2 pt-4 border-t border-dashed border-[var(--color-glass-border)]">
                        <button
                            onClick={onCancel}
                            className="flex-1 h-11 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 font-black uppercase text-[9px] tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                        >
                            Anular
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 h-11 rounded-xl bg-[var(--color-text-main)] text-[var(--color-surface)] font-black uppercase text-[9px] tracking-widest shadow-md hover:opacity-90 transition-all"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
