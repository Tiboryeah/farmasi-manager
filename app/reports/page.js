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

        const relevantExpenses = expenses.filter(e => {
            if (timeFrame === 'year') {
                return new Date(e.date).getFullYear() === now.getFullYear();
            } else {
                const daysToShow = timeFrame === 'week' ? 7 : 30;
                const d = new Date(e.date);
                const diff = Math.ceil(Math.abs(now - d) / (1000 * 60 * 60 * 24));
                return diff <= daysToShow;
            }
        });

        const totalRevenue = relevantSales.reduce((acc, curr) => acc + curr.total, 0);
        const grossProfit = relevantSales.reduce((acc, curr) => acc + (curr.profit || 0), 0);
        const totalExpenses = relevantExpenses.reduce((acc, curr) => acc + curr.amount, 0);

        const totalProfit = grossProfit - totalExpenses; // Net Profit
        const totalSalesCount = relevantSales.length;
        const avgTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
        const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        return { totalRevenue, totalProfit, avgTicket, margin, grossProfit, totalExpenses };
    }, [sales, expenses, timeFrame]);

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

    const handleDownload = (period = 'history') => {
        try {
            const now = new Date();
            let filteredSales = [...sales];
            let filteredExpenses = [...expenses];

            if (period !== 'history') {
                const cutoff = new Date();
                if (period === 'day') {
                    cutoff.setHours(0, 0, 0, 0); // Desde hoy a las 00:00
                } else {
                    const days = period === 'week' ? 7 : 30;
                    cutoff.setDate(now.getDate() - days);
                    cutoff.setHours(0, 0, 0, 0);
                }

                filteredSales = sales.filter(s => new Date(s.date) >= cutoff);
                filteredExpenses = expenses.filter(e => new Date(e.date) >= cutoff);
            }

            const wb = XLSX.utils.book_new();

            // 1. Hoja de Resumen de Ventas
            const salesHeaders = ["ID", "Fecha", "Cliente", "Total", "Ganancia", "Metodo", "Items"];
            const salesData = filteredSales.map(s => ({
                ID: s.id.slice(-6),
                Fecha: new Date(s.date).toLocaleDateString(),
                Cliente: s.customerName || 'Consumidor Final',
                Total: s.total,
                Ganancia: s.profit,
                Metodo: s.paymentMethod || 'Efectivo',
                Items: s.items?.length || 0
            }));
            const wsSales = XLSX.utils.json_to_sheet(salesData, { header: salesHeaders });
            XLSX.utils.book_append_sheet(wb, wsSales, "Resumen Ventas");

            // 2. Hoja de Detalle de Productos
            const productHeaders = ["ID_Venta", "Fecha", "Cliente", "Producto", "Cantidad", "Precio_Unit", "Costo_Unit", "Total_Linea", "Ganancia_Linea", "Metodo"];
            const productDetails = [];
            filteredSales.forEach(sale => {
                if (sale.items && Array.isArray(sale.items)) {
                    sale.items.forEach(item => {
                        productDetails.push({
                            ID_Venta: sale.id.slice(-6),
                            Fecha: new Date(sale.date).toLocaleDateString(),
                            Cliente: sale.customerName || 'Consumidor Final',
                            Producto: item.name,
                            Cantidad: item.quantity,
                            Precio_Unit: item.unitPrice,
                            Costo_Unit: item.unitCost,
                            Total_Linea: item.unitPrice * item.quantity,
                            Ganancia_Linea: (item.unitPrice - item.unitCost) * item.quantity,
                            Metodo: sale.paymentMethod || 'Efectivo'
                        });
                    });
                }
            });
            const wsProducts = XLSX.utils.json_to_sheet(productDetails, { header: productHeaders });
            XLSX.utils.book_append_sheet(wb, wsProducts, "Detalle Productos");

            // 3. Hoja de Gastos
            const expenseHeaders = ["ID", "Fecha", "Categoria", "Monto", "Nota"];
            const expensesData = filteredExpenses.map(e => ({
                ID: e.id.slice(-6),
                Fecha: new Date(e.date).toLocaleDateString(),
                Categoria: e.category,
                Monto: e.amount,
                Nota: e.note
            }));
            const wsExpenses = XLSX.utils.json_to_sheet(expensesData, { header: expenseHeaders });
            XLSX.utils.book_append_sheet(wb, wsExpenses, "Gastos");

            const periodLabel = period === 'day' ? 'Hoy' : period === 'week' ? 'Semana' : period === 'month' ? 'Mes' : 'Completo';
            XLSX.writeFile(wb, `DianiFarmi-Reporte-${periodLabel}-${new Date().toISOString().split('T')[0]}.xlsx`);
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
            a.download = `dianifarmi-backup-${new Date().toISOString().split('T')[0]}.json`;
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
                    <h1 className="text-3xl font-bold text-zinc-900">Reportes Financieros</h1>
                    <p className="text-zinc-500 text-sm mt-1">Análisis profundo del rendimiento de tu negocio</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-white border border-zinc-200 p-1 rounded-2xl flex shadow-sm">
                        <button
                            onClick={() => setTimeFrame('week')}
                            className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${timeFrame === 'week' ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-900'}`}
                        >
                            Vista Semanal
                        </button>
                        <button
                            onClick={() => setTimeFrame('month')}
                            className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${timeFrame === 'month' ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-900'}`}
                        >
                            Mensual
                        </button>
                        <button
                            onClick={() => setTimeFrame('year')}
                            className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${timeFrame === 'year' ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-900'}`}
                        >
                            Anual
                        </button>
                    </div>

                    <button
                        onClick={handleDownloadBackup}
                        disabled={isBackingUp}
                        className={`btn h-12 rounded-2xl flex items-center gap-2 px-6 shadow-sm ${isBackingUp ? 'opacity-50 cursor-not-allowed bg-zinc-100 text-zinc-400' : 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'}`}
                    >
                        <ShieldCheck size={18} />
                        <span>{isBackingUp ? 'Procesando...' : 'Respaldo Nube'}</span>
                    </button>
                </div>
            </header>

            <section className="card p-6 bg-zinc-900 text-white border-zinc-800 shadow-xl rounded-2xl">
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                        <Download size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Exportación de Datos</h2>
                        <p className="text-sm text-zinc-400 font-medium">Descarga tus reportes detallados en formato Excel</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button onClick={() => handleDownload('day')} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                        <Calendar size={24} className="text-zinc-400 group-hover:text-white" />
                        <span className="text-xs font-black uppercase tracking-tighter text-zinc-500 group-hover:text-white">Ventas del Día</span>
                    </button>
                    <button onClick={() => handleDownload('week')} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                        <TrendingUp size={24} className="text-zinc-400 group-hover:text-white" />
                        <span className="text-xs font-black uppercase tracking-tighter text-zinc-500 group-hover:text-white">Esta Semana</span>
                    </button>
                    <button onClick={() => handleDownload('month')} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                        <BarChart3 size={24} className="text-zinc-400 group-hover:text-white" />
                        <span className="text-xs font-black uppercase tracking-tighter text-zinc-500 group-hover:text-white">Todo el Mes</span>
                    </button>
                    <button onClick={() => handleDownload('history')} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-primary text-white border border-primary hover:scale-[1.02] transition-all group shadow-lg shadow-primary/30">
                        <History size={24} className="text-white" />
                        <span className="text-xs font-black uppercase tracking-tighter text-white/80 group-hover:text-white">Historial Total</span>
                    </button>
                </div>
            </section>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card stat-card bg-white border-zinc-100 shadow-sm p-4 rounded-2xl border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start text-zinc-500 mb-2">
                        <span className="text-xs uppercase font-bold tracking-widest">Ingresos Totales</span>
                        <div className="bg-blue-50 p-2 rounded-xl text-blue-500">
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="stat-value text-2xl font-black text-zinc-900">${kpis.totalRevenue.toLocaleString()}</div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1">
                            {timeFrame === 'year' ? 'En el año actual' : `Últimos ${timeFrame === 'week' ? '7' : '30'} días`}
                        </p>
                    </div>
                </div>

                <div className="card stat-card bg-white border-zinc-100 shadow-sm p-4 rounded-2xl border-l-4 border-l-emerald-500">
                    <div className="flex justify-between items-start text-emerald-600 mb-2">
                        <span className="text-xs uppercase font-bold tracking-widest">Ganancia Neta</span>
                        <div className="bg-emerald-50 p-2 rounded-xl">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="stat-value text-2xl font-black text-emerald-600">${kpis.totalProfit.toLocaleString()}</div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1">
                            Bruta: ${kpis.grossProfit.toLocaleString()} | Gastos: -${kpis.totalExpenses.toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="card stat-card bg-white border-zinc-100 shadow-sm p-4 rounded-2xl border-l-4 border-l-purple-500">
                    <div className="flex justify-between items-start text-zinc-500 mb-2">
                        <span className="text-xs uppercase font-bold tracking-widest">Ticket Prom.</span>
                        <div className="bg-purple-50 p-2 rounded-xl text-purple-500">
                            <BarChart3 size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="stat-value text-2xl font-black text-zinc-900">${kpis.avgTicket.toFixed(0)}</div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1">Promedio x venta</p>
                    </div>
                </div>

                <div className="card stat-card bg-white border-zinc-100 shadow-sm p-4 rounded-2xl border-l-4 border-l-primary">
                    <div className="flex justify-between items-start text-primary mb-2">
                        <span className="text-xs uppercase font-bold tracking-widest">Margen Bruto</span>
                        <div className="bg-primary/10 p-2 rounded-xl">
                            <Filter size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="stat-value text-2xl font-black text-primary">{kpis.margin.toFixed(1)}%</div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1">Rentabilidad</p>
                    </div>
                </div>
            </div>

            <section className="card p-0 overflow-hidden bg-white border border-zinc-200 shadow-sm rounded-2xl">
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-xl text-primary shadow-sm border border-zinc-100">
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-zinc-900">Rendimiento Histórico</h2>
                            <p className="text-xs text-zinc-500">Evolución de ventas y ganancias</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#71717a"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#71717a"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#ffffff',
                                    borderColor: '#e4e4e7',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                    color: '#09090b'
                                }}
                                itemStyle={{ color: '#09090b' }}
                                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" />
                            <Bar name="Ventas" dataKey="ventas" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar name="Ganancia" dataKey="ganancia" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="card p-0 flex flex-col h-[400px] bg-white border border-zinc-200 shadow-sm rounded-2xl">
                    <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-50 p-2 rounded-xl text-amber-500 border border-amber-100">
                                <Package size={20} />
                            </div>
                            <h2 className="font-bold text-zinc-900">Top Productos</h2>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-zinc-100 text-xs text-zinc-400 uppercase tracking-wider">
                                    <th className="p-4 text-left font-bold">Producto</th>
                                    <th className="p-4 text-right font-bold">Ventas</th>
                                    <th className="p-4 text-right font-bold">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topProducts.map((prod, i) => (
                                    <tr key={i} className="hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-0">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-zinc-100 text-[10px] font-bold flex items-center justify-center text-zinc-500">
                                                    {i + 1}
                                                </span>
                                                <span className="font-medium truncate max-w-[150px] text-zinc-900">{prod.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right text-zinc-500 font-medium">{prod.quantity}</td>
                                        <td className="p-4 text-right font-bold text-emerald-600">${prod.revenue.toFixed(0)}</td>
                                    </tr>
                                ))}
                                {topProducts.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="text-center py-20 text-zinc-400 italic">No hay datos suficientes</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="card p-0 flex flex-col h-[400px] bg-white border border-zinc-200 shadow-sm rounded-2xl">
                    <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-50 p-2 rounded-xl text-blue-500 border border-blue-100">
                                <History size={20} />
                            </div>
                            <h2 className="font-bold text-zinc-900">Ventas Recientes</h2>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
                        {sales.slice(0, 8).map((sale) => (
                            <div key={sale.id} className="p-4 bg-white rounded-2xl border border-zinc-100 flex justify-between items-center hover:border-primary/30 hover:shadow-md transition-all group shadow-sm">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg text-zinc-900">${sale.total.toFixed(0)}</span>
                                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${sale.paymentMethod === 'Tarjeta' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-600'}`}>
                                            {sale.paymentMethod || 'Efectivo'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-zinc-700 truncate max-w-[120px]">
                                            {sale.customerName || "Venta Rápida"}
                                        </span>
                                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                                            {new Date(sale.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <span className="block text-[8px] text-zinc-400 font-bold uppercase">Ganancia</span>
                                        <span className="font-bold text-emerald-600 text-sm">+${sale.profit.toFixed(0)}</span>
                                    </div>
                                    <div className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center text-xs font-bold text-zinc-600 border border-zinc-100">
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
