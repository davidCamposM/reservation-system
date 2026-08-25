import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReservaPro | Agenda inteligente",
  description: "Reservas simples para negocios de servicios.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-xl font-bold text-teal-700">ReservaPro</Link>
            <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
              <Link href="/reservar">Reservar</Link>
              <Link href="/cuenta">Mi cuenta</Link>
              <Link href="/admin">Administración</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto min-h-[calc(100vh-65px)] max-w-6xl px-6 py-12">{children}</main>
      </body>
    </html>
  );
}
