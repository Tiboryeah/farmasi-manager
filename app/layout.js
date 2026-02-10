import { Outfit } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

export const metadata = {
  title: "DianiFarmi",
  description: "Control de ventas, stock y ganancia real",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${outfit.variable} antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <div className="app-layout">
            <Sidebar />
            <main className="main-content">
              <div className="container">
                {children}
              </div>
            </main>
            <BottomNav />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
