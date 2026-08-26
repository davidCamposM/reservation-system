/**
 * DESCRIPCIÓN: Utilidades reutilizables para proteger acciones administrativas.
 * QUÉ HACE: Lee la sesión actual y construye una respuesta HTTP estándar cuando faltan permisos.
 * PARA QUÉ SE UTILIZA: Las rutas API de servicios y profesionales comparten la misma regla de autorización.
 */
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

/**
 * DESCRIPCIÓN: Comprobación de sesión administrativa.
 * QUÉ HACE: Devuelve la sesión si existe y el rol del usuario es ADMIN; en otro caso devuelve null.
 * PARA QUÉ SE UTILIZA: Las APIs pueden detener una acción sensible con una sola condición.
 */
export async function getAdminSession() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") return null;
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
