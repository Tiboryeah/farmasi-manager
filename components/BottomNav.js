"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, FileText, LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions";

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith('/login')) return null;

  const navItems = [
    { name: "Inicio", href: "/", icon: LayoutDashboard },
    { name: "Ventas", href: "/sales", icon: ShoppingCart },
    { name: "Stock", href: "/inventory", icon: Package },
    { name: "Reportes", href: "/reports", icon: FileText },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive ? "active" : ""}`}
          >
            <div className={`p-2 rounded-xl transition-all ${isActive ? "bg-primary/10" : ""}`}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-bold transition-colors ${isActive ? "text-primary" : "text-zinc-500"}`}>
              {item.name}
            </span>
          </Link>
        );
      })}

      {/* Botón de salida para móvil */}
      <button
        onClick={async () => await logoutAction()}
        className="nav-item border-none bg-transparent outline-none"
      >
        <div className="p-2 rounded-xl text-zinc-500">
          <LogOut size={22} />
        </div>
        <span className="text-[10px] font-bold text-zinc-500 uppercase">Salir</span>
      </button>
    </nav>
  );
}
