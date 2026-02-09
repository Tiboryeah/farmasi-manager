"use client";

import { useState, useEffect } from "react";
import { Plus, ShoppingCart, Calendar, ArrowUpRight, History } from "lucide-react";
import Link from "next/link";
import { getSales } from "@/app/actions";

export default function SalesHistoryPage() {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSales().then((data) => {
            setSales(data);
            setLoading(false);
        });
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
    );

    return (
        <div className="flex flex-col gap-6 animate-fade-in pb-10">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">Historial de Ventas</h1>
                    <p className="text-secondary text-sm">Registro cronológico de pedidos</p>
                </div>
                <Link href="/sales/new" className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-glow hover:scale-110 transition-transform">
                    <Plus size={24} />
                </Link>
            </header>

            <div className="flex flex-col gap-4">
                {sales.length === 0 ? (
                    <div className="card py-20 flex flex-col items-center text-zinc-600 dashed border-zinc-800">
                        <History size={64} className="opacity-10 mb-4" />
                        <p className="text-lg font-medium">No hay ventas registradas</p>
                        <Link href="/sales/new" className="text-primary mt-2 text-sm font-bold">Crear primera venta</Link>
                    </div>
                ) : (
                    sales.map((sale) => (
                        <div key={sale.id} className="card p-5 group hover:bg-zinc-900/50 transition-all">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                        🛍️
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg text-white">Venta #{sale.id.slice(-6)}</h3>
                                            <span className="px-2 py-0.5 rounded-md bg-success/10 text-success text-[10px] font-black uppercase">Completada</span>
                                        </div>
                                        <div className="text-xs text-secondary flex items-center gap-2 mt-1">
                                            <Calendar size={12} />
                                            {new Date(sale.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            <span className="opacity-30">•</span>
                                            {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-6 sm:text-right border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-secondary font-black uppercase tracking-widest">Inversión</span>
                                        <span className="font-bold text-zinc-400">$ {(sale.total - sale.profit).toFixed(2)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-success font-black uppercase tracking-widest">Ganancia</span>
                                        <span className="font-bold text-success text-xl">+${sale.profit.toFixed(2)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Total</span>
                                        <span className="font-black text-2xl text-white">${sale.total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
