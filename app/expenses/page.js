"use client";

import { useState, useEffect } from "react";
import { Plus, DollarSign, Calendar } from "lucide-react";
import { getExpenses, createExpense } from "@/app/actions";

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        category: "",
        amount: "",
        note: ""
    });

    useEffect(() => {
        getExpenses().then(setExpenses);
    }, [showForm]); // Refresh when form toggle changes (after submit)

    const handleSubmit = async (e) => {
        e.preventDefault();
        await createExpense(formData);
        setShowForm(false);
        setFormData({ category: "", amount: "", note: "" });
    };

    return (
        <div className="flex flex-col h-full pb-20">
            <header className="flex items-center justify-between py-4 mb-2">
                <h1 className="text-xl font-bold text-[var(--color-text-main)]">Gastos</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn btn-primary p-2 rounded-full shadow-lg shadow-primary/30 text-white"
                >
                    <Plus size={24} />
                </button>
            </header>

            {showForm && (
                <div className="card p-4 mb-4 animate-fade-in bg-[var(--color-surface)] border border-[var(--color-glass-border)] shadow-sm rounded-xl">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                        <h2 className="text-sm font-black mb-3 text-[var(--color-text-muted)] uppercase tracking-widest">Registrar Nuevo Gasto</h2>

                        <input
                            className="w-full bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] rounded-xl px-4 h-12 text-[var(--color-text-main)] outline-none focus:border-primary transition-all shadow-sm"
                            placeholder="Categoría (Ej. Envíos)"
                            required
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                        />

                        <div className="relative">
                            <DollarSign size={16} className="absolute left-4 top-4 text-[var(--color-text-muted)]" />
                            <input
                                className="w-full bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] rounded-xl pl-10 pr-4 h-12 text-[var(--color-text-main)] outline-none focus:border-primary transition-all shadow-sm"
                                type="number"
                                placeholder="0.00"
                                required
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>

                        <textarea
                            className="w-full bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] rounded-xl p-4 min-h-[80px] text-[var(--color-text-main)] outline-none focus:border-primary transition-all shadow-sm resize-none"
                            placeholder="Nota opcional..."
                            value={formData.note}
                            onChange={e => setFormData({ ...formData, note: e.target.value })}
                        />

                        <button className="btn btn-primary w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20">Guardar Gasto</button>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="flex flex-col gap-3 overflow-y-auto">
                {expenses.length === 0 && !showForm && (
                    <div className="text-center text-secondary py-10">No hay gastos registrados</div>
                )}

                {expenses.map(expense => (
                    <div key={expense.id} className="card flex justify-between items-center p-3 bg-[var(--color-surface)] border border-[var(--color-glass-border)] shadow-sm rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500 border border-red-100">
                                <DollarSign size={20} />
                            </div>
                            <div>
                                <div className="font-bold text-sm text-[var(--color-text-main)]">{expense.category}</div>
                                <div className="text-xs text-[var(--color-text-muted)]">{new Date(expense.date).toLocaleDateString()}</div>
                            </div>
                        </div>
                        <div className="font-bold text-red-600">
                            -${expense.amount.toFixed(2)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
