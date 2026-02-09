"use client";

import { useState, useEffect, useMemo } from "react";
import { getAllSales, getExpenses, downloadBackupAction } from "@/app/actions";
import * as XLSX from 'xlsx';
import { Download, TrendingUp, DollarSign, Calendar, BarChart3, Package, History, ArrowUpRight, Filter, ShieldCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

export default function ReportsPage() {
    const [sales, setSales] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [timeFrame, setTimeFrame] = useState('month'); // 'week' | 'month' | 'year'

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [allSales, allExpenses] = await Promise.all([
                    getAllSales(),
                    getExpenses()
                ]);
                setSales(allSales);
                setExpenses(allExpenses);
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // --- DATA PROCESSING FOR CHARTS ---
    const chartData = useMemo(() => {
        if (!sales.length) return [];

        const now = new Date();
        const dataMap = {};

        if (timeFrame === 'year') {
            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthIndex = d.getMonth();
                const key = `${months[monthIndex]} ${d.getFullYear().toString().slice(-2)}`;
                dataMap[key] = { date: key, ventas: 0, ganancia: 0, sortKey: d.getTime() };
            }

            sales.forEach(sale => {
                const saleDate = new Date(sale.date);
                const monthIndex = saleDate.getMonth();
                const key = `${months[monthIndex]} ${saleDate.getFullYear().toString().slice(-2)}`;
                if (dataMap[key]) {
                    dataMap[key].ventas += sale.total;
                    dataMap[key].ganancia += sale.profit || 0;
                }
            });
        } else {
            let daysToShow = timeFrame === 'week' ? 7 : 30;

            for (let i = daysToShow - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(now.getDate() - i);
                const key = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
                dataMap[key] = { date: key, ventas: 0, ganancia: 0, sortKey: d.getTime() };
            }

            sales.forEach(sale => {
                const saleDate = new Date(sale.date);
                const key = saleDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
                if (dataMap[key]) {
                    dataMap[key].ventas += sale.total;
                    dataMap[key].ganancia += sale.profit || 0;
                }
            });
        }

        return Object.values(dataMap).sort((a, b) => a.sortKey - b.sortKey);
    }, [sales, timeFrame]);

    // --- KPIS CALCULATION ---
    const kpis = useMemo(() => {
        const now = new Date();
        let relevantSales = [];

        if (timeFrame === 'year') {
            relevantSales = sales.filter(s => {
                const d = new Date(s.date);
                return d.getFullYear() === now.getFullYear();
            });
        } else {
            const daysToShow = timeFrame === 'week' ? 7 : 30;
            relevantSales = sales.filter(s => {
                const d = new Date(s.date);
                const diff = Math.ceil(Math.abs(now - d) / (1000 * 60 * 60 * 24));
                return diff <= daysToShow;
            });
        }

        const totalRevenue = relevantSales.reduce((acc, curr) => acc + curr.total, 0);
        const totalProfit = relevantSales.reduce((acc, curr) => acc + (curr.profit || 0), 0);
        const totalSalesCount = relevantSales.length;
        const avgTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
        const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        return { totalRevenue, totalProfit, avgTicket, margin };
    }, [sales, timeFrame]);

    // --- TOP PRODUCTS ---
    const topProducts = useMemo(() => {
        return sales.reduce((acc, sale) => {
            if (!sale.items) return acc;
            sale.items.forEach(item => {
                const existing = acc.find(p => p.name === item.name);
                if (existing) {
                    existing.quantity += item.quantity;
                    existing.profit += (item.profit || 0);
                    existing.revenue += (item.unitPrice * item.quantity);
                } else {
                    acc.push({
                        name: item.name,
                        quantity: item.quantity,
                        profit: item.profit || 0,
                        revenue: item.unitPrice * item.quantity
                    });
                }
            });
            return acc;
        }, []).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    }, [sales]);

    const handleDownload = () => {
        try {
            const wb = XLSX.utils.book_new();
            const salesData = sales.map(s => ({
                ID: s.id.slice(-6),
                Fecha: new Date(s.date).toLocaleDateString(),
                Total: s.total,
                Ganancia: s.profit,
                Metodo: s.paymentMethod,
                Items: s.items?.length || 0
            }));
            const wsSales = XLSX.utils.json_to_sheet(salesData);
            XLSX.utils.book_append_sheet(wb, wsSales, "Resumen Ventas");

            const productDetails = [];
            sales.forEach(sale => {
                if (sale.items && Array.isArray(sale.items)) {
                    sale.items.forEach(item => {
                        productDetails.push({
                            ID_Venta: sale.id.slice(-6),
                            Fecha: new Date(sale.date).toLocaleDateString(),
                            Producto: item.name,
                            Cantidad: item.quantity,
                            Precio_Unit: item.unitPrice,
                            Costo_Unit: item.unitCost,
                            Total_Linea: item.unitPrice * item.quantity,
                            Ganancia_Linea: (item.unitPrice - item.unitCost) * item.quantity
                        });
                    });
                }
            });
            const wsProducts = XLSX.utils.json_to_sheet(productDetails);
            XLSX.utils.book_append_sheet(wb, wsProducts, "Detalle Productos");

            const expensesData = expenses.map(e => ({
                ID: e.id.slice(-6),
                Fecha: new Date(e.date).toLocaleDateString(),
                Categoria: e.category,
                Monto: e.amount,
                Nota: e.note
            }));
            const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
            XLSX.utils.book_append_sheet(wb, wsExpenses, "Gastos");

            XLSX.writeFile(wb, `Reporte_Farmasi_Completo_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (e) {
            console.error(e);
            alert("Error al generar reporte: " + e.message);
        }
    };

    const handleDownloadBackup = async () => {
        setIsBackingUp(true);
        try {
            const data = await downloadBackupAction();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `farmasi-full-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Backup failed:", error);
            alert("Error al generar el respaldo de seguridad.");
        } finally {
            setIsBackingUp(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
    );

    return (
        <div className="flex flex-col gap-12 animate-fade-in w-full pb-20">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">Reportes Financieros</h1>
                    <p className="text-secondary text-sm mt-1">Análisis profundo del rendimiento de tu negocio</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="glass p-1 rounded-2xl flex">
                        <button
                            onClick={() => setTimeFrame('week')}
                            className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${timeFrame === 'week' ? 'bg-primary text-white shadow-glow' : 'text-secondary hover:text-white'}`}
                        >
                            7 Días
                        </button>
                        <button
                            onClick={() => setTimeFrame('month')}
                            className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${timeFrame === 'month' ? 'bg-primary text-white shadow-glow' : 'text-secondary hover:text-white'}`}
                        >
                            30 Días
                        </button>
                        <button
                            onClick={() => setTimeFrame('year')}
                            className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${timeFrame === 'year' ? 'bg-primary text-white shadow-glow' : 'text-secondary hover:text-white'}`}
                        >
                            Año
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleDownload}
                            className="btn btn-secondary rounded-2xl flex items-center gap-2"
                        >
                            <Download size={18} />
                            <span>Excel</span>
                        </button>
                        <button
                            onClick={handleDownloadBackup}
                            disabled={isBackingUp}
                            className={`btn rounded-2xl flex items-center gap-2 ${isBackingUp ? 'opacity-50 cursor-not-allowed bg-zinc-800' : 'bg-success/10 text-success border border-success/20 hover:bg-success/20'}`}
                        >
                            <ShieldCheck size={18} />
                            <span>{isBackingUp ? 'Procesando...' : 'Backup Nube'}</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="stats-grid">
                <div className="card stat-card border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start text-secondary">
                        <span className="text-xs uppercase font-bold tracking-widest">Ingresos Totales</span>
                        <div className="bg-blue-500/10 p-2 rounded-xl text-blue-500">
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="stat-value">${kpis.totalRevenue.toLocaleString()}</div>
                        <p className="text-[10px] text-secondary font-bold uppercase">
                            {timeFrame === 'year' ? 'En el año actual' : `Últimos ${timeFrame === 'week' ? '7' : '30'} días`}
                        </p>
                    </div>
                </div>

                <div className="card stat-card border-l-4 border-l-success">
                    <div className="flex justify-between items-start text-success">
                        <span className="text-xs uppercase font-bold tracking-widest">Ganancia Neta</span>
                        <div className="bg-success/10 p-2 rounded-xl">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="stat-value text-success">${kpis.totalProfit.toLocaleString()}</div>
                        <p className="text-[10px] text-secondary font-bold uppercase">Retorno neto</p>
                    </div>
                </div>

                <div className="card stat-card border-l-4 border-l-purple-500">
                    <div className="flex justify-between items-start text-secondary">
                        <span className="text-xs uppercase font-bold tracking-widest">Ticket Prom.</span>
                        <div className="bg-purple-500/10 p-2 rounded-xl text-purple-500">
                            <BarChart3 size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="stat-value">${kpis.avgTicket.toFixed(0)}</div>
                        <p className="text-[10px] text-secondary font-bold uppercase">Promedio x venta</p>
                    </div>
                </div>

                <div className="card stat-card border-l-4 border-l-primary">
                    <div className="flex justify-between items-start text-primary">
                        <span className="text-xs uppercase font-bold tracking-widest">Margen Bruto</span>
                        <div className="bg-primary/10 p-2 rounded-xl">
                            <Filter size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="stat-value text-primary">{kpis.margin.toFixed(1)}%</div>
                        <p className="text-[10px] text-secondary font-bold uppercase">Rentabilidad</p>
                    </div>
                </div>
            </div>

            <section className="card p-0 overflow-hidden">
                <div className="p-6 border-b border-glass-border flex items-center justify-between bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-xl text-primary">
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Rendimiento Histórico</h2>
                            <p className="text-xs text-secondary">Evolución de ventas y ganancias</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#52525b"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#52525b"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#18181b',
                                    borderColor: '#27272a',
                                    borderRadius: '16px',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                                    border: '1px solid rgba(255,255,255,0.08)'
                                }}
                                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" />
                            <Bar name="Ventas" dataKey="ventas" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar name="Ganancia" dataKey="ganancia" fill="var(--success)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="card p-0 flex flex-col h-[400px]">
                    <div className="p-6 border-b border-glass-border bg-zinc-900/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-warning/10 p-2 rounded-xl text-warning">
                                <Package size={20} />
                            </div>
                            <h2 className="font-bold">Top Productos</h2>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th className="text-right">Ventas</th>
                                    <th className="text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topProducts.map((prod, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-zinc-800 text-[10px] font-bold flex items-center justify-center text-secondary">
                                                    {i + 1}
                                                </span>
                                                <span className="font-medium truncate max-w-[150px]">{prod.name}</span>
                                            </div>
                                        </td>
                                        <td className="text-right text-secondary font-medium">{prod.quantity}</td>
                                        <td className="text-right font-bold text-success">${prod.revenue.toFixed(0)}</td>
                                    </tr>
                                ))}
                                {topProducts.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="text-center py-20 text-secondary italic">No hay datos suficientes</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="card p-0 flex flex-col h-[400px]">
                    <div className="p-6 border-b border-glass-border bg-zinc-900/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-500/10 p-2 rounded-xl text-blue-500">
                                <History size={20} />
                            </div>
                            <h2 className="font-bold">Ventas Recientes</h2>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
                        {sales.slice(0, 8).map((sale) => (
                            <div key={sale.id} className="p-4 bg-zinc-900/30 rounded-2xl border border-white/5 flex justify-between items-center hover:border-primary/30 transition-all group">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg">${sale.total.toFixed(0)}</span>
                                        <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-[8px] font-black uppercase text-secondary">#{sale.id.slice(-4)}</span>
                                    </div>
                                    <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">
                                        {new Date(sale.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <span className="block text-[8px] text-zinc-500 font-bold uppercase">Ganancia</span>
                                        <span className="font-bold text-success text-sm">+${sale.profit.toFixed(0)}</span>
                                    </div>
                                    <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center text-xs font-bold shadow-inner">
                                        {sale.items?.length}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
