"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Plus, Minus, Trash2, ArrowRight, DollarSign, ChevronLeft } from "lucide-react";
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

    const categories = ["Todas", ...new Set(products.map(p => p.category))].filter(Boolean);

    const filteredProducts = products.filter(p => !p.isTest).filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "Todas" || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const totalProfit = cart.reduce((sum, item) => sum + ((item.price - item.cost) * item.qty), 0);

    const addToCart = (product) => {
        if (product.stock <= 0) {
            alert(`¡Sin stock! No puedes añadir ${product.name} porque el stock es 0.`);
            return;
        }
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) {
                if (existing.qty + 1 > product.stock) {
                    alert(`¡Stock insuficiente! Solo quedan ${product.stock} unidades de ${product.name}.`);
                    return prev;
                }
                return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, { ...product, qty: 1, originalPrice: product.price }];
        });
    };

    const updateCartItem = (id, field, value) => {
        if (field === 'qty') {
            const item = cart.find(i => i.id === id);
            const product = products.find(p => p.id === id);
            if (product && value > product.stock) {
                alert(`¡Stock insuficiente! Solo quedan ${product.stock} unidades de ${product.name}.`);
                return;
            }
        }
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(i => i.id !== id));
    };

    const handleConfirmSale = async () => {
        try {
            await createSale(cart, customerName || "Consumidor Final", paymentMethod);
            setStep(3); // Success Screen
        } catch (e) {
            alert("Error al guardar venta: " + e.message);
        }
    };

    if (step === 1) {
        return (
            <div className="flex flex-col min-h-screen bg-[var(--color-background)] animate-fade-in -m-4 md:-m-10">
                <header className="flex items-center gap-3 py-4 px-4 bg-[var(--color-surface)] border-b border-[var(--color-glass-border)] shrink-0">
                    <Link href="/" className="btn btn-ghost p-1 text-[var(--color-text-main)]"><ChevronLeft /></Link>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-[var(--color-text-main)]">Nueva Venta</h1>
                    </div>
                </header>

                <div className="px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-glass-border)] shrink-0">
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
                                const inCart = cart.find(i => i.id === product.id);
                                return (
                                    <div key={product.id} className="card flex items-center justify-between p-3 bg-[var(--color-surface)] border border-[var(--color-glass-border)] shadow-sm hover:translate-y-[-2px] transition-transform" onClick={() => addToCart(product)}>
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {product.image && product.image.startsWith('data:image') ? (
                                                <img src={product.image} alt={product.name} className="h-12 w-12 rounded-lg object-cover bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] shrink-0" />
                                            ) : (
                                                <div className="text-2xl h-12 w-12 rounded-lg bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] flex items-center justify-center shrink-0">{product.image || "📦"}</div>
                                            )}
                                            <div className="min-w-0">
                                                <div className="font-bold text-sm text-[var(--color-text-main)] truncate">{product.name}</div>
                                                {product.attributes && product.attributes.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                                        {product.attributes.map((attr, idx) => (
                                                            <span key={idx} className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-surface-highlight)] px-1 rounded">
                                                                {attr.name}: <span className="text-[var(--color-text-main)]">{attr.value}</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="flex gap-2 items-end mt-1">
                                                    <div className="text-primary font-bold text-base leading-none">${product.price}</div>
                                                    <div className="text-[10px] text-[var(--color-text-muted)] mb-0.5">Stock: {product.stock}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {inCart ? (
                                            <div className="badge bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-widest shrink-0 whitespace-nowrap shadow-sm">
                                                {inCart.qty} en carrito
                                            </div>
                                        ) : (
                                            <button className="btn btn-outline h-10 w-10 flex items-center justify-center rounded-full border border-[var(--color-glass-border)] text-[var(--color-text-muted)] hover:text-primary hover:border-primary shrink-0 transition-all bg-[var(--color-surface)]">
                                                <Plus size={20} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

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
            </div>
        );
    }

    if (step === 2) {
        return (
            <div className="flex flex-col min-h-screen bg-[var(--color-background)] animate-fade-in -m-4 md:-m-10">
                <header className="sticky top-0 flex items-center gap-3 py-4 px-4 bg-[var(--color-surface)] border-b border-[var(--color-glass-border)] z-30 shrink-0">
                    <button onClick={() => setStep(1)} className="btn btn-ghost p-1 text-[var(--color-text-main)] transition-transform active:scale-95"><ChevronLeft /></button>
                    <h1 className="text-xl font-bold text-[var(--color-text-main)]">Ajustar Precios</h1>
                </header>

                <div className="flex flex-col gap-4 mb-6 px-4 pt-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Cliente</label>
                        <input
                            className="w-full bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] rounded-xl px-4 h-12 text-[var(--color-text-main)] outline-none focus:border-primary transition-all shadow-sm"
                            placeholder="Nombre del cliente (Opcional)"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Método de Pago</label>
                        <div className="grid grid-cols-2 gap-2 bg-[var(--color-surface-highlight)] p-1 rounded-2xl border border-[var(--color-glass-border)]">
                            <button
                                onClick={() => setPaymentMethod("Efectivo")}
                                className={`py-2.5 rounded-xl text-sm font-black transition-all ${paymentMethod === 'Efectivo' ? 'bg-primary text-white shadow-glow' : 'text-[var(--color-text-muted)]'}`}
                            >
                                Efectivo
                            </button>
                            <button
                                onClick={() => setPaymentMethod("Tarjeta")}
                                className={`py-2.5 rounded-xl text-sm font-black transition-all ${paymentMethod === 'Tarjeta' ? 'bg-blue-600 text-white shadow-glow' : 'text-[var(--color-text-muted)]'}`}
                            >
                                Tarjeta
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-2 px-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Resumen de Productos</h3>
                    <div className="text-[10px] text-[var(--color-text-muted)] font-medium">Puedes ajustar los precios aquí</div>
                </div>

                <div className="flex flex-col gap-4 px-4 pb-48">
                    {cart.map(item => (
                        <div key={item.id} className="card p-3 bg-[var(--color-surface)] border border-[var(--color-glass-border)] shadow-sm rounded-xl">
                            <div className="flex justify-between items-start mb-3">
                                <div className="font-bold text-sm max-w-[70%] text-[var(--color-text-main)]">{item.name}</div>
                                <button onClick={() => removeFromCart(item.id)} className="text-danger p-1"><Trash2 size={16} /></button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Cantidad</label>
                                    <div className="flex items-center gap-4 py-1">
                                        <button
                                            type="button"
                                            className="h-9 w-9 flex items-center justify-center rounded-xl bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] active:scale-90 transition-all shadow-sm"
                                            onClick={() => updateCartItem(item.id, 'qty', Math.max(1, item.qty - 1))}
                                        ><Minus size={16} /></button>
                                        <span className="font-black text-lg w-6 text-center text-[var(--color-text-main)]">{item.qty}</span>
                                        <button
                                            type="button"
                                            className="h-9 w-9 flex items-center justify-center rounded-xl bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] active:scale-90 transition-all shadow-sm"
                                            onClick={() => updateCartItem(item.id, 'qty', item.qty + 1)}
                                        ><Plus size={16} /></button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-primary mb-1 block flex items-center gap-1">
                                        Precio Venta <DollarSign size={10} />
                                    </label>
                                    <input
                                        type="number"
                                        className="w-full bg-[var(--color-surface-highlight)] border border-[var(--color-glass-border)] rounded-lg py-1 px-2 h-8 text-right text-[var(--color-text-main)] font-bold outline-none focus:border-primary transition-all"
                                        value={item.price}
                                        onChange={(e) => updateCartItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>

                            <div className="mt-2 text-xs text-right text-success/80">
                                Ganancia x u: ${(item.price - item.cost).toFixed(2)}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--color-surface)] border-t border-[var(--color-glass-border)] z-40 lg:left-[280px] shadow-2xl">
                    <div className="max-w-[600px] mx-auto w-full">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[var(--color-text-muted)]">Subtotal</span>
                            <span className="text-[var(--color-text-main)] font-bold">${cartTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-success text-sm">Ganancia Est.</span>
                            <span className="text-success font-bold text-sm">+${totalProfit.toFixed(2)}</span>
                        </div>
                        <button className="btn btn-primary w-full py-3 shadow-lg shadow-primary/20" onClick={handleConfirmSale}>
                            Confirmar Venta
                        </button>
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
