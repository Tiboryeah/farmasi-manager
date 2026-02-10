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

  const [percentageChange, setPercentageChange] = useState(0);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-main)]">
            Panel de Control
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm">Resumen de rendimiento hoy</p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white font-bold shadow-lg shadow-primary/30">
          DF
        </div>
      </header>

      {/* Main Stats Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card stat-card bg-[var(--color-surface)] border-[var(--color-glass-border)] shadow-sm p-5 rounded-2xl border-l-4 border-l-pink-500">
          <div className="flex items-center justify-between text-[var(--color-text-muted)] mb-3">
            <span className="text-[10px] uppercase font-black tracking-widest">Ventas Hoy</span>
            <div className="p-2 bg-pink-500/10 rounded-xl text-pink-500 border border-pink-500/20">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="stat-value text-2xl font-black text-[var(--color-text-main)]">${stats.today.revenue.toLocaleString()}</div>
          <div className={`text-[10px] flex items-center gap-1 font-black uppercase mt-1 ${percentageChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {percentageChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(percentageChange).toFixed(1)}% vs ayer
          </div>
        </div>

        <div className="card stat-card bg-[var(--color-surface)] border-[var(--color-glass-border)] shadow-sm p-5 rounded-2xl border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-[var(--color-text-muted)] mb-3">
            <span className="text-[10px] uppercase font-black tracking-widest">Ganancia</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-value text-2xl font-black text-emerald-500">${stats.today.profit.toLocaleString()}</div>
          <div className="text-[10px] text-[var(--color-text-muted)] font-black uppercase mt-1">Margen estimado</div>
        </div>

        <div className="card stat-card bg-[var(--color-surface)] border-[var(--color-glass-border)] shadow-sm p-5 rounded-2xl border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-[var(--color-text-muted)] mb-3">
            <span className="text-[10px] uppercase font-black tracking-widest">Stock</span>
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20">
              <Package size={18} />
            </div>
          </div>
          <div className="stat-value text-2xl font-black text-[var(--color-text-main)]">{stats.totalStock || 0}</div>
          <div className="text-[10px] text-[var(--color-text-muted)] font-black uppercase mt-1">
            {stats.totalProducts || 0} Prod.
            {stats.lowStock > 0 && <span className="text-rose-500 ml-1">({stats.lowStock} bajos)</span>}
          </div>
        </div>

        <div className="card stat-card bg-[var(--color-surface)] border-[var(--color-glass-border)] shadow-sm p-5 rounded-2xl border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-[var(--color-text-muted)] mb-3">
            <span className="text-[10px] uppercase font-black tracking-widest">Ventas Mes</span>
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20">
              <ShoppingCart size={18} />
            </div>
          </div>
          <div className="stat-value text-2xl font-black text-[var(--color-text-main)]">${stats.month.revenue.toLocaleString()}</div>
          <div className="text-[10px] text-[var(--color-text-muted)] font-black uppercase mt-1">Ciclo actual</div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-bold mb-6 tracking-tight text-[var(--color-text-main)]">Acciones Rápidas</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/sales/new" style={{ flex: 1 }} className="btn btn-primary h-32 flex flex-col items-center justify-center text-center group transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-primary/20 bg-primary border-none">
            <div className="bg-white/20 p-3 rounded-2xl mb-2 group-hover:scale-110 transition-transform text-white">
              <PlusCircle size={28} />
            </div>
            <span className="text-lg font-black tracking-tight text-white">Nueva Venta</span>
            <span className="text-[10px] opacity-80 font-black uppercase tracking-widest text-white">Registrar Pedido</span>
          </Link>

          <Link href="/expenses" style={{ flex: 1 }} className="btn h-32 flex flex-col items-center justify-center text-center group transition-all duration-300 hover:scale-[1.02] bg-[var(--color-surface)] border border-[var(--color-glass-border)] shadow-sm hover:shadow-md">
            <div className="bg-[var(--color-surface-highlight)] p-3 rounded-2xl mb-2 text-primary group-hover:scale-110 transition-transform">
              <DollarSign size={28} />
            </div>
            <span className="text-lg font-black tracking-tight text-[var(--color-text-main)]">Gasto</span>
            <span className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-widest">Registrar Egreso</span>
          </Link>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="mt-2 pb-20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--color-text-main)]">Actividad Reciente</h2>
          <Link href="/sales" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
            Ver historial <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {recent.length === 0 ? (
            <div className="card text-center text-[var(--color-text-muted)] py-10 dashed border border-[var(--color-glass-border)] border-dashed rounded-2xl">
              <ShoppingCart size={40} className="mx-auto mb-2 opacity-20" />
              <p className="font-medium">No hay ventas recientes hoy</p>
            </div>
          ) : (
            recent.map((item) => (
              <div key={item.id + item.name} className="card flex items-center justify-between p-4 group hover:bg-[var(--color-surface-hover)] cursor-pointer transition-colors bg-[var(--color-surface)] border border-[var(--color-glass-border)] shadow-sm rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-[var(--color-surface-highlight)] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform border border-[var(--color-glass-border)]">
                    🛒
                  </div>
                  <div>
                    <div className="font-bold text-base text-[var(--color-text-main)]">{item.quantity}x {item.name}</div>
                    <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-[var(--color-surface-highlight)] rounded text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)]">Venta</span>
                      {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-500 text-lg">+${item.total.toFixed(2)}</div>
                  <div className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest">Cobrado</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
