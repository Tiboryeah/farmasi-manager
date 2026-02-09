"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, Menu, FileText } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Inicio", href: "/", icon: LayoutDashboard },
    { name: "Ventas", href: "/sales", icon: ShoppingCart },
    { name: "Inventario", href: "/inventory", icon: Package },
    { name: "Reportes", href: "/reports", icon: FileText },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive ? "active" : ""}`}
          >
            <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
