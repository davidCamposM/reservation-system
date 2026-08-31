import { NextResponse } from "next/server";
import { getAdminSession, unauthorized } from "@/lib/authorization";
import { readJsonBody } from "@/lib/http";
import { serviceSchema } from "@/lib/catalog-validation";
import { saveService } from "@/lib/admin-catalog";
import { catalogErrorResponse } from "@/lib/catalog-api";


/** Comprueba permisos y guarda datos y vínculos juntos, sin modificar las reservas históricas. */
export async function POST(request: Request) {
  if (!(await getAdminSession())) return unauthorized();

  const parsed = serviceSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return NextResponse.json({ message: "Revisa los datos y las vinculaciones del formulario." }, { status: 400 });
  try { return NextResponse.json(await saveService(parsed.data), { status: 201 }); }
  catch (error) { return catalogErrorResponse(error); }
}
