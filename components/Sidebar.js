
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, FileText, LogOut, Settings, Sun, Moon } from "lucide-react";
import { Trash2 } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { useTheme } from "./ThemeProvider";

export default function Sidebar() {
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();

    if (pathname.startsWith('/login') || pathname.startsWith('/register')) return null;



    const navItems = [
        { name: "Inicio", href: "/", icon: LayoutDashboard },
        { name: "Ventas", href: "/sales", icon: ShoppingCart },
        { name: "Inventario", href: "/inventory", icon: Package },
        { name: "Reportes", href: "/reports", icon: FileText },
    ];

    return (
        <aside className="sidebar">
            <div className="flex items-center gap-3 px-2 mb-12 flex-shrink-0">
                <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white text-xl font-black shadow-lg shadow-primary/30">
                    DF
                </div>
                <div>
                    <h1 className="font-bold text-xl tracking-tighter text-[var(--color-text-main)]">DianiFarmi</h1>
                    <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest">Pro</p>
                </div>
            </div>

            <nav className="flex flex-col gap-2 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group
                                ${isActive
                                    ? "bg-primary text-white shadow-lg shadow-primary/30 font-bold"
                                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] font-medium"
                                }
                            `}
                        >
                            <item.icon size={22} className={isActive ? "text-white" : "text-[var(--color-secondary)] group-hover:text-[var(--color-text-main)]"} />
                            <span className="tracking-tight">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Spacer to push logout to bottom - Explicitly styled to avoid Tailwind issues */}
            <div style={{ flex: 1 }} />

            <div className="pt-6 border-t border-[var(--color-glass-border)] mt-auto flex flex-col gap-2">
                <button
                    onClick={toggleTheme}
                    className="flex items-center gap-4 w-full p-4 rounded-2xl text-[var(--color-text-muted)] font-bold hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] transition-all duration-300"
                >
                    {theme === 'dark' ? <Sun size={22} className="text-warning" /> : <Moon size={22} />}
                    <span className="tracking-tight">{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
                </button>


                <button
                    className="flex items-center gap-4 w-full p-4 rounded-2xl text-[var(--color-text-muted)] font-bold hover:bg-red-500/10 hover:text-red-500 transition-all duration-300 group"
                    onClick={async () => await logoutAction()}
                >
                    <LogOut size={22} className="group-hover:scale-110 transition-transform" />
                    <span className="tracking-tight">Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
}
