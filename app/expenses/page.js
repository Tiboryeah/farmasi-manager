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
                <h1 className="text-xl font-bold">Gastos</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn btn-primary p-2 rounded-full"
                >
                    <Plus size={24} />
                </button>
            </header>

            {showForm && (
                <form onSubmit={handleSubmit} className="card p-4 mb-4 animate-fade-in">
                    <h2 className="text-sm font-bold mb-3 text-secondary">Registrar Nuevo Gasto</h2>

                    <div className="flex flex-col gap-3">
                        <input
                            className="input"
                            placeholder="Categoría (Ej. Envíos)"
                            required
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                        />

                        <div className="relative">
                            <DollarSign size={16} className="absolute left-3 top-3 text-secondary" />
                            <input
                                className="input pl-8"
                                type="number"
                                placeholder="0.00"
                                required
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>

                        <textarea
                            className="input min-h-[60px]"
                            placeholder="Nota opcional..."
                            value={formData.note}
                            onChange={e => setFormData({ ...formData, note: e.target.value })}
                        />

                        <button className="btn btn-primary w-full">Guardar Gasto</button>
                    </div>
                </form>
            )}

            {/* List */}
            <div className="flex flex-col gap-3 overflow-y-auto">
                {expenses.length === 0 && !showForm && (
                    <div className="text-center text-secondary py-10">No hay gastos registrados</div>
                )}

                {expenses.map(expense => (
                    <div key={expense.id} className="card flex justify-between items-center p-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-surface-hover flex items-center justify-center text-danger">
                                <DollarSign size={20} />
                            </div>
                            <div>
                                <div className="font-bold text-sm">{expense.category}</div>
                                <div className="text-xs text-secondary">{new Date(expense.date).toLocaleDateString()}</div>
                            </div>
                        </div>
                        <div className="font-bold text-white">
                            -${expense.amount.toFixed(2)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
