"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Correct import for App Router
import { getProduct, updateProductStock, updateProduct, deleteProduct } from "@/app/actions";
import { ChevronLeft, Save, History, TrendingUp, TrendingDown, Crop, Check, X, Trash2 } from "lucide-react";
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
    const [selectedBatchId, setSelectedBatchId] = useState("");

    // Cropping states
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isCropping, setIsCropping] = useState(false);

    useEffect(() => {
        if (id) {
            getProduct(id).then(p => {
                if (p) {
                    setCurrentProduct(p);
                    setFormData({ ...p, attributes: p.attributes || [] });
                    setPreview(p.image && p.image.startsWith('data:image') ? p.image : null);
                    if (p.batches && p.batches.length > 0) {
                        setSelectedBatchId(p.batches[0]._id || p.batches[0].id);
                    }
                } else {
                    // If product not found (e.g. deleted), go back
                    router.replace('/inventory');
                }
            }).catch(() => {
                router.replace('/inventory');
            });
        }
    }, [id, router]);

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
        await updateProductStock(currentProduct.id, newStock, reason, selectedBatchId);

        // Optimistic update of the local state
        const updatedProduct = { ...currentProduct, stock: newStock };
        if (updatedProduct.batches && updatedProduct.batches.length > 0) {
            const batchIdx = updatedProduct.batches.findIndex(b => (b._id || b.id) === selectedBatchId);
            if (batchIdx !== -1) {
                updatedProduct.batches[batchIdx].stock += parseInt(adjustment);
            } else {
                updatedProduct.batches[0].stock += parseInt(adjustment);
            }
        }

        setCurrentProduct(updatedProduct);
        setAdjustment(0);
        setReason("Ajuste Manual");
        alert("Stock actualizado");
    };

    const handleAddBatch = () => {
        setFormData(prev => ({
            ...prev,
            batches: [...(prev.batches || []), { label: `Lote ${prev.batches?.length + 1 || 1}`, cost: 0, price: 0, stock: 0 }]
        }));
    };

    const handleBatchChange = (index, field, value) => {
        const newBatches = [...(formData.batches || [])];
        newBatches[index][field] = value;
        setFormData({ ...formData, batches: newBatches });
    };

    const handleRemoveBatch = (index) => {
        if (formData.batches?.length > 1) {
            const newBatches = formData.batches.filter((_, i) => i !== index);
            setFormData({ ...formData, batches: newBatches });
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        // Aggregated stock is calculated server-side in updateProduct action, 
        // but we sync the UI here for immediate feedback
        const totalStock = (formData.batches || []).reduce((sum, b) => sum + (parseInt(b.stock) || 0), 0);
        const updatedData = { ...formData, stock: totalStock };

        await updateProduct(currentProduct.id, updatedData);
        setCurrentProduct(updatedData);
        setIsEditing(false);
        alert("Producto y Lotes actualizados");
    };

    const handleDelete = async () => {
        if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
            await deleteProduct(currentProduct.id);
            router.push('/inventory');
        }
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
                    <button onClick={() => setIsEditing(false)} className="btn btn-ghost p-1 text-danger font-bold flex items-center gap-1"><ChevronLeft /> Cancelar</button>
                    <h1 className="text-xl font-bold text-[var(--color-text-main)]">Editar Producto</h1>
                    <div className="w-8"></div>
                </header>

                <form onSubmit={handleUpdate} className="flex flex-col gap-4 p-4 max-w-2xl mx-auto w-full">
                    <div className="flex gap-2 p-1 bg-[var(--color-surface-highlight)] rounded-xl mb-4 border border-[var(--color-glass-border)]">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, type: 'product' })}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.type === 'product' || !formData.type ? 'bg-[var(--color-surface)] text-[var(--color-text-main)] shadow-sm border border-[var(--color-glass-border)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                        >
                            Producto
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, type: 'sample' })}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.type === 'sample' ? 'bg-primary text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                        >
                            Muestra
                        </button>
                    </div>

                    <div className="flex flex-col items-center gap-4 mb-4">
                        <div className="h-40 w-40 rounded-3xl bg-[var(--color-surface-highlight)] border-2 border-dashed border-[var(--color-glass-border)] flex items-center justify-center overflow-hidden relative group transition-all hover:border-primary/50">
                            {preview ? (
                                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center text-[var(--color-text-muted)]">
                                    <Save size={32} className="mb-2 opacity-30" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-center">Sin Foto</span>
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
                            <label className="text-sm font-bold text-[var(--color-text-muted)] mb-1.5 block">Nombre</label>
                            <input name="name" value={formData.name || ''} required className="input bg-[var(--color-surface)] border-[var(--color-glass-border)] text-[var(--color-text-main)] shadow-sm focus:border-primary focus:ring-primary/20 placeholder:text-[var(--color-text-muted)]/50" placeholder="Nombre del producto" onChange={handleChange} />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-[var(--color-text-muted)] mb-1.5 block">Código</label>
                            <input name="code" value={formData.code || ''} className="input bg-[var(--color-surface)] border-[var(--color-glass-border)] text-[var(--color-text-main)] shadow-sm focus:border-primary focus:ring-primary/20 placeholder:text-[var(--color-text-muted)]/50" placeholder="Código de referencia" onChange={handleChange} />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-[var(--color-text-muted)] mb-1.5 block">Categoría</label>
                        <input name="category" value={formData.category || ''} className="input bg-[var(--color-surface)] border-[var(--color-glass-border)] text-[var(--color-text-main)] shadow-sm focus:border-primary focus:ring-primary/20 placeholder:text-[var(--color-text-muted)]/50" placeholder="Ej. Rostro, Cuidado, etc." onChange={handleChange} />
                    </div>

                    {/* Batches Section (Edit mode) */}
                    <div className="bg-[var(--color-surface-highlight)] p-4 rounded-xl border border-[var(--color-glass-border)]">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <label className="text-sm font-black uppercase tracking-widest text-[var(--color-text-main)] block leading-none">Gestión de Lotes</label>
                                <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-tighter">Control de costos y stock</span>
                            </div>
                            <button type="button" onClick={handleAddBatch} className="text-[10px] btn btn-xs btn-primary font-black uppercase tracking-widest px-3">+ Nuevo Lote</button>
                        </div>

                        <div className="flex flex-col gap-3">
                            {(formData.batches || []).map((batch, index) => (
                                <div key={index} className="bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-glass-border)] relative animate-in fade-in slide-in-from-top-1 duration-300">
                                    {formData.batches.length > 1 && (
                                        <button type="button" onClick={() => handleRemoveBatch(index)} className="absolute top-2 right-2 h-6 w-6 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">✕</button>
                                    )}
                                    <div className="mb-2">
                                        <input
                                            placeholder="Etiqueta del Lote (Ej. Compra Mayo)"
                                            value={batch.label}
                                            onChange={(e) => handleBatchChange(index, 'label', e.target.value)}
                                            className="input h-9 bg-[var(--color-surface-highlight)] border-transparent text-xs font-black text-[var(--color-text-main)]"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] ml-1">Costo ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={batch.cost}
                                                onChange={(e) => handleBatchChange(index, 'cost', e.target.value)}
                                                className="input h-9 bg-[var(--color-surface-highlight)] border-transparent text-xs font-bold text-center"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] ml-1">Venta ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={batch.price}
                                                onChange={(e) => handleBatchChange(index, 'price', e.target.value)}
                                                className="input h-9 bg-[var(--color-surface-highlight)] border-transparent text-xs font-bold text-center"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] ml-1">Stock</label>
                                            <input
                                                type="number"
                                                value={batch.stock}
                                                onChange={(e) => handleBatchChange(index, 'stock', e.target.value)}
                                                className="input h-9 bg-[var(--color-surface-highlight)] border-transparent text-xs font-bold text-center"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="text-sm font-bold text-[var(--color-text-muted)] mb-1.5 block">Stock Mínimo (Alerta)</label>
                            <input name="minStock" type="number" value={formData.minStock || 5} className="input bg-[var(--color-surface)] border-[var(--color-glass-border)] text-[var(--color-text-main)] shadow-sm focus:border-primary focus:ring-primary/20" onChange={handleChange} />
                        </div>
                    </div>

                    {/* Attributes Section */}
                    <div className="bg-[var(--color-surface-highlight)] p-4 rounded-xl border border-[var(--color-glass-border)]">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-bold text-[var(--color-text-main)]">Atributos Adicionales</label>
                            <button type="button" onClick={handleAddAttribute} className="text-xs btn btn-sm btn-ghost text-primary hover:bg-primary/10 font-bold transition-all">+ Añadir</button>
                        </div>
                        {(!formData.attributes || formData.attributes.length === 0) && <p className="text-xs text-[var(--color-text-muted)] italic">Sin atributos</p>}
                        <div className="flex flex-col gap-2">
                            {(formData.attributes || []).map((attr, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        placeholder="Color"
                                        value={attr.name}
                                        onChange={(e) => handleAttributeChange(index, 'name', e.target.value)}
                                        className="input text-xs flex-1 bg-[var(--color-surface)] border-[var(--color-glass-border)] text-[var(--color-text-main)] shadow-sm focus:ring-primary/10"
                                    />
                                    <input
                                        placeholder="Valor"
                                        value={attr.value}
                                        onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                                        className="input text-xs flex-1 bg-[var(--color-surface)] border-[var(--color-glass-border)] text-[var(--color-text-main)] shadow-sm focus:ring-primary/10"
                                    />
                                    <button type="button" onClick={() => handleRemoveAttribute(index)} className="btn btn-square btn-xs btn-ghost text-red-500 hover:bg-red-500/10 transition-colors">✕</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary w-full py-4 mt-4 flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm font-black uppercase tracking-widest">
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
        <div className="flex flex-col h-full pb-20 max-w-2xl mx-auto w-full">
            <header className="flex items-center justify-between py-4 mb-2">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="btn btn-ghost p-1 hover:bg-[var(--color-surface-hover)] rounded-full text-[var(--color-text-muted)] transition-all"><ChevronLeft /></button>
                    <h1 className="text-xl font-bold truncate max-w-[200px] text-[var(--color-text-main)] tracking-tight">{currentProduct.name}</h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleDelete} className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-sm">
                        <Trash2 size={18} />
                    </button>
                    <button onClick={() => setIsEditing(true)} className="h-10 px-4 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm">
                        Editar
                    </button>
                </div>
            </header>

            <div className="card p-4 mb-4 flex gap-5 items-center bg-[var(--color-surface)] border border-[var(--color-glass-border)] shadow-xl shadow-black/5 rounded-2xl">
                <div className="h-28 w-28 bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
                    {currentProduct.image && currentProduct.image.startsWith('data:image') ? (
                        <img src={currentProduct.image} alt={currentProduct.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-5xl text-[var(--color-text-muted)]">{currentProduct.image || "📦"}</span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        {currentProduct.type === 'sample' && (
                            <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/20">
                                Muestra
                            </span>
                        )}
                        <span className="text-[10px] bg-[var(--color-surface-highlight)] text-[var(--color-text-muted)] px-2 py-1 rounded-md font-black uppercase tracking-widest border border-[var(--color-glass-border)] truncate">{currentProduct.category} {currentProduct.code && `• ${currentProduct.code}`}</span>
                    </div>
                    <div className="text-3xl font-black text-[var(--color-text-main)] mb-1 tracking-tighter">{currentProduct.stock} <small className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-widest ml-1">un.</small></div>
                    <div className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Stock Mínimo: {currentProduct.minStock}</div>
                </div>
            </div>

            <div className="card p-6 mb-6 bg-[var(--color-surface)] border border-[var(--color-glass-border)] shadow-xl shadow-black/5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/30"></div>
                <h2 className="text-[10px] font-black mb-5 text-[var(--color-text-muted)] uppercase tracking-[0.2em] border-b border-[var(--color-glass-border)] pb-3 flex items-center gap-2">
                    <History size={14} className="text-primary" /> Ajuste de Inventario
                </h2>
                <form onSubmit={handleAdjust} className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            className={`h-12 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${adjustment > 0 ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-[var(--color-surface-highlight)] text-[var(--color-text-muted)] border-[var(--color-glass-border)] hover:bg-[var(--color-surface-hover)]'}`}
                            onClick={() => setAdjustment(1)}
                        >
                            <TrendingUp size={16} /> Entrada
                        </button>
                        <button
                            type="button"
                            className={`h-12 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${adjustment < 0 ? 'bg-danger text-white border-danger shadow-lg shadow-danger/20 scale-[1.02]' : 'bg-[var(--color-surface-highlight)] text-[var(--color-text-muted)] border-[var(--color-glass-border)] hover:bg-[var(--color-surface-hover)]'}`}
                            onClick={() => setAdjustment(-1)}
                        >
                            <TrendingDown size={16} /> Salida
                        </button>
                    </div>

                    {currentProduct.batches && currentProduct.batches.length > 1 && (
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2 block ml-1">Seleccionar Lote Destino</label>
                            <select
                                value={selectedBatchId}
                                onChange={(e) => setSelectedBatchId(e.target.value)}
                                className="select w-full h-12 bg-[var(--color-surface-highlight)] border-[var(--color-glass-border)] text-[var(--color-text-main)] font-bold text-sm rounded-xl focus:border-primary focus:ring-primary/10"
                            >
                                {currentProduct.batches.map((batch) => (
                                    <option key={batch._id || batch.id} value={batch._id || batch.id}>
                                        {batch.label} - Stock actual: {batch.stock}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex gap-4 items-center bg-[var(--color-surface-highlight)] p-4 rounded-xl border border-[var(--color-glass-border)] group-focus-within:border-primary/30 transition-all">
                        <input
                            type="number"
                            className="bg-transparent border-none shadow-none focus:ring-0 p-0 w-24 text-2xl font-black text-[var(--color-text-main)] tracking-tighter outline-none"
                            value={adjustment === 0 && typeof adjustment === 'number' ? '' : adjustment}
                            placeholder="0"
                            onChange={(e) => {
                                const val = e.target.value;
                                setAdjustment(val === '' ? '' : parseInt(val));
                            }}
                        />
                        <div className="h-8 w-[1px] bg-[var(--color-glass-border)]"></div>
                        <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Cantidad a ajustar</span>
                    </div>

                    <input
                        className="input h-12 bg-[var(--color-surface-highlight)] border-[var(--color-glass-border)] text-[var(--color-text-main)] shadow-sm focus:border-primary focus:ring-primary/10 placeholder:text-[var(--color-text-muted)]/50 text-sm font-medium"
                        placeholder="Motivo (Ej. Regalo, Error de conteo, Compra)"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />

                    <button className="btn btn-primary w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                        Aplicar Ajuste
                    </button>
                </form>
            </div>

            <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-glass-border)] shadow-xl shadow-black/5 rounded-2xl mb-6">
                <h2 className="text-[10px] font-black mb-4 text-[var(--color-text-muted)] uppercase tracking-[0.2em] border-b border-[var(--color-glass-border)] pb-3">Detalles Financieros por Lote</h2>
                <div className="flex flex-col gap-4">
                    {(currentProduct.batches || []).map((batch, idx) => (
                        <div key={idx} className="p-3 bg-[var(--color-surface-highlight)] rounded-xl border border-[var(--color-glass-border)]/50">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-black uppercase text-primary tracking-widest">{batch.label}</span>
                                <span className="text-[10px] font-bold text-[var(--color-text-muted)]">{batch.stock} unidades</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex justify-between">
                                    <span className="text-[var(--color-text-muted)] text-[10px] font-bold uppercase">Costo</span>
                                    <span className="font-bold text-xs">${batch.cost}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[var(--color-text-muted)] text-[10px] font-bold uppercase">Venta</span>
                                    <span className="font-bold text-xs text-emerald-500">${batch.price}</span>
                                </div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-[var(--color-glass-border)] flex justify-between items-center">
                                <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase">Margen Unitario</span>
                                <span className="text-[10px] font-black text-emerald-500">+${(batch.price - batch.cost).toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                    {(!currentProduct.batches || currentProduct.batches.length === 0) && (
                        <>
                            <div className="flex justify-between py-3 border-b border-[var(--color-glass-border)]/50">
                                <span className="text-[var(--color-text-muted)] font-bold text-xs uppercase tracking-widest">Costo Unitario</span>
                                <span className="font-black text-[var(--color-text-main)]">${currentProduct.cost}</span>
                            </div>
                            <div className="flex justify-between py-3 border-b border-[var(--color-glass-border)]/50">
                                <span className="text-[var(--color-text-muted)] font-bold text-xs uppercase tracking-widest">Precio Sugerido</span>
                                <span className="font-black text-emerald-500">${currentProduct.price}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {currentProduct.attributes && currentProduct.attributes.length > 0 && (
                <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-glass-border)] shadow-xl shadow-black/5 rounded-2xl">
                    <h2 className="text-[10px] font-black mb-4 text-[var(--color-text-muted)] uppercase tracking-[0.2em] border-b border-[var(--color-glass-border)] pb-3">Atributos del Producto</h2>
                    <div className="flex flex-col gap-3">
                        {currentProduct.attributes.map((attr, idx) => (
                            <div key={idx} className="flex justify-between items-center border-b border-[var(--color-glass-border)]/30 pb-3 last:border-0 last:pb-0">
                                <span className="text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-[0.1em]">{attr.name}</span>
                                <span className="font-bold text-sm text-[var(--color-text-main)]">{attr.value}</span>
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
