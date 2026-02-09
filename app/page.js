"use client";

import { useState, useEffect } from "react";
import { PlusCircle, TrendingUp, TrendingDown, DollarSign, Package, ArrowUpRight, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { getDashboardStats, getRecentActivity, performWeeklyBackupAction } from "@/app/actions";

export default function Home() {
  const [stats, setStats] = useState({
    today: { revenue: 0, profit: 0 },
    month: { revenue: 0, profit: 0 },
    lowStock: 0
  });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Trigger weekly backup check
        performWeeklyBackupAction();

        const [dashStats, recentAct] = await Promise.all([
          getDashboardStats(),
          getRecentActivity()
        ]);
        setStats(dashStats);
        setRecent(recentAct);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const [percentageChange, setPercentageChange] = useState(0);

  useEffect(() => {
    if (stats.yesterday?.revenue > 0) {
      const change = ((stats.today.revenue - stats.yesterday.revenue) / stats.yesterday.revenue) * 100;
      setPercentageChange(change);
    } else if (stats.today.revenue > 0) {
      setPercentageChange(100);
    } else {
      setPercentageChange(0);
    }
  }, [stats]);

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
            Panel de Control
          </h1>
          <p className="text-secondary text-sm">Resumen de rendimiento hoy</p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-gradient-primary flex items-center justify-center text-white font-bold shadow-glow">
          DF
        </div>
      </header>

      {/* Main Stats Grid */}
      <section className="stats-grid">
        <div className="card stat-card">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-xs uppercase font-bold tracking-wider">Ventas Hoy</span>
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="stat-value">${stats.today.revenue.toFixed(2)}</div>
          <div className={`text-xs flex items-center gap-1 font-medium ${percentageChange >= 0 ? 'text-success' : 'text-danger'}`}>
            {percentageChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(percentageChange).toFixed(1)}% vs ayer
          </div>
        </div>

        <div className="card stat-card border-success/20">
          <div className="flex items-center justify-between text-success">
            <span className="text-xs uppercase font-bold tracking-wider">Ganancia</span>
            <div className="p-2 bg-success/10 rounded-lg">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-value text-success">${stats.today.profit.toFixed(2)}</div>
          <div className="text-xs text-secondary font-medium">Margen estimado</div>
        </div>

        <div className="card stat-card">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-xs uppercase font-bold tracking-wider">Stock</span>
            <div className="p-2 bg-zinc-800 rounded-lg">
              <Package size={18} />
            </div>
          </div>
          <div className="stat-value">{stats.totalStock || 0}</div>
          <div className="text-xs text-secondary font-medium">
            {stats.totalProducts || 0} Prod.
            {stats.lowStock > 0 && <span className="text-danger ml-1">({stats.lowStock} bajos)</span>}
          </div>
        </div>

        <div className="card stat-card">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-xs uppercase font-bold tracking-wider">Ventas Mes</span>
            <div className="p-2 bg-zinc-800 rounded-lg">
              <ShoppingCart size={18} />
            </div>
          </div>
          <div className="stat-value">${stats.month.revenue.toLocaleString()}</div>
          <div className="text-xs text-secondary font-medium">Ciclo actual</div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-bold mb-6 tracking-tight text-white">Acciones Rápidas</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/sales/new" style={{ flex: 1 }} className="btn btn-primary h-32 flex flex-col items-center justify-center text-center group transition-all duration-300 hover:scale-[1.02] shadow-glow">
            <div className="bg-white/20 p-3 rounded-2xl mb-2 group-hover:scale-110 transition-transform">
              <PlusCircle size={28} />
            </div>
            <span className="text-lg font-black tracking-tight">Nueva Venta</span>
            <span className="text-[10px] opacity-70 font-black uppercase tracking-widest">Registrar Pedido</span>
          </Link>

          <Link href="/expenses" style={{ flex: 1 }} className="btn btn-secondary h-32 flex flex-col items-center justify-center text-center group transition-all duration-300 hover:scale-[1.02]">
            <div className="bg-primary/10 p-3 rounded-2xl mb-2 text-primary group-hover:scale-110 transition-transform">
              <DollarSign size={28} />
            </div>
            <span className="text-lg font-black tracking-tight text-white">Gasto</span>
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Registrar Egreso</span>
          </Link>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="mt-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Actividad Reciente</h2>
          <Link href="/sales" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
            Ver historial <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {recent.length === 0 ? (
            <div className="card text-center text-secondary py-10 dashed border-zinc-800">
              <ShoppingCart size={40} className="mx-auto mb-2 opacity-10" />
              <p>No hay ventas recientes hoy</p>
            </div>
          ) : (
            recent.map((item) => (
              <div key={item.id + item.name} className="card flex items-center justify-between p-4 group hover:bg-zinc-800/50">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    🛒
                  </div>
                  <div>
                    <div className="font-bold text-base">{item.quantity}x {item.name}</div>
                    <div className="text-xs text-secondary flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] uppercase font-bold tracking-wider">Venta</span>
                      {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-success text-lg">+${item.total.toFixed(2)}</div>
                  <div className="text-[10px] text-secondary font-bold uppercase tracking-widest">Cobrado</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
