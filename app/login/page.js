
"use client";

import { useState } from "react";
import { loginAction } from "@/app/actions"; // Server Action
import { useRouter } from "next/navigation";
import { User, Lock, Key } from "lucide-react";

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
            } else {
                // Redirect handled server-side or implicitly by session cookie
            }
        } catch (e) {
            setError("Error de conexión");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-foreground">
            <div className="w-full max-w-sm card p-8 shadow-2xl border border-border/50">
                <div className="flex flex-col items-center mb-6">
                    <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 text-primary">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-2xl font-bold">Bienvenido</h1>
                    <p className="text-secondary text-sm">Inicia sesión para gestionar tu negocio</p>
                </div>

                <form action={handleSubmit} className="flex flex-col gap-4">
                    {error && (
                        <div className="bg-danger/10 text-danger text-sm p-3 rounded-lg text-center border border-danger/20">
                            {error}
                        </div>
                    )}

                    <div className="relative">
                        <User className="absolute left-3 top-3 text-secondary" size={18} />
                        <input
                            name="username"
                            className="input pl-10 py-3 w-full bg-surface-hover"
                            placeholder="Usuario"
                            required
                            autoComplete="username"
                        />
                    </div>

                    <div className="relative">
                        <Key className="absolute left-3 top-3 text-secondary" size={18} />
                        <input
                            name="password"
                            type="password"
                            className="input pl-10 py-3 w-full bg-surface-hover"
                            placeholder="Contraseña"
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full py-3 mt-2 font-bold shadow-lg shadow-primary/20"
                    >
                        {loading ? "Entrando..." : "Iniciar Sesión"}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-secondary/50">
                    Farmasi Manager v1.0
                </div>
            </div>
        </div>
    );
}
