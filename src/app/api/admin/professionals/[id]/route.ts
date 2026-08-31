import { NextResponse } from "next/server";
import { getAdminSession, unauthorized } from "@/lib/authorization";
import { readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { updateProfessionalSchema } from "@/lib/catalog-validation";
import { saveProfessional } from "@/lib/admin-catalog";
import { catalogErrorResponse } from "@/lib/catalog-api";

type Context = { params: Promise<{ id: string }> };

/** Comprueba permisos y guarda datos y vínculos juntos, sin modificar las reservas históricas. */
export async function PATCH(request: Request, { params }: Context) {
  if (!(await getAdminSession())) return unauthorized();
  const { id } = await params;
  const parsed = updateProfessionalSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return NextResponse.json({ message: "Revisa los datos y las vinculaciones del formulario." }, { status: 400 });
  try { return NextResponse.json(await saveProfessional(parsed.data, id)); }
  catch (error) { return catalogErrorResponse(error); }
}

/** La clave foránea protege registros con reservas: pueden desactivarse pero no eliminarse. */
export async function DELETE(_request: Request, { params }: Context) {
  if (!(await getAdminSession())) return unauthorized();
  const { id } = await params;
  try { await prisma.professional.delete({ where: { id } }); return new NextResponse(null, { status: 204 }); }
  catch (error) { return catalogErrorResponse(error); }
}
