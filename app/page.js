"use client";

import { useState, useEffect } from "react";
import { PlusCircle, TrendingUp, DollarSign, Package } from "lucide-react";
import Link from "next/link";
import { getDashboardStats, getRecentActivity } from "@/app/actions";

export default function Home() {
  const [stats, setStats] = useState({
    today: { revenue: 0, profit: 0 },
    month: { revenue: 0, profit: 0 },
    lowStock: 0
  });
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    getDashboardStats().then(setStats);
    getRecentActivity().then(setRecent);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between py-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Farmasi Manager</h1>
          <p className="text-secondary text-sm">Resumen del negocio</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">FE</div>
      </header>

      {/* Main Stats */}
      <section className="stats-grid">
        <div className="card stat-card bg-surface">
          <div className="flex items-center gap-2 text-secondary">
            <DollarSign size={16} />
            <span className="text-xs uppercase font-bold">Ventas Hoy</span>
          </div>
          <div className="stat-value text-white">${stats.today.revenue.toFixed(2)}</div>
          <div className="text-xs text-success flex items-center gap-1">
            <TrendingUp size={12} /> Hoy
          </div>
        </div>

        <div className="card stat-card bg-surface" style={{ borderColor: 'var(--success)' }}>
          <div className="flex items-center gap-2 text-success">
            <DollarSign size={16} />
            <span className="text-xs uppercase font-bold">Ganancia Hoy</span>
          </div>
          <div className="stat-value text-success">${stats.today.profit.toFixed(2)}</div>
          <div className="text-xs text-secondary">Ganancia Real</div>
        </div>

        <div className="card stat-card bg-surface">
          <div className="flex items-center gap-2 text-secondary">
            <Package size={16} />
            <span className="text-xs uppercase font-bold">Stock Bajo</span>
          </div>
          <div className="stat-value text-warning">{stats.lowStock}</div>
          <div className="text-xs text-secondary">Productos</div>
        </div>

        <div className="card stat-card bg-surface">
          <div className="flex items-center gap-2 text-secondary">
            <DollarSign size={16} />
            <span className="text-xs uppercase font-bold">Ingreso Mes</span>
          </div>
          <div className="stat-value text-white">${stats.month.revenue.toLocaleString()}</div>
        </div>
      </section>

      {/* Actions */}
      <h2 className="text-lg font-bold mb-2">Acciones Rápidas</h2>
      <div className="grid grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <Link href="/sales/new" className="btn btn-primary flex flex-col gap-2 h-24 shadow-lg active:scale-95 transition-transform">
          <div className="bg-white/20 p-2 rounded-full">
            <PlusCircle size={28} />
          </div>
          <span className="text-sm">Nueva Venta</span>
        </Link>
        <Link href="/expenses" className="btn btn-ghost flex flex-col gap-2 h-24 bg-surface border-surface-highlight hover:bg-surface-highlight active:scale-95 transition-transform">
          <div className="text-danger bg-danger/10 p-2 rounded-full">
            <DollarSign size={28} />
          </div>
          <span className="text-sm">Registrar Gasto</span>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="mt-6 mb-20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Actividad Reciente</h2>
          <Link href="/sales" className="text-sm text-primary">Ver todo</Link>
        </div>
        <div className="flex flex-col gap-3">
          {recent.length === 0 ? (
            <div className="text-center text-secondary py-4">No hay ventas recientes</div>
          ) : (
            recent.map((item) => (
              <div key={item.id + item.name} className="card flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-surface-hover flex items-center justify-center text-xl">🛒</div>
                  <div>
                    <div className="font-bold text-sm">{item.quantity}x {item.name}</div>
                    <div className="text-xs text-secondary">{new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-success">+${item.total.toFixed(2)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
