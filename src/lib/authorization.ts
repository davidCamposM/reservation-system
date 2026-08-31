/**
 * DESCRIPCIÓN: Utilidades reutilizables para proteger acciones administrativas.
 * QUÉ HACE: Lee la sesión actual y construye una respuesta HTTP estándar cuando faltan permisos.
 * PARA QUÉ SE UTILIZA: Las rutas API de servicios y profesionales comparten la misma regla de autorización.
 */
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

/**
 * DESCRIPCIÓN: Regla pura de autorización administrativa.
 * QUÉ HACE: Devuelve true únicamente cuando el rol recibido es ADMIN.
 * PARA QUÉ SE UTILIZA: La regla se reutiliza desde la sesión real y puede probarse sin iniciar NextAuth ni una base de datos.
 */
export function hasAdminRole(role: unknown) {
  return role === "ADMIN";
}

/**
 * DESCRIPCIÓN: Comprobación de sesión administrativa.
 * QUÉ HACE: Devuelve la sesión si existe y el rol del usuario es ADMIN; en otro caso devuelve null.
 * PARA QUÉ SE UTILIZA: Las APIs pueden detener una acción sensible con una sola condición.
 */
export async function getAdminSession() {
  const session = await getServerSession(authOptions);

  if (!session || !hasAdminRole(session.user.role)) return null;
  return session;
}

/**
 * DESCRIPCIÓN: Respuesta HTTP reutilizable ante falta de permisos.
 * QUÉ HACE: Devuelve código 403 con un mensaje comprensible.
 * PARA QUÉ SE UTILIZA: Informa al navegador que la identidad actual no puede ejecutar una acción administrativa.
 */
export function unauthorized() {
  return NextResponse.json(
    { message: "No tienes permisos para esta acción." },
    { status: 403 },
  );
}
