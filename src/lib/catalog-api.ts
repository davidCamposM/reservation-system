import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { CatalogError } from "@/lib/admin-catalog";

/** Traduce errores del catálogo sin exponer consultas, credenciales ni detalles de PostgreSQL. */
export function catalogErrorResponse(error: unknown) {
  if (error instanceof CatalogError) return NextResponse.json({ message: error.message }, { status: error.status });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return NextResponse.json({ message: "El registro ya no existe." }, { status: 404 });
    if (error.code === "P2003") return NextResponse.json({ message: "El registro posee reservas. Puede desactivarse, pero no eliminarse." }, { status: 409 });
    if (["P2002", "P2034"].includes(error.code)) return NextResponse.json({ message: "El catálogo cambió durante la operación. Actualiza la página e intenta nuevamente." }, { status: 409 });
  }
  return NextResponse.json({ message: "No fue posible guardar el catálogo. Intenta nuevamente." }, { status: 500 });
}
