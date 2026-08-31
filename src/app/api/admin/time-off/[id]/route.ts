import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAdminSession, unauthorized } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

/** Deletes one exceptional availability block. */
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return unauthorized();
  const { id } = await params;
  try { await prisma.timeOff.delete({ where: { id } }); return new NextResponse(null, { status: 204 }); }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ message: "Bloqueo no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ message: "No fue posible eliminar el bloqueo. Intenta nuevamente." }, { status: 500 });
  }
}
