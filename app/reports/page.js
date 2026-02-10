"use client";

import { useState, useEffect, useMemo } from "react";
import { getAllSales, getExpenses, downloadBackupAction, restoreBackupAction, resetDatabaseAction } from "@/app/actions";
import * as XLSX from 'xlsx';
import { Download, TrendingUp, DollarSign, Calendar, BarChart3, Package, History, ArrowUpRight, Filter, ShieldCheck, Upload, AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

export default function ReportsPage() {
    const [sales, setSales] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
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

    const handleRestore = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset input immediately so same file can be chosen again if needed
        const input = e.target;

        if (!confirm("⚠️ ¡ADVERTENCIA CRÍTICA!\n\nAl restaurar un respaldo, se BORRARÁN todos tus productos, ventas y gastos actuales para ser reemplazados por los del archivo.\n\n¿Estás seguro de que quieres continuar?")) {
            input.value = "";
            return;
        }

        if (!confirm("❗ ÚLTIMA CONFIRMACIÓN:\n\nEsta acción es irreversible si no tienes otro respaldo reciente.\n\n¿Proceder con la restauración?")) {
            input.value = "";
            return;
        }

        setIsRestoring(true);
        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const backupData = JSON.parse(event.target.result);
                    const res = await restoreBackupAction(backupData);

                    if (res.success) {
                        alert("✅ Datos restaurados con éxito. La página se recargará.");
                        window.location.reload();
                    } else {
                        alert("❌ Error: " + res.error);
                    }
                } catch (parseError) {
                    alert("❌ El archivo seleccionado no es un respaldo válido.");
                } finally {
                    setIsRestoring(false);
                    input.value = "";
                }
            };
            reader.readAsText(file);
        } catch (error) {
            console.error("Restore process failed:", error);
            alert("Error al procesar el archivo.");
            setIsRestoring(false);
            input.value = "";
        }
    };

    const handleReset = async () => {
        const firstConfirm = confirm("⚠️ ¿ESTÁS SEGURO?\n\nEsta acción borrará TODA la información: Ventas, Productos, Gastos e Historial.\n\nSe recomienda descargar un RESPALDO antes de continuar.");
        if (!firstConfirm) return;

        const secondConfirm = confirm("❗ ¿ÚLTIMA ADVERTENCIA?\n\nEsta acción es TOTALMENTE IRREVERSIBLE.\n\n¿Deseas dejar tu cuenta totalmente en blanco?");
        if (!secondConfirm) return;

        setLoading(true);
        const res = await resetDatabaseAction();
        if (res.success) {
            alert("Base de datos reiniciada con éxito.");
            window.location.reload();
        } else {
            alert("Error: " + res.error);
            setLoading(false);
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
                    <h1 className="text-3xl font-bold text-[var(--color-text-main)]">Reportes Financieros</h1>
                    <p className="text-[var(--color-text-muted)] text-sm mt-1">Análisis profundo del rendimiento de tu negocio</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] p-1 rounded-2xl flex shadow-sm">
                        <button
                            onClick={() => setTimeFrame('week')}
                            className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${timeFrame === 'week' ? 'bg-[var(--color-text-main)] text-[var(--color-surface)] shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                        >
                            Vista Semanal
                        </button>
                        <button
                            onClick={() => setTimeFrame('month')}
                            className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${timeFrame === 'month' ? 'bg-[var(--color-text-main)] text-[var(--color-surface)] shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                        >
                            Mensual
                        </button>
                        <button
                            onClick={() => setTimeFrame('year')}
                            className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${timeFrame === 'year' ? 'bg-[var(--color-text-main)] text-[var(--color-surface)] shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                        >
                            Anual
                        </button>
                    </div>

                    <button
                        onClick={handleDownloadBackup}
                        disabled={isBackingUp}
                        className={`btn h-12 rounded-2xl flex items-center gap-2 px-6 shadow-sm transition-all ${isBackingUp ? 'opacity-50 cursor-not-allowed bg-[var(--color-surface-highlight)] text-[var(--color-text-muted)]' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20'}`}
                    >
                        <ShieldCheck size={18} />
                        <span>{isBackingUp ? 'Procesando...' : 'Respaldo Nube'}</span>
                    </button>
                </div>
            </header>

            <section className="card p-6 bg-[var(--color-surface)] text-[var(--color-text-main)] border-[var(--color-glass-border)] shadow-xl rounded-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                        <Download size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-[var(--color-text-main)]">Exportación de Datos</h2>
                        <p className="text-sm text-[var(--color-text-muted)] font-medium">Descarga tus reportes detallados en formato Excel</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                    <button onClick={() => handleDownload('day')} className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] hover:bg-[var(--color-surface-hover)] transition-all group">
                        <Calendar size={24} className="text-[var(--color-text-muted)] group-hover:text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] group-hover:text-[var(--color-text-main)]">Ventas del Día</span>
                    </button>
                    <button onClick={() => handleDownload('week')} className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] hover:bg-[var(--color-surface-hover)] transition-all group">
                        <TrendingUp size={24} className="text-[var(--color-text-muted)] group-hover:text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] group-hover:text-[var(--color-text-main)]">Esta Semana</span>
                    </button>
                    <button onClick={() => handleDownload('month')} className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] hover:bg-[var(--color-surface-hover)] transition-all group">
                        <BarChart3 size={24} className="text-[var(--color-text-muted)] group-hover:text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] group-hover:text-[var(--color-text-main)]">Todo el Mes</span>
                    </button>
                    <button onClick={() => handleDownload('history')} className="flex flex-col items-center gap-3 p-4 rounded-xl bg-primary text-white border border-primary hover:scale-[1.02] active:scale-95 transition-all group shadow-lg shadow-primary/20">
                        <History size={24} className="text-white" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/90 group-hover:text-white">Exportación Total</span>
                    </button>
                </div>
            </section>

            {/* RESTORE SECTION */}
            <section className="card p-6 bg-[var(--color-surface)] border-2 border-dashed border-primary/20 shadow-xl rounded-2xl overflow-hidden relative">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                        <Upload size={32} />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-xl font-bold text-[var(--color-text-main)] flex items-center justify-center md:justify-start gap-2">
                            Importación y Restauración <AlertTriangle size={18} className="text-amber-500" />
                        </h2>
                        <p className="text-sm text-[var(--color-text-muted)] font-medium mt-1">
                            Recupera tu negocio desde un archivo de respaldo previo (.json).
                            <span className="text-primary font-bold"> Esta acción reemplazará todos tus datos actuales.</span>
                        </p>
                    </div>
                    <div>
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleRestore}
                            id="restore-upload"
                            className="hidden"
                            disabled={isRestoring}
                        />
                        <label
                            htmlFor="restore-upload"
                            className={`btn h-14 rounded-2xl flex items-center gap-3 px-8 shadow-lg cursor-pointer transition-all ${isRestoring ? 'bg-[var(--color-surface-highlight)] text-[var(--color-text-muted)]' : 'bg-[var(--color-surface-highlight)] text-[var(--color-text-main)] hover:bg-primary hover:text-white border-[var(--color-glass-border)] hover:scale-[1.05]'}`}
                        >
                            {isRestoring ? (
                                <RefreshCw className="animate-spin" size={20} />
                            ) : (
                                <History size={20} />
                            )}
                            <span className="font-black uppercase tracking-widest text-xs">Cargar Respaldo</span>
                        </label>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card stat-card bg-[var(--color-surface)] border-[var(--color-glass-border)] shadow-sm p-5 rounded-2xl border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start text-[var(--color-text-muted)] mb-3">
                        <span className="text-[10px] uppercase font-black tracking-widest">Ingresos Totales</span>
                        <div className="bg-blue-500/10 p-2 rounded-xl text-blue-500 border border-blue-500/20">
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="stat-value text-2xl font-black text-[var(--color-text-main)]">${kpis.totalRevenue.toLocaleString()}</div>
                        <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase mt-1">
                            {timeFrame === 'year' ? 'En el año actual' : `Últimos ${timeFrame === 'week' ? '7' : '30'} días`}
                        </p>
                    </div>
                </div>

                <div className="card stat-card bg-[var(--color-surface)] border-[var(--color-glass-border)] shadow-sm p-5 rounded-2xl border-l-4 border-l-emerald-500">
                    <div className="flex justify-between items-start text-emerald-500 mb-3">
                        <span className="text-[10px] uppercase font-black tracking-widest">Ganancia Neta</span>
                        <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="stat-value text-2xl font-black text-emerald-500">${kpis.totalProfit.toLocaleString()}</div>
                        <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase mt-1">
                            Bruta: ${kpis.grossProfit.toLocaleString()} | Gastos: -${kpis.totalExpenses.toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="card stat-card bg-[var(--color-surface)] border-[var(--color-glass-border)] shadow-sm p-5 rounded-2xl border-l-4 border-l-purple-500">
                    <div className="flex justify-between items-start text-[var(--color-text-muted)] mb-3">
                        <span className="text-[10px] uppercase font-black tracking-widest">Ticket Prom.</span>
                        <div className="bg-purple-500/10 p-2 rounded-xl text-purple-500 border border-purple-500/20">
                            <BarChart3 size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="stat-value text-2xl font-black text-[var(--color-text-main)]">${kpis.avgTicket.toFixed(0)}</div>
                        <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase mt-1">Promedio por Venta</p>
                    </div>
                </div>

                <div className="card stat-card bg-[var(--color-surface)] border-[var(--color-glass-border)] shadow-sm p-5 rounded-2xl border-l-4 border-l-primary">
                    <div className="flex justify-between items-start text-primary mb-3">
                        <span className="text-[10px] uppercase font-black tracking-widest">Margen Bruto</span>
                        <div className="bg-primary/10 p-2 rounded-xl border border-primary/20">
                            <Filter size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="stat-value text-2xl font-black text-primary">{kpis.margin.toFixed(1)}%</div>
                        <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase mt-1">Rentabilidad</p>
                    </div>
                </div>
            </div>

            <section className="card p-0 overflow-hidden bg-[var(--color-surface)] border border-[var(--color-glass-border)] shadow-xl rounded-2xl">
                <div className="p-6 border-b border-[var(--color-glass-border)] flex items-center justify-between bg-[var(--color-surface-highlight)]">
                    <div className="flex items-center gap-3">
                        <div className="bg-[var(--color-surface)] p-2 rounded-xl text-primary shadow-sm border border-[var(--color-glass-border)]">
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--color-text-main)]">Rendimiento Histórico</h2>
                            <p className="text-xs text-[var(--color-text-muted)]">Evolución de ventas y ganancias</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 h-[400px] w-full bg-[var(--color-surface)]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-glass-border)" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="var(--color-text-muted)"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                                fontWeight="bold"
                            />
                            <YAxis
                                stroke="var(--color-text-muted)"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `$${value}`}
                                fontWeight="bold"
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--color-surface)',
                                    borderColor: 'var(--color-glass-border)',
                                    borderRadius: '16px',
                                    boxShadow: 'var(--shadow-hover)',
                                    color: 'var(--color-text-main)',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    border: '1px solid var(--color-glass-border)'
                                }}
                                itemStyle={{ color: 'var(--color-text-main)' }}
                                cursor={{ fill: 'var(--color-surface-hover)', opacity: 0.4 }}
                            />
                            <Legend verticalAlign="top" height={40} iconType="circle" />
                            <Bar name="Ventas" dataKey="ventas" fill="var(--color-primary)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                            <Bar name="Ganancia" dataKey="ganancia" fill="var(--color-success)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="card p-0 flex flex-col h-[450px] bg-[var(--color-surface)] border border-[var(--color-glass-border)] shadow-xl rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-[var(--color-glass-border)] bg-[var(--color-surface-highlight)] flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-500/10 p-2 rounded-xl text-amber-500 border border-amber-500/20">
                                <Package size={20} />
                            </div>
                            <h2 className="font-bold text-[var(--color-text-main)]">Top Productos</h2>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto bg-[var(--color-surface)]">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--color-glass-border)] text-[10px] text-[var(--color-text-muted)] uppercase font-black tracking-widest">
                                    <th className="p-5 text-left">Producto</th>
                                    <th className="p-5 text-right">Ventas</th>
                                    <th className="p-5 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topProducts.map((prod, i) => (
                                    <tr key={i} className="hover:bg-[var(--color-surface-hover)] transition-all border-b border-[var(--color-glass-border)]/50 last:border-0 group">
                                        <td className="p-5">
                                            <div className="flex items-center gap-4">
                                                <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-[var(--color-surface-highlight)] text-xs font-black flex items-center justify-center text-[var(--color-text-muted)] group-hover:bg-primary group-hover:text-white transition-all">
                                                    {i + 1}
                                                </span>
                                                <span className="font-bold truncate max-w-[200px] text-[var(--color-text-main)]">{prod.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-5 text-right text-[var(--color-text-muted)] font-black">{prod.quantity}</td>
                                        <td className="p-5 text-right font-black text-emerald-500 text-lg">${prod.revenue.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {topProducts.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="text-center py-24 text-[var(--color-text-muted)] italic">No hay datos suficientes</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="card p-0 flex flex-col h-[450px] bg-[var(--color-surface)] border border-[var(--color-glass-border)] shadow-xl rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-[var(--color-glass-border)] bg-[var(--color-surface-highlight)] flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-500/10 p-2 rounded-xl text-blue-500 border border-blue-500/20">
                                <History size={20} />
                            </div>
                            <h2 className="font-bold text-[var(--color-text-main)]">Ventas Recientes</h2>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto p-5 flex flex-col gap-4 bg-[var(--color-surface)]">
                        {sales.slice(0, 10).map((sale) => (
                            <div key={sale.id} className="p-5 bg-[var(--color-surface-highlight)] rounded-2xl border border-[var(--color-glass-border)] flex justify-between items-center hover:bg-[var(--color-surface-hover)] hover:border-primary/40 hover:scale-[1.01] transition-all group shadow-sm">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-xl text-[var(--color-text-main)]">${sale.total.toLocaleString()}</span>
                                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${sale.paymentMethod === 'Tarjeta' ? 'bg-blue-500/20 text-blue-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                            {sale.paymentMethod || 'Efectivo'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-[var(--color-text-main)] opacity-80 truncate max-w-[150px]">
                                            {sale.customerName || "Venta Directa"}
                                        </span>
                                        <span className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-widest">
                                            {new Date(sale.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-5">
                                    <div className="text-right flex flex-col">
                                        <span className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-widest">Ganancia</span>
                                        <span className="font-black text-emerald-500 text-lg">+${sale.profit.toLocaleString()}</span>
                                    </div>
                                    <div className="h-10 w-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center text-xs font-black text-[var(--color-text-main)] border border-[var(--color-glass-border)] shadow-sm">
                                        {sale.items?.length || 0}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* SYSTEM MAINTENANCE SECTION */}
            <section className="mt-8 border-t border-[var(--color-glass-border)] pt-12">
                <div className="flex items-center gap-3 mb-6">
                    <Settings className="text-[var(--color-text-muted)]" size={20} />
                    <h2 className="text-xl font-bold text-[var(--color-text-main)]">Mantenimiento del Sistema</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* RESTORE BOX */}
                    <div className="card p-6 bg-[var(--color-surface)] border-2 border-dashed border-primary/20 rounded-2xl relative group hover:border-primary/40 transition-all">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                <Upload size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-[var(--color-text-main)]">Restaurar Copia</h3>
                                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Sobrescribe todo con un respaldo .json</p>
                            </div>
                        </div>
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleRestore}
                            id="restore-upload-final"
                            className="hidden"
                            disabled={isRestoring}
                        />
                        <label
                            htmlFor="restore-upload-final"
                            className={`btn h-12 w-full rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${isRestoring ? 'bg-[var(--color-surface-highlight)] text-[var(--color-text-muted)]' : 'bg-primary/5 text-primary border border-primary/20 hover:bg-primary hover:text-white shadow-sm'}`}
                        >
                            {isRestoring ? <RefreshCw className="animate-spin" size={18} /> : <History size={18} />}
                            <span className="font-black uppercase tracking-widest text-[10px]">{isRestoring ? 'Procesando...' : 'Cargar Respaldo'}</span>
                        </label>
                    </div>

                    {/* WIPE BOX */}
                    <div className="card p-6 bg-[var(--color-surface)] border border-red-500/10 rounded-2xl relative group hover:bg-red-500/[0.02] transition-all">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                                <Trash2 size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-red-500">¿Borrar Todo?</h3>
                                <p className="text-xs text-[var(--color-text-muted)] mt-0.5 text-balance">Limpia toda la información para empezar de cero.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleReset}
                            className="btn h-12 w-full rounded-xl flex items-center justify-center gap-2 bg-red-500/5 text-red-500 border border-red-500/10 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                        >
                            <AlertTriangle size={18} />
                            <span className="font-black uppercase tracking-widest text-[10px]">Reinicio Total de Cuenta</span>
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}

const Settings = ({ className, size }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);
