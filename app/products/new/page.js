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

    const [preview, setPreview] = useState(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
                // Compress image using canvas
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400;
                const MAX_HEIGHT = 400;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                setPreview(compressedBase64);
                setFormData({ ...formData, image: compressedBase64 });
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    };

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
                <div className="flex flex-col items-center gap-4 mb-4">
                    <div className="h-40 w-40 rounded-3xl bg-zinc-900 border-2 border-dashed border-zinc-700 flex items-center justify-center overflow-hidden relative group">
                        {preview ? (
                            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center text-zinc-500">
                                <Save size={32} className="mb-2 opacity-20" />
                                <span className="text-xs font-bold uppercase tracking-widest">Sin Foto</span>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="absolute inset-0 opacity-0 cursor-pointer z-20"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10 pointer-events-none">
                            <span className="text-white text-xs font-bold uppercase">Cambiar Foto</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center">
                        Haz clic en el recuadro para subir una foto real del producto
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-secondary mb-1 block">Nombre</label>
                        <input name="name" required className="input" placeholder="Ej. Rimel Zen..." onChange={handleChange} />
                    </div>
                    <div>
                        <label className="text-sm text-secondary mb-1 block">Código (Opcional)</label>
                        <input name="code" className="input" placeholder="Ej. RZ-01" onChange={handleChange} />
                    </div>
                </div>

                <div>
                    <label className="text-sm text-secondary mb-1 block">Categoría</label>
                    <input name="category" className="input" placeholder="Ej. Ojos, Rostro, Labios..." onChange={handleChange} />
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


                <button type="submit" className="btn btn-primary w-full py-3 mt-4 flex items-center justify-center gap-2">
                    <Save size={20} /> Guardar Producto
                </button>
            </form>
        </div>
    );
}
