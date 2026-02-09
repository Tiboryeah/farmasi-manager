"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Correct import for App Router
import { getProduct, updateProductStock, updateProduct } from "@/app/actions"; // verify path
import { ChevronLeft, Save, History, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { use } from "react"; // For params

export default function ProductDetailPage({ params }) {
    const router = useRouter();
    // Unwrap params using React.use() in Next 15 or just access if it's sync (Next 14 it's async, sticking to safe pattern)
    // Actually in standard Next 14 app dir, p is a promise or object. 
    // Let's assume standard behavior: params is a promise in latest next, but object in 14. 
    // We'll treat it as object for now, if error we fix.
    // Wait, Next 15 `params` is async. I'll use `use(params)` logic if I can, or just async component.
    // But this is "use client", so params is prob passed as prop.
    // Let's keep it simple: `params.id`
    const { id } = use(params);

    const [currentProduct, setCurrentProduct] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [preview, setPreview] = useState(null);
    const [adjustment, setAdjustment] = useState(0);
    const [reason, setReason] = useState("Ajuste Manual");

    useEffect(() => {
        if (id) getProduct(id).then(p => {
            setCurrentProduct(p);
            setFormData(p);
            setPreview(p.image && p.image.startsWith('data:image') ? p.image : null);
        });
    }, [id]);

    const handleAdjust = async (e) => {
        e.preventDefault();
        if (!adjustment) return;
        const newStock = currentProduct.stock + parseInt(adjustment);
        await updateProductStock(currentProduct.id, newStock, reason);
        setCurrentProduct({ ...currentProduct, stock: newStock });
        setAdjustment(0);
        setReason("Ajuste Manual");
        alert("Stock actualizado");
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        await updateProduct(currentProduct.id, formData);
        setCurrentProduct(formData);
        setIsEditing(false);
        alert("Producto actualizado");
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
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
                setFormData(prev => ({ ...prev, image: compressedBase64 }));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    };

    if (!currentProduct) return <div className="p-4">Cargando...</div>;

    if (isEditing) {
        return (
            <div className="flex flex-col h-full pb-20">
                <header className="flex items-center justify-between py-4 mb-2">
                    <button onClick={() => setIsEditing(false)} className="btn btn-ghost p-1 text-danger"><ChevronLeft /> Cancelar</button>
                    <h1 className="text-xl font-bold">Editar Producto</h1>
                    <div className="w-8"></div>
                </header>

                <form onSubmit={handleUpdate} className="flex flex-col gap-4 p-4">
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-secondary mb-1 block">Nombre</label>
                            <input name="name" value={formData.name || ''} required className="input" onChange={handleChange} />
                        </div>
                        <div>
                            <label className="text-sm text-secondary mb-1 block">Código</label>
                            <input name="code" value={formData.code || ''} className="input" onChange={handleChange} />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-secondary mb-1 block">Categoría</label>
                        <input name="category" value={formData.category || ''} className="input" onChange={handleChange} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-secondary mb-1 block">Costo ($)</label>
                            <input name="cost" type="number" step="0.5" value={formData.cost || ''} required className="input" onChange={handleChange} />
                        </div>
                        <div>
                            <label className="text-sm text-secondary mb-1 block">Precio ($)</label>
                            <input name="price" type="number" step="0.5" value={formData.price || ''} required className="input" onChange={handleChange} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-secondary mb-1 block">Stock Actual</label>
                            <input name="stock" type="number" value={formData.stock || 0} required className="input" onChange={handleChange} />
                        </div>
                        <div>
                            <label className="text-sm text-secondary mb-1 block">Mínimo</label>
                            <input name="minStock" type="number" value={formData.minStock || 5} className="input" onChange={handleChange} />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary w-full py-3 mt-4 flex items-center justify-center gap-2">
                        <Save size={20} /> Guardar Cambios
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full pb-20">
            <header className="flex items-center justify-between py-4 mb-2">
                <div className="flex items-center gap-3">
                    <Link href="/inventory" className="btn btn-ghost p-1"><ChevronLeft /></Link>
                    <h1 className="text-xl font-bold truncate max-w-[200px]">{currentProduct.name}</h1>
                </div>
                <button onClick={() => setIsEditing(true)} className="btn btn-ghost p-2 text-primary">
                    <History size={20} className="hidden" /> {/* Placeholder repurpose or remove */}
                    Editar
                </button>
            </header>

            <div className="card p-4 mb-4 flex gap-4 items-center">
                <div className="h-20 w-20 bg-surface-hover rounded-xl overflow-hidden flex items-center justify-center">
                    {currentProduct.image && currentProduct.image.startsWith('data:image') ? (
                        <img src={currentProduct.image} alt={currentProduct.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-4xl">{currentProduct.image || "📦"}</span>
                    )}
                </div>
                <div>
                    <div className="text-sm text-secondary uppercase font-bold">{currentProduct.category} {currentProduct.code && `• ${currentProduct.code}`}</div>
                    <div className="text-2xl font-bold text-white">{currentProduct.stock} un.</div>
                    <div className="text-xs text-secondary">Stock Mínimo: {currentProduct.min_stock}</div>
                </div>
            </div>

            <div className="card p-4 mb-6">
                <h2 className="text-sm font-bold mb-3 text-secondary border-b border-border pb-2">Ajuste de Inventario</h2>
                <form onSubmit={handleAdjust} className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            className={`btn ${adjustment > 0 ? 'btn-primary' : 'btn-outline'} flex gap-2`}
                            onClick={() => setAdjustment(1)}
                        >
                            <TrendingUp size={16} /> Entrada
                        </button>
                        <button
                            type="button"
                            className={`btn ${adjustment < 0 ? 'bg-danger text-white' : 'btn-outline'} flex gap-2`}
                            onClick={() => setAdjustment(-1)}
                        >
                            <TrendingDown size={16} /> Salida
                        </button>
                    </div>

                    <div className="flex gap-2 items-center">
                        <input
                            type="number"
                            className="input text-center font-bold text-lg"
                            value={adjustment}
                            onChange={(e) => setAdjustment(parseInt(e.target.value) || 0)}
                        />
                        <span className="text-sm text-secondary">Ajuste (+/-)</span>
                    </div>

                    <input
                        className="input"
                        placeholder="Motivo (Ej. Regalo, Error, Compra)"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />

                    <button className="btn btn-primary w-full">Aplicar Ajuste</button>
                </form>
            </div>

            <div className="card p-4">
                <h2 className="text-sm font-bold mb-2 text-secondary">Detalles Financieros</h2>
                <div className="flex justify-between py-2 border-b border-border">
                    <span>Costo Unitario</span>
                    <span className="font-bold">${currentProduct.cost}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                    <span>Precio Sugerido</span>
                    <span className="font-bold text-success">${currentProduct.price}</span>
                </div>
                <div className="flex justify-between py-2">
                    <span>Margen Sugerido</span>
                    <span className="text-success">+${(currentProduct.price - currentProduct.cost).toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
}
