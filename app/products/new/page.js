"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { createProduct, getProduct } from "@/app/actions";
import { ChevronLeft, Save, Copy } from "lucide-react";
import Link from "next/link";

function NewProductForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultType = searchParams.get('type') || 'product';
    const cloneId = searchParams.get('cloneId');

    const [formData, setFormData] = useState({
        name: "",
        category: "",
        cost: "",
        price: "",
        stock: "",
        minStock: "5",
        image: null,
        type: defaultType
    });

    const [createTestCopy, setCreateTestCopy] = useState(false);
    const [attributes, setAttributes] = useState([]);

    const [preview, setPreview] = useState(null);

    const handleAddAttribute = () => {
        setAttributes([...attributes, { name: '', value: '' }]);
    };

    // Load data if cloning
    useEffect(() => {
        if (cloneId) {
            getProduct(cloneId).then(data => {
                if (data) {
                    setFormData(prev => ({
                        ...prev,
                        name: `${data.name} (Variante)`,
                        category: data.category,
                        cost: data.cost,
                        price: data.price,
                        stock: '', // Reset stock for new variant
                        minStock: data.minStock,
                        image: data.image,
                        type: data.type
                    }));
                    setAttributes(data.attributes || []);
                    if (data.image) setPreview(data.image);
                }
            });
        }
    }, [cloneId]);

    const handleAttributeChange = (index, field, value) => {
        const newAttributes = [...attributes];
        newAttributes[index][field] = value;
        setAttributes(newAttributes);
    };

    const handleRemoveAttribute = (index) => {
        setAttributes(attributes.filter((_, i) => i !== index));
    };

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
        await createProduct({ ...formData, attributes, createTestCopy });
        router.push("/inventory");
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="flex flex-col h-full pb-20">
            <header className="flex items-center gap-3 py-4 mb-2">
                <Link href="/inventory" className="btn btn-ghost p-1 hover:bg-[var(--color-surface-hover)] rounded-full text-[var(--color-text-muted)]"><ChevronLeft /></Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-[var(--color-text-main)]">{cloneId ? 'Nueva Variante' : 'Nuevo Producto'}</h1>
                    {cloneId && <p className="text-xs text-[var(--color-text-muted)]">Copiando datos de producto existente</p>}
                </div>
            </header>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex gap-2 p-1 bg-[var(--color-surface-highlight)] rounded-xl mb-4 border border-[var(--color-glass-border)]">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'product' })}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.type === 'product' ? 'bg-[var(--color-surface)] text-[var(--color-text-main)] shadow-sm border border-[var(--color-glass-border)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                    >
                        Producto para Venta
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'sample' })}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.type === 'sample' ? 'bg-primary text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                    >
                        Muestra (Gasto)
                    </button>
                </div>

                <div className="flex flex-col items-center gap-4 mb-4">
                    <div className="h-40 w-40 rounded-3xl bg-[var(--color-surface-highlight)] border-2 border-dashed border-[var(--color-glass-border)] flex items-center justify-center overflow-hidden relative group transition-all hover:border-primary/50">
                        {preview ? (
                            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center text-[var(--color-text-muted)]">
                                <Save size={32} className="mb-2 opacity-30" />
                                <span className="text-xs font-bold uppercase tracking-widest text-center">Añadir Foto</span>
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
                    <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest text-center">
                        Haz clic en el recuadro para subir una foto real del producto
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-bold text-[var(--color-text-muted)] mb-1.5 block">Nombre</label>
                        <input name="name" value={formData.name} required className="input h-11 bg-[var(--color-surface)] border-[var(--color-glass-border)] text-[var(--color-text-main)] shadow-sm focus:border-primary focus:ring-primary/20 placeholder:text-[var(--color-text-muted)]/50" placeholder="Ej. Rimel Zen..." onChange={handleChange} />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-[var(--color-text-muted)] mb-1.5 block">Código (Opcional)</label>
                        <input name="code" value={formData.code} className="input h-11 bg-[var(--color-surface)] border-[var(--color-glass-border)] text-[var(--color-text-main)] shadow-sm focus:border-primary focus:ring-primary/20 placeholder:text-[var(--color-text-muted)]/50" placeholder="Ej. RZ-01" onChange={handleChange} />
                    </div>
                </div>

                <div>
                    <label className="text-sm font-bold text-[var(--color-text-muted)] mb-1.5 block">Categoría</label>
                    <input name="category" value={formData.category} className="input h-11 bg-[var(--color-surface)] border-[var(--color-glass-border)] text-[var(--color-text-main)] shadow-sm focus:border-primary focus:ring-primary/20 placeholder:text-[var(--color-text-muted)]/50" placeholder="Ej. Ojos, Rostro, Labios..." onChange={handleChange} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-bold text-[var(--color-text-muted)] mb-1.5 block">Costo ($)</label>
                        <input name="cost" value={formData.cost} type="number" step="0.5" required className="input h-11 bg-[var(--color-surface)] border-[var(--color-glass-border)] text-[var(--color-text-main)] shadow-sm focus:border-primary focus:ring-primary/20 placeholder:text-[var(--color-text-muted)]/50" placeholder="0.00" onChange={handleChange} />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-[var(--color-text-muted)] mb-1.5 block">Precio Sugerido ($)</label>
                        <input name="price" value={formData.price} type="number" step="0.5" required className="input h-11 bg-[var(--color-surface)] border-[var(--color-glass-border)] text-[var(--color-text-main)] shadow-sm focus:border-primary focus:ring-primary/20 placeholder:text-[var(--color-text-muted)]/50" placeholder="0.00" onChange={handleChange} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-bold text-[var(--color-text-muted)] mb-1.5 block">Stock Inicial</label>
                        <input name="stock" value={formData.stock} type="number" required className="input h-11 bg-[var(--color-surface)] border-[var(--color-glass-border)] text-[var(--color-text-main)] shadow-sm focus:border-primary focus:ring-primary/20 placeholder:text-[var(--color-text-muted)]/50" placeholder="0" onChange={handleChange} />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-[var(--color-text-muted)] mb-1.5 block">Stock Mínimo</label>
                        <input name="minStock" value={formData.minStock} type="number" className="input h-11 bg-[var(--color-surface)] border-[var(--color-glass-border)] text-[var(--color-text-main)] shadow-sm focus:border-primary focus:ring-primary/20 placeholder:text-[var(--color-text-muted)]/50" defaultValue="5" onChange={handleChange} />
                    </div>
                </div>

                {/* Attributes Section */}
                <div className="bg-[var(--color-surface-highlight)] p-4 rounded-xl border border-[var(--color-glass-border)]">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-bold text-[var(--color-text-main)]">Atributos Adicionales</label>
                        <button type="button" onClick={handleAddAttribute} className="text-xs btn btn-sm btn-ghost text-primary hover:bg-primary/10 transition-colors">+ Añadir</button>
                    </div>
                    {attributes.length === 0 && <p className="text-xs text-[var(--color-text-muted)] italic">Sin atributos (ej. Color, Sabor)</p>}
                    <div className="flex flex-col gap-2">
                        {attributes.map((attr, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    placeholder="Nombre (ej. Color)"
                                    value={attr.name}
                                    onChange={(e) => handleAttributeChange(index, 'name', e.target.value)}
                                    className="input h-10 text-xs flex-1 bg-[var(--color-surface)] border-[var(--color-glass-border)] text-[var(--color-text-main)] shadow-sm"
                                />
                                <input
                                    placeholder="Valor (ej. Rojo)"
                                    value={attr.value}
                                    onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                                    className="input h-10 text-xs flex-1 bg-[var(--color-surface)] border-[var(--color-glass-border)] text-[var(--color-text-main)] shadow-sm"
                                />
                                <button type="button" onClick={() => handleRemoveAttribute(index)} className="btn btn-square btn-xs btn-ghost text-red-500 hover:bg-red-500/10">✕</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Test Copy Checkbox */}
                <div className="flex items-center gap-3 p-4 bg-[var(--color-surface-highlight)] rounded-xl border border-[var(--color-glass-border)] transition-all hover:bg-[var(--color-surface-hover)]">
                    <input
                        type="checkbox"
                        id="testCopy"
                        checked={createTestCopy}
                        onChange={(e) => setCreateTestCopy(e.target.checked)}
                        className="checkbox checkbox-primary border-[var(--color-glass-border)] h-5 w-5"
                    />
                    <label htmlFor="testCopy" className="text-sm cursor-pointer select-none text-[var(--color-text-main)]">
                        Crear copia para <b className="text-primary">Inventario de Pruebas</b>
                        <span className="block text-xs text-[var(--color-text-muted)] mt-0.5">Se creará un producto adicional marcado como "Muestra" con stock 0.</span>
                    </label>
                </div>

                <button type="submit" className="btn btn-primary w-full py-4 mt-4 flex items-center justify-center gap-2 text-base shadow-xl">
                    <Save size={20} /> Guardar Producto
                </button>
            </form>
        </div>
    );
}

export default function NewProductPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <NewProductForm />
        </Suspense>
    );
}
