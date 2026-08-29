import { NextResponse } from "next/server";
import { getAdminSession, unauthorized } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

/** Deletes one exceptional availability block. */
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return unauthorized();
  const { id } = await params;
  try { await prisma.timeOff.delete({ where: { id } }); return new NextResponse(null, { status: 204 }); }
  catch { return NextResponse.json({ message: "Bloqueo no encontrado." }, { status: 404 }); }
}
