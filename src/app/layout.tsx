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
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <Link href="/" className="text-xl font-extrabold tracking-tight text-slate-950">Reserva<span className="text-teal-700">Pro</span></Link>
            <div className="hidden items-center gap-5 text-sm font-semibold text-slate-600 sm:flex"><Link className="hover:text-teal-700" href="/catalogo">Servicios</Link><Link className="hover:text-teal-700" href="/reservar">Reservar</Link><Link className="hover:text-teal-700" href="/cuenta">Mi cuenta</Link></div>
            <Link href="/ingresar" className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700">Ingresar</Link>
          </nav>
        </header>
        <main className="mx-auto min-h-[calc(100vh-65px)] max-w-6xl px-5 py-10 sm:px-6 sm:py-14">{children}</main>
      </body>
    </html>
  );
}
