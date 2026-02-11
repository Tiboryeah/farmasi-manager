"use client";

import { useState, useEffect } from "react";

const normalizeText = (text) => {
    if (!text) return "";
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};
import Link from "next/link";
import { Search, Plus, Minus, Trash2, ArrowRight, DollarSign, ChevronLeft, Check } from "lucide-react";
import { getProducts, createSale } from "@/app/actions";
import { useRouter } from "next/navigation";

export default function NewSalePage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Todas");
    const [products, setProducts] = useState([]);
    const [customerName, setCustomerName] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("Efectivo");

    // Load products on mount
    useEffect(() => {
        getProducts().then(setProducts);
    }, []);

    const [batchSelectionProduct, setBatchSelectionProduct] = useState(null);

    const categories = ["Todas", ...new Set(products.map(p => p.category).filter(Boolean).sort())];

    const filteredProducts = products.filter(p => !p.isTest).filter(p => {
        const normalizedSearch = normalizeText(searchTerm);
        const matchesSearch = normalizeText(p.name).includes(normalizedSearch);
        const matchesCategory = selectedCategory === "Todas" || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const totalProfit = cart.reduce((sum, item) => sum + ((item.price - item.cost) * item.qty), 0);

    const addToCart = (product) => {
        if (product.stock <= 0) {
            alert(`¡Sin stock! No puedes añadir ${product.name} porque el stock total es 0.`);
            return;
        }

        const availableBatches = (product.batches || []).filter(b => b.stock > 0);

        if (availableBatches.length > 1) {
            // More than one batch available: Let user decide which one to sell
            setBatchSelectionProduct(product);
        } else if (availableBatches.length === 1) {
            // Exactly one batch: Add it directly to save time
            confirmAddToCart(product, availableBatches[0]);
        } else {
            // Legacy / Fallback for products without batches array but with stock
            confirmAddToCart(product, { _id: null, label: 'General', cost: product.cost, price: product.price, stock: product.stock });
        }
    };

    const confirmAddToCart = (product, batch) => {
        const cartItemId = batch._id ? `${product.id}-${batch._id}` : product.id;

        setCart(prev => {
            const existing = prev.find(i => i.cartItemId === cartItemId);
            if (existing) {
                if (existing.qty + 1 > batch.stock) {
                    alert(`¡Stock insuficiente en este lote! Solo quedan ${batch.stock} unidades.`);
                    return prev;
                }
                return prev.map(i => i.cartItemId === cartItemId ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, {
                ...product,
                id: product.id, // Keep original ID for DB
                batchId: batch._id,
                batchLabel: batch.label,
                cartItemId,
                qty: 1,
                cost: batch.cost,
                price: batch.price,
                originalPrice: batch.price
            }];
        });
    };

    const updateCartItem = (cartItemId, field, value) => {
        if (field === 'qty') {
            const item = cart.find(i => i.cartItemId === cartItemId);
            if (value <= 0) {
                removeFromCart(cartItemId);
                return;
            }
            // Check stock from the correct batch
            const product = products.find(p => p.id === item.id);
            const batch = product.batches?.find(b => b._id === item.batchId) || { stock: product.stock };

            if (value > batch.stock) {
                alert(`¡Stock insuficiente! Solo quedan ${batch.stock} unidades de este lote.`);
                return;
            }
        }
        setCart(prev => prev.map(item => {
            if (item.cartItemId === cartItemId) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const removeFromCart = (cartItemId) => {
        setCart(prev => prev.filter(i => i.cartItemId !== cartItemId));
    };

    const handleConfirmSale = async () => {
        try {
            // The action expects the list of items
            await createSale(cart, customerName || "Consumidor Final", paymentMethod);
            setStep(3); // Success Screen
        } catch (e) {
            alert("Error al guardar venta: " + e.message);
        }
    };

    if (step === 1) {
        return (
            <div className="flex flex-col min-h-screen bg-[var(--color-background)] animate-fade-in -m-4 md:-m-10 relative">
                <div className="sticky top-0 z-50">
                    <header className="flex items-center gap-3 py-4 px-4 bg-[var(--color-surface)] border-b border-[var(--color-glass-border)] shrink-0">
                        <Link href="/" className="btn btn-ghost p-1 text-[var(--color-text-main)]"><ChevronLeft /></Link>
                        <div className="flex-1 flex items-center justify-between">
                            <h1 className="text-xl font-bold text-[var(--color-text-main)]">Nueva Venta</h1>
                            {cart.length > 0 && (
                                <button
                                    onClick={() => setStep(2)}
                                    className="btn btn-primary btn-sm h-9 rounded-xl px-4 flex items-center gap-2 shadow-lg shadow-primary/20 animate-in fade-in slide-in-from-right-2 duration-300"
                                >
                                    <span className="text-xs font-black uppercase tracking-wider">Continuar</span>
                                    <ArrowRight size={16} />
                                </button>
                            )}
                        </div>
                    </header>

                    <div className="px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-glass-border)] shrink-0 shadow-sm">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-[var(--color-text-muted)]" size={20} />
                            <input
                                className="w-full bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] rounded-2xl pl-10 h-10 text-[var(--color-text-main)] outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-[var(--color-text-muted)] shadow-sm"
                                placeholder="Buscar producto..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-1 relative min-h-[500px]">
                    {/* Category Sidebar */}
                    <aside className="w-24 md:w-48 bg-[var(--color-surface-highlight)] border-r border-[var(--color-glass-border)] flex flex-col overflow-hidden shrink-0">
                        <div className="p-2 border-b border-[var(--color-glass-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center bg-[var(--color-surface)]">
                            Categorías
                        </div>
                        <div className="sticky top-0 overflow-y-auto flex flex-col gap-2 p-2 pb-24 scrollbar-hide">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-bold transition-all text-center min-h-[5rem] border ${selectedCategory === cat
                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-100'
                                        : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-transparent hover:bg-[var(--color-surface-hover)]'
                                        }`}
                                >
                                    <span className="line-clamp-2 leading-tight">{cat}</span>
                                </button>
                            ))}
                        </div>
                    </aside>

                    {/* Products Grid */}
                    <div className="flex-1 overflow-y-auto p-4 pb-24 bg-[var(--color-background)]">
                        <div className="flex flex-col gap-3">
                            {filteredProducts.map(product => {
                                // If multiple batches, we sum quantities in cart for visual feedback
                                const itemsInCart = cart.filter(i => i.id === product.id);
                                const totalQtyInCart = itemsInCart.reduce((sum, item) => sum + item.qty, 0);

                                return (
                                    <div key={product.id} className="card flex items-center justify-between p-2 md:p-3 bg-[var(--color-surface)] border border-[var(--color-glass-border)] shadow-sm hover:translate-y-[-2px] transition-transform" onClick={() => addToCart(product)}>
                                        <div className="flex items-center gap-2 md:gap-3 overflow-hidden flex-1">
                                            {product.image && product.image.startsWith('data:image') ? (
                                                <img src={product.image} alt={product.name} className="h-10 w-10 md:h-12 md:w-12 rounded-lg object-cover bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] shrink-0" />
                                            ) : (
                                                <div className="text-xl md:text-2xl h-10 w-10 md:h-12 md:w-12 rounded-lg bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] flex items-center justify-center shrink-0">{product.image || "📦"}</div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-xs md:text-sm text-[var(--color-text-main)] truncate leading-tight">{product.name}</div>
                                                <div className="flex flex-wrap gap-1 mt-0.5">
                                                    {product.batches && product.batches.length > 1 ? (
                                                        <span className="text-[9px] md:text-[10px] text-primary font-black uppercase tracking-tighter bg-primary/10 px-1 rounded">Varios Lotes</span>
                                                    ) : (
                                                        product.attributes && product.attributes.slice(0, 1).map((attr, idx) => (
                                                            <span key={idx} className="text-[9px] md:text-[10px] text-[var(--color-text-muted)] bg-[var(--color-surface-highlight)] px-1 rounded truncate max-w-full">
                                                                {attr.value}
                                                            </span>
                                                        ))
                                                    )}
                                                    <span className="text-[9px] md:text-[10px] text-[var(--color-text-muted)] italic ml-auto">Stock: {product.stock}</span>
                                                </div>
                                                <div className="text-primary font-black text-sm md:text-base mt-0.5">
                                                    {product.batches && product.batches.length > 1 ? (
                                                        `$${Math.min(...product.batches.map(b => b.price))} - $${Math.max(...product.batches.map(b => b.price))}`
                                                    ) : (
                                                        `$${product.price}`
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                                            {(totalQtyInCart > 0 && !(product.batches && product.batches.length > 1)) ? (
                                                <div className="flex items-center gap-1 bg-[var(--color-surface-highlight)] p-1 rounded-xl border border-[var(--color-glass-border)] shadow-sm">
                                                    <button
                                                        onClick={() => {
                                                            const item = cart.find(i => i.id === product.id);
                                                            if (item) updateCartItem(item.cartItemId, 'qty', item.qty - 1);
                                                        }}
                                                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors"
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                    <span className="min-w-[1.5rem] text-center font-black text-xs text-[var(--color-text-main)]">{totalQtyInCart}</span>
                                                    <button
                                                        onClick={() => {
                                                            const item = cart.find(i => i.id === product.id);
                                                            if (item) updateCartItem(item.cartItemId, 'qty', item.qty + 1);
                                                        }}
                                                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                            ) : totalQtyInCart > 0 ? (
                                                <button
                                                    onClick={() => addToCart(product)}
                                                    className="flex items-center gap-1.5 md:gap-2 bg-primary/10 p-1 px-3 rounded-xl border border-primary/20 text-primary font-black text-xs hover:bg-primary hover:text-white transition-all"
                                                >
                                                    {totalQtyInCart} en 🛒
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => addToCart(product)}
                                                    className="btn btn-outline h-9 w-9 md:h-10 md:w-10 flex items-center justify-center rounded-xl border border-[var(--color-glass-border)] text-[var(--color-text-muted)] hover:text-primary hover:border-primary transition-all bg-[var(--color-surface)] shadow-sm"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Batch Selection Modal */}
                {batchSelectionProduct && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="w-full max-w-lg bg-[var(--color-surface)] rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in-95 duration-300 border border-[var(--color-glass-border)] max-h-[90vh] flex flex-col">
                            <div className="flex items-center justify-between mb-6 shrink-0">
                                <div>
                                    <h2 className="text-xl font-black text-[var(--color-text-main)] leading-tight">{batchSelectionProduct.name}</h2>
                                    <p className="text-xs text-primary uppercase font-black tracking-widest mt-1">Selecciona el lote para vender</p>
                                </div>
                                <button onClick={() => setBatchSelectionProduct(null)} className="h-10 w-10 rounded-full bg-[var(--color-surface-highlight)] hover:bg-red-500/10 hover:text-red-500 transition-colors flex items-center justify-center text-[var(--color-text-muted)]">✕</button>
                            </div>

                            <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
                                {batchSelectionProduct.batches.filter(b => b.stock > 0).map((batch) => {
                                    const cartItemId = `${batchSelectionProduct.id}-${batch._id}`;
                                    const itemInCart = cart.find(i => i.cartItemId === cartItemId);

                                    return (
                                        <div
                                            key={batch._id}
                                            className={`flex items-center justify-between p-4 bg-[var(--color-surface-highlight)] border rounded-2xl transition-all ${itemInCart ? 'border-primary/40 bg-primary/5' : 'border-[var(--color-glass-border)]'}`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-black uppercase tracking-wider ${itemInCart ? 'text-primary' : 'text-[var(--color-text-muted)]'}`}>{batch.label}</span>
                                                    <span className="h-1 w-1 rounded-full bg-[var(--color-glass-border)]"></span>
                                                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">Stock: {batch.stock}</span>
                                                </div>
                                                <div className="text-xl font-black text-[var(--color-text-main)]">${batch.price}</div>
                                            </div>

                                            {itemInCart ? (
                                                <div className="flex items-center gap-2 bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-glass-border)] shadow-sm">
                                                    <button
                                                        onClick={() => updateCartItem(cartItemId, 'qty', itemInCart.qty - 1)}
                                                        className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors"
                                                    >
                                                        <Minus size={18} />
                                                    </button>
                                                    <span className="min-w-[2rem] text-center font-black text-base text-[var(--color-text-main)]">{itemInCart.qty}</span>
                                                    <button
                                                        onClick={() => updateCartItem(cartItemId, 'qty', itemInCart.qty + 1)}
                                                        className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                                                    >
                                                        <Plus size={18} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => confirmAddToCart(batchSelectionProduct, batch)}
                                                    className="h-11 w-11 rounded-xl bg-[var(--color-surface)] border border-[var(--color-glass-border)] flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                                                >
                                                    <Plus size={24} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-6 pt-4 border-t border-[var(--color-glass-border)] text-center shrink-0">
                                <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-tighter">
                                    {batchSelectionProduct.batches.filter(b => b.stock > 0).length} Lotes disponibles con stock
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {cart.length > 0 && (
                    <div className="fixed bottom-4 left-4 right-4 z-50 animate-fade-in lg:left-[calc(280px+1rem)] lg:right-4 mb-20 lg:ml-auto lg:w-[400px]">
                        <button
                            onClick={() => setStep(2)}
                            className="bg-[var(--color-text-main)] text-[var(--color-surface)] p-5 rounded-3xl w-full shadow-2xl flex justify-between items-center border border-[var(--color-glass-border)] hover:scale-[1.03] active:scale-95 transition-all"
                        >
                            <div className="flex flex-col items-start px-2">
                                <span className="text-[10px] opacity-70 font-black uppercase tracking-widest">{cart.length} productos</span>
                                <span className="text-2xl font-black">${cartTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs backdrop-blur-md border border-white/5">
                                Continuar <ArrowRight size={20} />
                            </div>
                        </button>
                    </div>
                )}
            </div>
        );
    }

    if (step === 2) {
        return (
            <div className="flex flex-col min-h-screen bg-[var(--color-background)] animate-fade-in -m-4 md:-m-10 relative">
                <div className="sticky top-0 z-50">
                    <header className="flex items-center gap-3 py-4 px-4 bg-[var(--color-surface)] border-b border-[var(--color-glass-border)] shrink-0">
                        <button onClick={() => setStep(1)} className="btn btn-ghost p-1 text-[var(--color-text-main)] transition-transform active:scale-95"><ChevronLeft /></button>
                        <div className="flex-1 flex items-center justify-between">
                            <h1 className="text-xl font-bold text-[var(--color-text-main)]">Confirmar</h1>
                            <button
                                onClick={handleConfirmSale}
                                className="btn btn-primary btn-sm h-9 rounded-xl px-4 flex items-center gap-2 shadow-lg shadow-primary/20 animate-in fade-in slide-in-from-right-2 duration-300"
                            >
                                <span className="text-xs font-black uppercase tracking-wider">Finalizar</span>
                                <Check size={16} />
                            </button>
                        </div>
                    </header>

                    <div className="flex flex-col gap-3 px-4 py-4 bg-[var(--color-surface)] border-b border-[var(--color-glass-border)] shadow-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Cliente</label>
                                <input
                                    className="w-full bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] rounded-xl px-4 h-10 text-sm text-[var(--color-text-main)] outline-none focus:border-primary transition-all shadow-sm"
                                    placeholder="Nombre (Opcional)"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Método de Pago</label>
                                <div className="grid grid-cols-2 gap-1 bg-[var(--color-surface-highlight)] p-1 rounded-xl border border-[var(--color-glass-border)]">
                                    <button
                                        onClick={() => setPaymentMethod("Efectivo")}
                                        className={`py-1.5 rounded-lg text-[11px] font-black uppercase tracking-tighter transition-all ${paymentMethod === 'Efectivo' ? 'bg-primary text-white shadow-md' : 'text-[var(--color-text-muted)]'}`}
                                    >
                                        Efectivo
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod("Tarjeta")}
                                        className={`py-1.5 rounded-lg text-[11px] font-black uppercase tracking-tighter transition-all ${paymentMethod === 'Tarjeta' ? 'bg-blue-600 text-white shadow-md' : 'text-[var(--color-text-muted)]'}`}
                                    >
                                        Tarjeta
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-2 px-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Resumen de Productos</h3>
                    <div className="text-[10px] text-[var(--color-text-muted)] font-medium">Puedes ajustar los precios aquí</div>
                </div>

                <div className="flex flex-col gap-4 px-4 pb-48">
                    {cart.map(item => (
                        <div key={item.cartItemId} className="card p-3 bg-[var(--color-surface)] border border-[var(--color-glass-border)] shadow-sm rounded-xl">
                            <div className="flex justify-between items-start mb-3">
                                <div className="min-w-0 flex-1 mr-2">
                                    <div className="font-bold text-sm text-[var(--color-text-main)] truncate">{item.name}</div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="text-[10px] font-black uppercase text-primary tracking-widest bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{item.batchLabel || "Lote General"}</div>
                                        <button
                                            onClick={() => {
                                                const prod = products.find(p => p.id === item.id);
                                                if (prod) setBatchSelectionProduct(prod);
                                            }}
                                            className="text-[9px] font-bold text-amber-500 uppercase tracking-tighter hover:underline"
                                        >
                                            Cambiar Lote
                                        </button>
                                    </div>
                                </div>
                                <button onClick={() => removeFromCart(item.cartItemId)} className="text-red-500/50 hover:text-red-500 p-1 transition-colors"><Trash2 size={16} /></button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 block">Cantidad</label>
                                    <div className="flex items-center gap-4 py-1">
                                        <button
                                            type="button"
                                            className="h-9 w-9 flex items-center justify-center rounded-xl bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] active:scale-90 transition-all shadow-sm"
                                            onClick={() => updateCartItem(item.cartItemId, 'qty', Math.max(1, item.qty - 1))}
                                        ><Minus size={16} /></button>
                                        <span className="font-black text-lg w-6 text-center text-[var(--color-text-main)]">{item.qty}</span>
                                        <button
                                            type="button"
                                            className="h-9 w-9 flex items-center justify-center rounded-xl bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] active:scale-90 transition-all shadow-sm"
                                            onClick={() => updateCartItem(item.cartItemId, 'qty', item.qty + 1)}
                                        ><Plus size={16} /></button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-primary mb-1 block flex items-center gap-1">
                                        Precio Venta <DollarSign size={10} />
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-xs">$</span>
                                        <input
                                            type="number"
                                            className="w-full bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] rounded-lg py-1 pl-5 pr-2 h-10 text-right text-[var(--color-text-main)] font-black outline-none focus:border-primary transition-all text-sm"
                                            value={item.price}
                                            onChange={(e) => updateCartItem(item.cartItemId, 'price', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-2 flex justify-between items-center text-[10px] font-bold">
                                <span className="text-[var(--color-text-muted)] uppercase tracking-tighter">Costo: ${item.cost.toFixed(2)}</span>
                                <span className="text-success uppercase tracking-tighter">Ganancia: +${(item.price - item.cost).toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--color-surface)] border-t border-[var(--color-glass-border)] z-40 lg:left-[280px] shadow-2xl">
                    <div className="max-w-[600px] mx-auto w-full">
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Subtotal a Cobrar</span>
                                <span className="text-2xl font-black text-[var(--color-text-main)]">${cartTotal.toFixed(2)}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-black uppercase tracking-widest text-success block">Ganancia</span>
                                <span className="text-lg font-black text-success">+${totalProfit.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 animate-fade-in">
            <h2 className="text-2xl font-bold mb-4 text-[var(--color-text-main)]">¡Venta Exitosa!</h2>

            <div className="bg-[var(--color-surface)] border border-[var(--color-glass-border)] p-6 rounded-3xl w-full mb-8 text-left space-y-4 shadow-xl">
                <div className="flex justify-between items-center border-b border-[var(--color-glass-border)] pb-3">
                    <span className="text-[var(--color-text-muted)] text-xs font-black uppercase tracking-widest">Total</span>
                    <span className="text-xl font-black text-[var(--color-text-main)]">${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[var(--color-glass-border)] pb-3">
                    <span className="text-[var(--color-text-muted)] text-xs font-black uppercase tracking-widest">Cliente</span>
                    <span className="font-bold text-[var(--color-text-main)] text-sm">{customerName || "Consumidor Final"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[var(--color-glass-border)] pb-3">
                    <span className="text-[var(--color-text-muted)] text-xs font-black uppercase tracking-widest">Pago</span>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${paymentMethod === 'Tarjeta' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {paymentMethod}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[var(--color-text-muted)] text-xs font-black uppercase tracking-widest">Fecha</span>
                    <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase">
                        {new Date().toLocaleString('es-MX', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>

            <div className="flex flex-col gap-3 w-full">
                <Link href="/" className="btn btn-primary w-full py-3 shadow-lg shadow-primary/20">Volver al Inicio</Link>
                <button onClick={() => {
                    setCart([]);
                    setStep(1);
                }} className="btn btn-ghost w-full text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface)]">Nueva Venta</button>
            </div>
        </div>
    );
}
