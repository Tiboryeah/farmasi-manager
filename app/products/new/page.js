"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/app/actions";
import { ChevronLeft, Save } from "lucide-react";
import Link from "next/link";

export default function NewProductPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        cost: "",
        price: "",
        stock: "",
        minStock: "5",
        image: "💄"
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        await createProduct(formData);
        router.push("/inventory");
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="flex flex-col h-full pb-20">
            <header className="flex items-center gap-3 py-4 mb-2">
                <Link href="/inventory" className="btn btn-ghost p-1"><ChevronLeft /></Link>
                <h1 className="text-xl font-bold">Nuevo Producto</h1>
            </header>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label className="text-sm text-secondary mb-1 block">Nombre</label>
                    <input name="name" required className="input" placeholder="Ej. Rimel Zen..." onChange={handleChange} />
                </div>

                <div>
                    <label className="text-sm text-secondary mb-1 block">Categoría</label>
                    <input name="category" className="input" placeholder="Ej. Ojos" onChange={handleChange} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-secondary mb-1 block">Costo ($)</label>
                        <input name="cost" type="number" step="0.5" required className="input" placeholder="0.00" onChange={handleChange} />
                    </div>
                    <div>
                        <label className="text-sm text-secondary mb-1 block">Precio Sugerido ($)</label>
                        <input name="price" type="number" step="0.5" required className="input" placeholder="0.00" onChange={handleChange} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-secondary mb-1 block">Stock Inicial</label>
                        <input name="stock" type="number" required className="input" placeholder="0" onChange={handleChange} />
                    </div>
                    <div>
                        <label className="text-sm text-secondary mb-1 block">Stock Mínimo</label>
                        <input name="minStock" type="number" className="input" defaultValue="5" onChange={handleChange} />
                    </div>
                </div>

                <div>
                    <label className="text-sm text-secondary mb-1 block">Emoji/Icono</label>
                    <div className="flex gap-2">
                        {['💄', '🧴', '👁️', '💅', '🧼'].map(emoji => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => setFormData({ ...formData, image: emoji })}
                                className={`btn ${formData.image === emoji ? 'btn-primary' : 'btn-outline'} p-2 text-2xl`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>

                <button type="submit" className="btn btn-primary w-full py-3 mt-4 flex items-center justify-center gap-2">
                    <Save size={20} /> Guardar Producto
                </button>
            </form>
        </div>
    );
}
