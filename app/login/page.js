"use client";

import { useState } from "react";
import { loginAction } from "@/app/actions";
import { useRouter } from "next/navigation";
import { User, Lock, Key, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    async function handleSubmit(formData) {
        setLoading(true);
        setError("");

        try {
            const result = await loginAction(formData);
            if (result?.error) {
                setError(result.error);
            }
        } catch (e) {
            setError("Error de conexión");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#050505] relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />

            <div className="w-full max-w-md z-10 animate-fade-in">
                <div className="text-center mb-10">
                    <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-primary shadow-glow mb-6 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                        <ShieldCheck size={40} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-white mb-2">Farmasi <span className="text-primary italic">Manager</span></h1>
                    <p className="text-zinc-500 font-medium">Panel de Gestión Profesional</p>
                </div>

                <div className="glass p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                    {/* Inner highlight */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    <form action={handleSubmit} className="flex flex-col gap-6">
                        {error && (
                            <div className="bg-danger/10 text-danger text-sm font-bold p-4 rounded-2xl text-center border border-danger/20 animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Usuario</label>
                            <div className="group flex items-center gap-3 bg-zinc-900/50 border border-white/5 rounded-2xl px-5 py-4 focus-within:border-primary/50 focus-within:bg-zinc-900 transition-all duration-300">
                                <User size={20} className="text-zinc-600 group-focus-within:text-primary transition-colors" />
                                <input
                                    name="username"
                                    className="bg-transparent border-none outline-none text-white w-full placeholder:text-zinc-700 font-medium"
                                    placeholder="Ingresa tu usuario"
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Contraseña</label>
                            <div className="group flex items-center gap-3 bg-zinc-900/50 border border-white/5 rounded-2xl px-5 py-4 focus-within:border-primary/50 focus-within:bg-zinc-900 transition-all duration-300">
                                <Key size={20} className="text-zinc-600 group-focus-within:text-primary transition-colors" />
                                <input
                                    name="password"
                                    type="password"
                                    className="bg-transparent border-none outline-none text-white w-full placeholder:text-zinc-700 font-medium"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full py-4 rounded-2xl text-lg font-black shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all group"
                        >
                            {loading ? (
                                <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <div className="flex items-center gap-2">
                                    Acceder al Panel
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                            )}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-center text-zinc-600 text-sm font-medium">
                    &copy; {new Date().getFullYear()} Farmasi System • v2.0
                </p>
            </div>

            <style jsx>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.2s ease-in-out 0s 2;
                }
            `}</style>
        </div>
    );
}
