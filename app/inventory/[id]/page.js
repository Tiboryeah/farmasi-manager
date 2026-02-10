"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Correct import for App Router
import { getProduct, updateProductStock, updateProduct } from "@/app/actions";
import { ChevronLeft, Save, History, TrendingUp, TrendingDown, Crop, Check, X } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import Cropper from 'react-easy-crop';

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

    // Cropping states
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isCropping, setIsCropping] = useState(false);

    useEffect(() => {
        if (id) getProduct(id).then(p => {
            setCurrentProduct(p);
            setCurrentProduct(p);
            setFormData({ ...p, attributes: p.attributes || [] });
            setPreview(p.image && p.image.startsWith('data:image') ? p.image : null);
        });
    }, [id]);

    const handleAddAttribute = () => {
        setFormData(prev => ({
            ...prev,
            attributes: [...(prev.attributes || []), { name: '', value: '' }]
        }));
    };

    const handleAttributeChange = (index, field, value) => {
        const newAttributes = [...(formData.attributes || [])];
        newAttributes[index][field] = value;
        setFormData({ ...formData, attributes: newAttributes });
    };

    const handleRemoveAttribute = (index) => {
        const newAttributes = (formData.attributes || []).filter((_, i) => i !== index);
        setFormData({ ...formData, attributes: newAttributes });
    };

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
        reader.onload = () => {
            setImageToCrop(reader.result);
            setIsCropping(true);
        };
        reader.readAsDataURL(file);
        e.target.value = null;
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
            setFormData(prev => ({ ...prev, image: base64Image }));
            setIsCropping(false);
            setImageToCrop(null);
        } catch (e) {
            console.error(e);
        }
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
                    <div className="flex gap-2 p-1 bg-zinc-100 rounded-xl mb-4 border border-zinc-200">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, type: 'product' })}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.type === 'product' || !formData.type ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            Producto
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, type: 'sample' })}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.type === 'sample' ? 'bg-primary text-white shadow-md' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            Muestra
                        </button>
                    </div>

                    <div className="flex flex-col items-center gap-4 mb-4">
                        <div className="h-40 w-40 rounded-3xl bg-zinc-50 border-2 border-dashed border-zinc-300 flex items-center justify-center overflow-hidden relative group">
                            {preview ? (
                                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center text-zinc-400">
                                    <Save size={32} className="mb-2 opacity-30" />
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
                            <label className="text-sm font-bold text-zinc-600 mb-1 block">Nombre</label>
                            <input name="name" value={formData.name || ''} required className="input bg-white border-zinc-200 text-zinc-900 shadow-sm focus:border-primary focus:ring-primary/20" onChange={handleChange} />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-zinc-600 mb-1 block">Código</label>
                            <input name="code" value={formData.code || ''} className="input bg-white border-zinc-200 text-zinc-900 shadow-sm focus:border-primary focus:ring-primary/20" onChange={handleChange} />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-zinc-600 mb-1 block">Categoría</label>
                        <input name="category" value={formData.category || ''} className="input bg-white border-zinc-200 text-zinc-900 shadow-sm focus:border-primary focus:ring-primary/20" onChange={handleChange} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-zinc-600 mb-1 block">Costo ($)</label>
                            <input name="cost" type="number" step="0.5" value={formData.cost || ''} required className="input bg-white border-zinc-200 text-zinc-900 shadow-sm focus:border-primary focus:ring-primary/20" onChange={handleChange} />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-zinc-600 mb-1 block">Precio ($)</label>
                            <input name="price" type="number" step="0.5" value={formData.price || ''} required className="input bg-white border-zinc-200 text-zinc-900 shadow-sm focus:border-primary focus:ring-primary/20" onChange={handleChange} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-zinc-600 mb-1 block">Stock Actual</label>
                            <input name="stock" type="number" value={formData.stock || 0} required className="input bg-white border-zinc-200 text-zinc-900 shadow-sm focus:border-primary focus:ring-primary/20" onChange={handleChange} />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-zinc-600 mb-1 block">Mínimo</label>
                            <input name="minStock" type="number" value={formData.minStock || 5} className="input bg-white border-zinc-200 text-zinc-900 shadow-sm focus:border-primary focus:ring-primary/20" onChange={handleChange} />
                        </div>
                    </div>

                    {/* Attributes Section */}
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-bold text-zinc-700">Atributos Adicionales</label>
                            <button type="button" onClick={handleAddAttribute} className="text-xs btn btn-sm btn-ghost text-primary hover:bg-primary/10">+ Añadir</button>
                        </div>
                        {(!formData.attributes || formData.attributes.length === 0) && <p className="text-xs text-zinc-400 italic">Sin atributos</p>}
                        <div className="flex flex-col gap-2">
                            {(formData.attributes || []).map((attr, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        placeholder="Color"
                                        value={attr.name}
                                        onChange={(e) => handleAttributeChange(index, 'name', e.target.value)}
                                        className="input text-xs flex-1 bg-white border-zinc-200 text-zinc-900 shadow-sm"
                                    />
                                    <input
                                        placeholder="Rojo"
                                        value={attr.value}
                                        onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                                        className="input text-xs flex-1 bg-white border-zinc-200 text-zinc-900 shadow-sm"
                                    />
                                    <button type="button" onClick={() => handleRemoveAttribute(index)} className="btn btn-square btn-xs btn-ghost text-red-500 hover:bg-red-50">✕</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary w-full py-3 mt-4 flex items-center justify-center gap-2">
                        <Save size={20} /> Guardar Cambios
                    </button>
                </form>

                {/* Cropping Modal */}
                {isCropping && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                        <div className="bg-[var(--color-surface)] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-[var(--color-glass-border)] flex flex-col h-[80vh] md:h-[600px]">
                            <div className="p-4 border-b border-[var(--color-glass-border)] flex items-center justify-between shrink-0">
                                <h3 className="font-black uppercase tracking-widest text-[var(--color-text-main)] text-sm flex items-center gap-2">
                                    <Crop size={18} className="text-primary" /> Recortar Foto
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
                                        <Check size={18} /> Aplicar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full pb-20">
            <header className="flex items-center justify-between py-4 mb-2">
                <div className="flex items-center gap-3">
                    <Link href="/inventory" className="btn btn-ghost p-1 hover:bg-zinc-100 rounded-full text-zinc-500"><ChevronLeft /></Link>
                    <h1 className="text-xl font-bold truncate max-w-[200px] text-zinc-900">{currentProduct.name}</h1>
                </div>
                <button onClick={() => setIsEditing(true)} className="btn btn-ghost p-2 text-primary hover:bg-primary/5 rounded-lg">
                    <History size={20} className="hidden" /> {/* Placeholder repurpose or remove */}
                    Editar
                </button>
            </header>

            <div className="card p-4 mb-4 flex gap-4 items-center bg-white border border-zinc-100 shadow-sm rounded-xl">
                <div className="h-24 w-24 bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden flex items-center justify-center">
                    {currentProduct.image && currentProduct.image.startsWith('data:image') ? (
                        <img src={currentProduct.image} alt={currentProduct.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-4xl text-zinc-300">{currentProduct.image || "📦"}</span>
                    )}
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        {currentProduct.type === 'sample' && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                                Muestra
                            </span>
                        )}
                        <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-zinc-200">{currentProduct.category} {currentProduct.code && `• ${currentProduct.code}`}</span>
                    </div>
                    <div className="text-3xl font-black text-zinc-900 mb-1">{currentProduct.stock} un.</div>
                    <div className="text-xs font-bold text-zinc-400">Stock Mínimo: {currentProduct.min_stock}</div>
                </div>
            </div>

            <div className="card p-4 mb-6 bg-white border border-zinc-100 shadow-sm rounded-xl">
                <h2 className="text-sm font-black mb-3 text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-2">Ajuste de Inventario</h2>
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

                    <div className="flex gap-2 items-center bg-zinc-50 p-2 rounded-lg border border-zinc-200">
                        <input
                            type="number"
                            className="input text-center font-bold text-lg bg-transparent border-none shadow-none focus:ring-0 p-0 w-16 text-zinc-900"
                            value={adjustment}
                            onChange={(e) => setAdjustment(parseInt(e.target.value) || 0)}
                        />
                        <span className="text-sm font-bold text-zinc-400">Ajuste (+/-)</span>
                    </div>

                    <input
                        className="input bg-white border-zinc-200 text-zinc-900 shadow-sm focus:border-primary focus:ring-primary/20"
                        placeholder="Motivo (Ej. Regalo, Error, Compra)"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />

                    <button className="btn btn-primary w-full">Aplicar Ajuste</button>
                </form>
            </div>

            <div className="card p-4 bg-white border border-zinc-100 shadow-sm rounded-xl">
                <h2 className="text-sm font-black mb-2 text-zinc-400 uppercase tracking-widest">Detalles Financieros</h2>
                <div className="flex justify-between py-2 border-b border-zinc-50">
                    <span className="text-zinc-600 font-medium">Costo Unitario</span>
                    <span className="font-bold text-zinc-900">${currentProduct.cost}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-50">
                    <span className="text-zinc-600 font-medium">Precio Sugerido</span>
                    <span className="font-bold text-emerald-600">${currentProduct.price}</span>
                </div>
                <div className="flex justify-between py-2">
                    <span className="text-zinc-600 font-medium">Margen Sugerido</span>
                    <span className="text-emerald-600 font-bold">+${(currentProduct.price - currentProduct.cost).toFixed(2)}</span>
                </div>
            </div>

            {currentProduct.attributes && currentProduct.attributes.length > 0 && (
                <div className="card p-4 mt-4 bg-white border border-zinc-100 shadow-sm rounded-xl">
                    <h2 className="text-sm font-black mb-2 text-zinc-400 uppercase tracking-widest">Atributos</h2>
                    <div className="flex flex-col gap-2">
                        {currentProduct.attributes.map((attr, idx) => (
                            <div key={idx} className="flex justify-between items-center border-b border-zinc-50 pb-2 last:border-0 last:pb-0">
                                <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{attr.name}</span>
                                <span className="font-bold text-sm text-zinc-900">{attr.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {currentProduct.isTest && (
                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500 text-center text-sm font-bold uppercase tracking-widest">
                    ⚠️ Inventario de Prueba
                </div>
            )}
        </div>
    );
}
