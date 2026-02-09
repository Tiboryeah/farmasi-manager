
"use client";

import { useState } from "react";
import { registerAction } from "@/app/actions";
import { User, Lock, Key, ArrowRight, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(formData) {
        setLoading(true);
        setError("");

        try {
            const result = await registerAction(formData);
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
                    <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-glow mb-6 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                        <UserPlus size={40} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-white mb-2">Crear <span className="text-blue-500 italic">Cuenta</span></h1>
                    <p className="text-zinc-500 font-medium">Únete a DianiFarmi Pro</p>
                </div>

                <div className="glass p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    <form action={handleSubmit} className="flex flex-col gap-6">
                        {error && (
                            <div className="bg-danger/10 text-danger text-sm font-bold p-4 rounded-2xl text-center border border-danger/20 animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Nuevo Usuario</label>
                            <div className="group flex items-center gap-3 bg-zinc-900/50 border border-white/5 rounded-2xl px-5 py-4 focus-within:border-blue-500/50 focus-within:bg-zinc-900 transition-all duration-300">
                                <User size={20} className="text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    name="username"
                                    className="bg-transparent border-none outline-none text-white w-full placeholder:text-zinc-700 font-medium"
                                    placeholder="Elige un nombre de usuario"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Contraseña</label>
                            <div className="group flex items-center gap-3 bg-zinc-900/50 border border-white/5 rounded-2xl px-5 py-4 focus-within:border-blue-500/50 focus-within:bg-zinc-900 transition-all duration-300">
                                <Key size={20} className="text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    name="password"
                                    type="password"
                                    className="bg-transparent border-none outline-none text-white w-full placeholder:text-zinc-700 font-medium"
                                    placeholder="Crea una contraseña segura"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 rounded-2xl text-lg font-black bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all group mt-2"
                        >
                            {loading ? (
                                <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin m-auto" />
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    Registrarme Ahora
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-zinc-500 text-sm font-medium">
                            ¿Ya tienes una cuenta?{" "}
                            <Link href="/login" className="text-blue-500 font-bold hover:underline">
                                Inicia Sesión
                            </Link>
                        </p>
                    </div>
                </div>
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
