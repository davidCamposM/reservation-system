"use client";

/**
 * DESCRIPCIÓN: Herramienta de NextAuth disponible en el navegador.
 * QUÉ HACE: Importa la función que elimina la sesión actual.
 * PARA QUÉ SE UTILIZA: Permite cerrar sesión desde el encabezado de la aplicación.
 */
import { signOut } from "next-auth/react";
import { useState } from "react";
import { useNavigationGuard } from "@/components/navigation-provider";

/**
 * DESCRIPCIÓN: Botón para cerrar la sesión del usuario actual.
 * QUÉ HACE: Al hacer clic, borra la sesión de NextAuth y redirige a la página de inicio.
 * PARA QUÉ SE UTILIZA: Da al usuario una forma explícita y segura de salir de ReservaPro.
 */
export function SignOutButton() {
  const { confirmNavigation } = useNavigationGuard();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (!confirmNavigation()) return;
    // callbackUrl indica a qué ruta debe volver el navegador después de cerrar la sesión.
    setIsSigningOut(true);
    try {
      await signOut({ callbackUrl: "/" });
    } catch {
      // El botón vuelve a estar disponible si una interrupción de red impide cerrar la sesión.
      setIsSigningOut(false);
    }
  }

  return <button disabled={isSigningOut} onClick={handleSignOut} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm">{isSigningOut ? "Cerrando..." : "Cerrar sesión"}</button>;
}
