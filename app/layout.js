import { Outfit } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

export const metadata = {
  title: "Farmasi Manager",
  description: "Control de ventas, stock y ganancia real",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${outfit.variable} antialiased`}>
        <main className="container">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
