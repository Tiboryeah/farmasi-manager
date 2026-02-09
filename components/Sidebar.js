
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, FileText, LogOut, Settings } from "lucide-react";
import { logoutAction } from "@/app/actions";

export default function Sidebar() {
    const pathname = usePathname();

    if (pathname.startsWith('/login')) return null;

    const navItems = [
        { name: "Inicio", href: "/", icon: LayoutDashboard },
        { name: "Ventas", href: "/sales", icon: ShoppingCart },
        { name: "Inventario", href: "/inventory", icon: Package },
        { name: "Reportes", href: "/reports", icon: FileText },
    ];

    return (
        <aside className="sidebar">
            <div className="flex items-center gap-3 px-2 mb-12 flex-shrink-0">
                <div className="h-12 w-12 rounded-2xl bg-[#f43f5e] flex items-center justify-center text-white text-xl font-black shadow-lg shadow-rose-500/20">
                    FM
                </div>
                <div>
                    <h1 className="font-bold text-xl tracking-tighter text-white">Farmasi</h1>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Manager Pro</p>
                </div>
            </div>

            <nav className="flex flex-col gap-2 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`sidebar-item ${isActive ? "active" : ""}`}
                        >
                            <item.icon size={22} />
                            <span className="tracking-tight">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Spacer to push logout to bottom - Explicitly styled to avoid Tailwind issues */}
            <div style={{ flex: 1 }} />

            <div className="pt-6 border-t border-white/5 mt-auto">
                <button
                    className="flex items-center gap-4 w-full p-4 rounded-2xl text-zinc-500 font-bold hover:bg-rose-500/10 hover:text-rose-500 transition-all duration-300"
                    onClick={async () => await logoutAction()}
                >
                    <LogOut size={22} />
                    <span className="tracking-tight">Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
}
