"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, FileText, LogOut, Sun, Moon } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { useTheme } from "./ThemeProvider";

export default function BottomNav() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  if (pathname.startsWith('/login') || pathname.startsWith('/register')) return null;

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
            className={`flex flex-col items-center justify-center p-2 rounded-2xl w-full h-[70px] transition-all duration-300
              ${isActive ? "text-primary custom-bounce" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"}
            `}
          >
            <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? "bg-primary text-white shadow-lg shadow-primary/30 -translate-y-2 scale-110" : ""}`}>
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-bold mt-1 transition-all duration-300 ${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 hidden"}`}>
              {item.name}
            </span>
          </Link>
        );
      })}

      {/* Theme Toggle for Mobile */}
      <button
        onClick={toggleTheme}
        className="flex flex-col items-center justify-center p-2 rounded-2xl w-full h-[70px] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors"
      >
        <div className="p-2 rounded-xl">
          {theme === 'dark' ? <Sun size={24} className="text-warning" /> : <Moon size={24} />}
        </div>
      </button>

      {/* Botón de salida para móvil */}
      <button
        onClick={async () => await logoutAction()}
        className="flex flex-col items-center justify-center p-2 rounded-2xl w-full h-[70px] text-[var(--color-text-muted)] hover:text-red-500 transition-colors group"
      >
        <div className="p-2 rounded-xl group-hover:bg-red-500/10 transition-all">
          <LogOut size={24} />
        </div>
      </button>
    </nav>
  );
}
