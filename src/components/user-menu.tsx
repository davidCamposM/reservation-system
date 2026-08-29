"use client";

/**
 * DESCRIPCIÓN: Herramienta de NextAuth disponible en el navegador.
 * QUÉ HACE: Importa la función que elimina la sesión actual.
 * PARA QUÉ SE UTILIZA: Permite cerrar sesión desde el encabezado de la aplicación.
 */
import { signOut } from "next-auth/react";

/**
 * DESCRIPCIÓN: Botón para cerrar la sesión del usuario actual.
 * QUÉ HACE: Al hacer clic, borra la sesión de NextAuth y redirige a la página de inicio.
 * PARA QUÉ SE UTILIZA: Da al usuario una forma explícita y segura de salir de ReservaPro.
 */
export function SignOutButton() {
  function handleSignOut() {
    // callbackUrl indica a qué ruta debe volver el navegador después de cerrar la sesión.
    signOut({ callbackUrl: "/" });
  }

  return <button onClick={handleSignOut} className="text-sm font-semibold text-slate-600 hover:text-teal-700">Cerrar sesión</button>;
}
