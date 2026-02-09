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
    const [products, setProducts] = useState([]);
    const [customerName, setCustomerName] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("Efectivo");

    // Load products on mount
    useEffect(() => {
        getProducts().then(setProducts);
    }, []);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const totalProfit = cart.reduce((sum, item) => sum + ((item.price - item.cost) * item.qty), 0);

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) {
                return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, { ...product, qty: 1, originalPrice: product.price }];
        });
    };

    const updateCartItem = (id, field, value) => {
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
            <div className="flex flex-col h-full pb-24">
                <header className="flex items-center gap-3 py-4 mb-2">
                    <Link href="/" className="btn btn-ghost p-1"><ChevronLeft /></Link>
                    <h1 className="text-xl font-bold">Nueva Venta</h1>
                </header>

                <div className="mb-4 relative">
                    <Search className="absolute left-3 top-2.5 text-secondary" size={20} />
                    <input
                        className="input pl-10"
                        placeholder="Buscar producto..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto flex-1">
                    {filteredProducts.map(product => {
                        const inCart = cart.find(i => i.id === product.id);
                        return (
                            <div key={product.id} className="card flex items-center justify-between p-3" onClick={() => addToCart(product)}>
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl">{product.image}</div>
                                    <div>
                                        <div className="font-bold text-sm">{product.name}</div>
                                        <div className="text-primary font-bold">${product.price}</div>
                                        <div className="text-xs text-secondary">Stock: {product.stock}</div>
                                    </div>
                                </div>

                                {inCart ? (
                                    <div className="badge badge-success">{inCart.qty} en carrito</div>
                                ) : (
                                    <button className="btn btn-outline p-2 rounded-full border-dashed border-secondary">
                                        <Plus size={16} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {cart.length > 0 && (
                    <div className="fixed bottom-20 left-4 right-4 animate-fade-in">
                        <button
                            onClick={() => setStep(2)}
                            className="btn btn-primary w-full shadow-lg flex justify-between items-center py-4"
                        >
                            <div className="flex flex-col items-start px-2">
                                <span className="text-xs opacity-90">{cart.length} productos</span>
                                <span className="text-lg font-bold">${cartTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-2">
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
            <div className="flex flex-col h-full pb-24">
                <header className="flex items-center gap-3 py-4 mb-2">
                    <button onClick={() => setStep(1)} className="btn btn-ghost p-1"><ChevronLeft /></button>
                    <h1 className="text-xl font-bold">Ajustar Precios</h1>
                </header>

                <div className="flex flex-col gap-4 mb-6">
                    <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Cliente</label>
                        <input
                            className="input bg-zinc-900/50 border-white/5 h-12"
                            placeholder="Nombre del cliente (Opcional)"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Método de Pago</label>
                        <div className="grid grid-cols-2 gap-2 glass p-1 rounded-2xl">
                            <button
                                onClick={() => setPaymentMethod("Efectivo")}
                                className={`py-2.5 rounded-xl text-sm font-black transition-all ${paymentMethod === 'Efectivo' ? 'bg-primary text-white shadow-glow' : 'text-zinc-500'}`}
                            >
                                Efectivo
                            </button>
                            <button
                                onClick={() => setPaymentMethod("Tarjeta")}
                                className={`py-2.5 rounded-xl text-sm font-black transition-all ${paymentMethod === 'Tarjeta' ? 'bg-blue-600 text-white shadow-glow' : 'text-zinc-500'}`}
                            >
                                Tarjeta
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Resumen de Productos</h3>
                    <div className="text-[10px] text-zinc-600 font-medium">Puedes ajustar los precios aquí</div>
                </div>

                <div className="flex flex-col gap-4 overflow-y-auto flex-1">
                    {cart.map(item => (
                        <div key={item.id} className="card p-3">
                            <div className="flex justify-between items-start mb-3">
                                <div className="font-bold text-sm max-w-[70%]">{item.name}</div>
                                <button onClick={() => removeFromCart(item.id)} className="text-danger p-1"><Trash2 size={16} /></button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-secondary mb-1 block">Cantidad</label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            className="btn btn-outline p-1 rounded-md h-8 w-8 flex items-center justify-center"
                                            onClick={() => updateCartItem(item.id, 'qty', Math.max(1, item.qty - 1))}
                                        ><Minus size={14} /></button>
                                        <span className="font-bold w-4 text-center">{item.qty}</span>
                                        <button
                                            className="btn btn-outline p-1 rounded-md h-8 w-8 flex items-center justify-center"
                                            onClick={() => updateCartItem(item.id, 'qty', item.qty + 1)}
                                        ><Plus size={14} /></button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-primary mb-1 block flex items-center gap-1">
                                        Precio Venta <DollarSign size={10} />
                                    </label>
                                    <input
                                        type="number"
                                        className="input py-1 px-2 h-8 text-right bg-surface-hover border-primary/50 text-white font-bold"
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

                <div className="fixed bottom-20 left-4 right-4 bg-surface border border-border p-4 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-secondary">Subtotal</span>
                        <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-success text-sm">Ganancia Est.</span>
                        <span className="text-success font-bold text-sm">+${totalProfit.toFixed(2)}</span>
                    </div>
                    <button className="btn btn-primary w-full py-3" onClick={handleConfirmSale}>
                        Confirmar Venta
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
            <h2 className="text-2xl font-bold mb-2 text-white">¡Venta Exitosa!</h2>

            <div className="glass p-6 rounded-3xl w-full mb-8 text-left space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className="text-zinc-500 text-xs font-black uppercase tracking-widest">Total</span>
                    <span className="text-xl font-black text-white">${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className="text-zinc-500 text-xs font-black uppercase tracking-widest">Cliente</span>
                    <span className="font-bold text-white text-sm">{customerName || "Consumidor Final"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className="text-zinc-500 text-xs font-black uppercase tracking-widest">Pago</span>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${paymentMethod === 'Tarjeta' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {paymentMethod}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-xs font-black uppercase tracking-widest">Fecha</span>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">
                        {new Date().toLocaleString('es-MX', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>

            <div className="flex flex-col gap-3 w-full">
                <Link href="/" className="btn btn-primary w-full py-3">Volver al Inicio</Link>
                <button onClick={() => {
                    setCart([]);
                    setStep(1);
                }} className="btn btn-ghost w-full">Nueva Venta</button>
            </div>
        </div>
    );
}
