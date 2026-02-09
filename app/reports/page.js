"use client";

import { useState, useEffect } from "react";
import { getDashboardStats } from "@/app/actions";

export default function ReportsPage() {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        getDashboardStats().then(setStats);
    }, []);

    if (!stats) return <div className="p-4">Calculando reportes...</div>;

    return (
        <div className="flex flex-col h-full gap-4">
            <header className="flex items-center justify-between py-4">
                <h1 className="text-xl font-bold">Reportes Financieros</h1>
            </header>

            <div className="card p-4">
                <h2 className="text-lg font-bold mb-3">Balance del Mes</h2>
                <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-secondary">Ventas Totales</span>
                    <span className="font-bold text-white">${stats.month.revenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-secondary">Ganancia Bruta</span>
                    <span className="font-bold text-success">+${stats.month.profit.toFixed(2)}</span>
                </div>
                <div className="mt-4 text-xs text-secondary text-center">
                    * Los gastos se restarán en futuras actualizaciones del balance.
                </div>
            </div>

            <div className="card p-4">
                <h2 className="text-lg font-bold mb-3">Estadísticas Hoy</h2>
                <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-secondary">Venta</span>
                    <span className="font-bold text-white">${stats.today.revenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2">
                    <span className="text-secondary">Ganancia</span>
                    <span className="font-bold text-success">+${stats.today.profit.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
}
