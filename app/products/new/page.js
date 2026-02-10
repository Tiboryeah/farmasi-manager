"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { createProduct, getProduct } from "@/app/actions";
import { ChevronLeft, Save, Copy, Crop, Check, X } from "lucide-react";
import Link from "next/link";
import Cropper from 'react-easy-crop';

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
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isCropping, setIsCropping] = useState(false);

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

        const reader = new FileReader();
        reader.onload = () => {
            setImageToCrop(reader.result);
            setIsCropping(true);
        };
        reader.readAsDataURL(file);
        e.target.value = null; // Reset to allow same file re-selection
    };

    const onCropComplete = (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const getCroppedImg = async () => {
        try {
            const image = new Image();
            image.src = imageToCrop;
            await new Promise((resolve) => { image.onload = resolve; });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const maxSize = 600;
            let targetWidth = croppedAreaPixels.width;
            let targetHeight = croppedAreaPixels.height;

            if (targetWidth > maxSize || targetHeight > maxSize) {
                const ratio = Math.min(maxSize / targetWidth, maxSize / targetHeight);
                targetWidth *= ratio;
                targetHeight *= ratio;
            }

            canvas.width = targetWidth;
            canvas.height = targetHeight;

            ctx.drawImage(
                image,
                croppedAreaPixels.x,
                croppedAreaPixels.y,
                croppedAreaPixels.width,
                croppedAreaPixels.height,
                0,
                0,
                targetWidth,
                targetHeight
            );

            const base64Image = canvas.toDataURL('image/jpeg', 0.8);
            setPreview(base64Image);
            setFormData({ ...formData, image: base64Image });
            setIsCropping(false);
            setImageToCrop(null);
        } catch (e) {
            console.error(e);
        }
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

            {/* Cropping Modal */}
            {isCropping && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[var(--color-surface)] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-[var(--color-glass-border)] flex flex-col h-[80vh] md:h-[600px]">
                        <div className="p-4 border-b border-[var(--color-glass-border)] flex items-center justify-between shrink-0">
                            <h3 className="font-black uppercase tracking-widest text-[var(--color-text-main)] text-sm flex items-center gap-2">
                                <Crop size={18} className="text-primary" /> Recortar Imagen
                            </h3>
                            <button onClick={() => setIsCropping(false)} className="h-8 w-8 rounded-full bg-[var(--color-surface-highlight)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-white transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="relative flex-1 bg-black">
                            <Cropper
                                image={imageToCrop}
                                crop={crop}
                                zoom={zoom}
                                aspect={1 / 1}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                            />
                        </div>

                        <div className="p-6 bg-[var(--color-surface-highlight)] shrink-0">
                            <div className="mb-6">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3 block">Zoom</label>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(e.target.value)}
                                    className="w-full accent-primary h-1.5 bg-[var(--color-glass-border)] rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsCropping(false)}
                                    className="flex-1 py-3 rounded-2xl bg-[var(--color-surface)] text-[var(--color-text-muted)] font-bold text-sm border border-[var(--color-glass-border)] hover:bg-[var(--color-surface-hover)] transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={getCroppedImg}
                                    className="flex-1 py-3 rounded-2xl bg-primary text-white font-black text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Check size={18} /> Aplicar Recorte
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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
