"use client";

import { useState, useEffect } from "react";
import { PlusCircle, ShoppingCart, Calendar } from "lucide-react";
import Link from "next/link";
import { getSales } from "@/app/actions";

export default function SalesHistoryPage() {
    const [sales, setSales] = useState([]);

    useEffect(() => {
        getSales().then(setSales);
    }, []);

    return (
        <div className="flex flex-col h-full pb-20">
            <header className="flex items-center justify-between py-4 mb-2">
                <h1 className="text-xl font-bold">Historial de Ventas</h1>
                <Link href="/sales/new" className="btn btn-primary p-2 rounded-full">
                    <PlusCircle size={24} />
                </Link>
            </header>

            <div className="flex flex-col gap-3 overflow-y-auto">
                {sales.length === 0 && (
                    <div className="text-center text-secondary py-10">No hay ventas registradas aún.</div>
                )}

                {sales.map((sale) => (
                    <div key={sale.id} className="card p-3 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-surface-hover flex items-center justify-center text-success">
                                <ShoppingCart size={20} />
                            </div>
                            <div>
                                <div className="font-bold text-sm">Venta #{sale.id}</div>
                                <div className="text-xs text-secondary flex items-center gap-1">
                                    <Calendar size={10} />
                                    {new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="font-bold text-white text-lg">${sale.total.toFixed(2)}</div>
                            <div className="text-xs text-success font-semibold">
                                Ganancia: +${sale.profit.toFixed(2)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
