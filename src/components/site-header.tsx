"use client";

/**
 * DESCRIPCIÓN: Encabezado principal compartido por toda la aplicación.
 * QUÉ HACE: Muestra marca, navegación, acceso a cuenta y una llamada a la acción adaptada a la sesión actual.
 * PARA QUÉ SE UTILIZA: Mantiene una identidad visual consistente al navegar entre la landing, reservas y administración.
 */
import Link from "next/link";
import { CalendarDays, LogIn, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOutButton } from "@/components/user-menu";
import { RouteNavigation } from "@/components/route-navigation";

/** Datos mínimos de sesión necesarios para decidir los enlaces visibles del encabezado. */
type SiteHeaderProps = {
  user: { id: string; name?: string | null; role: "ADMIN" | "CUSTOMER" } | null;
};

/** Enlaces centrales visibles en pantallas medianas y grandes. */
const navigationLinks = [
  { href: "/catalogo", label: "Servicios" },
  { href: "/reservar", label: "Reservar" },
  { href: "/cuenta", label: "Mi cuenta" },
];

/**
 * DESCRIPCIÓN: Cabecera inmóvil, fuera del área desplazable de la aplicación.
 * QUÉ HACE: Combina fondo translúcido, desenfoque y enlaces de alto contraste con la información de sesión.
 * PARA QUÉ SE UTILIZA: La navegación permanece disponible sin competir visualmente con el contenido de cada página.
 */
export function SiteHeader({ user }: SiteHeaderProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const accountHref = user?.role === "ADMIN" ? "/admin" : "/cuenta";
  const isLanding = pathname === "/";

  function isActive(href: string) {
    return href === "/" ? pathname === href : pathname.startsWith(href);
  }

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <header
      data-navigation-header="stationary"
      className={`site-header ${isLanding ? "site-header-landing border-b border-slate-200 px-3 sm:px-5" : "px-3 pt-3 sm:px-5"}`}
    >
      <nav aria-label="Navegación principal" className={isLanding ? "relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-3 px-1 py-4 sm:px-0 sm:py-5" : "relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-[0_12px_35px_-20px_rgba(11,18,32,0.45)] backdrop-blur-xl sm:px-5"}>
        <Link onClick={closeMenu} href="/" className="group flex items-center gap-2 text-lg font-extrabold tracking-[-0.05em] text-ink sm:text-xl" aria-label="Ir al inicio de ReservaPro">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-teal-700 text-xs tracking-normal text-white shadow-sm transition duration-300 group-hover:rotate-6 group-hover:scale-105">R</span>
          Reserva<span className="text-teal-700">Pro</span>
        </Link>

        <div className="hidden items-center gap-1 rounded-full bg-slate-100/80 p-1 text-sm font-semibold text-slate-600 md:flex">
          {navigationLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`rounded-full px-3 py-2 transition hover:bg-white hover:text-brand-deep hover:shadow-sm ${isActive(link.href) ? "bg-white text-brand-deep shadow-sm" : ""}`}>
              {link.label}
            </Link>
          ))}
        </div>

        {user ? (
          <div className="flex items-center gap-2">
            <Link href={accountHref} className="hidden rounded-full px-3 py-2 text-sm font-bold text-brand-deep transition hover:bg-brand-soft sm:inline-flex">
              {user.name?.split(" ")[0] || "Mi cuenta"}
            </Link>
            <Link href="/reservar" className="ui-button ui-button-primary hidden px-4 text-xs md:inline-flex">
              <CalendarDays aria-hidden="true" className="size-4" />
              Reservar
            </Link>
            <div className="hidden sm:block"><SignOutButton /></div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/ingresar" className="hidden items-center gap-2 px-3 py-2 text-sm font-bold text-slate-600 transition hover:text-brand-deep sm:inline-flex">
              <LogIn aria-hidden="true" className="size-4" />
              Iniciar sesión
            </Link>
            <Link href="/reservar" className="ui-button ui-button-primary hidden px-4 text-xs sm:inline-flex">
              <CalendarDays aria-hidden="true" className="size-4" />
              Reservar
            </Link>
          </div>
        )}

        <button type="button" onClick={() => setIsMenuOpen((current) => !current)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-ink transition hover:border-brand/30 hover:bg-brand-soft md:hidden" aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={isMenuOpen} aria-controls="mobile-navigation">
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {isMenuOpen && <div id="mobile-navigation" className="absolute left-0 right-0 top-[calc(100%+.55rem)] max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-white/80 bg-white/95 p-3 shadow-float backdrop-blur-xl md:hidden">
          <div className="grid gap-1">{navigationLinks.map((link) => <Link key={link.href} onClick={closeMenu} href={link.href} className={`rounded-xl px-4 py-3 text-sm font-bold transition ${isActive(link.href) ? "bg-brand-soft text-brand-deep" : "text-slate-700 hover:bg-slate-50"}`}>{link.label}</Link>)}</div>
          <div className="mt-2 border-t border-slate-100 pt-2">{user ? <div className="flex items-center justify-between gap-2"><Link onClick={closeMenu} href={accountHref} className="block rounded-xl px-4 py-3 text-sm font-bold text-brand-deep">{user.name?.split(" ")[0] || "Mi cuenta"}</Link><SignOutButton /></div> : <Link onClick={closeMenu} href="/ingresar" className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-brand-deep"><LogIn aria-hidden="true" className="size-4" />Iniciar sesión</Link>}</div>
          <Link onClick={closeMenu} href="/reservar" className="ui-button ui-button-primary mt-2 w-full">
            <CalendarDays aria-hidden="true" className="size-4" />
            Reservar
          </Link>
        </div>}
      </nav>
      <div className={isMenuOpen ? "invisible" : ""} inert={isMenuOpen}>
        <RouteNavigation identity={user ? `${user.id}:${user.role}` : "anonymous"} role={user?.role ?? null} />
      </div>
    </header>
  );
}
