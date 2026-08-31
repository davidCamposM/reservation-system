import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, unauthorized } from "@/lib/authorization";
import { readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const timeOffSchema = z.object({ professionalId: z.string().min(1), startsAt: z.string().datetime(), endsAt: z.string().datetime(), reason: z.string().trim().max(200).optional() });

/** Creates an exceptional period in which a professional cannot receive bookings. */
export async function POST(request: Request) {
  if (!(await getAdminSession())) return unauthorized();
  const result = timeOffSchema.safeParse(await readJsonBody(request));
  if (!result.success || new Date(result.data.startsAt) >= new Date(result.data.endsAt)) return NextResponse.json({ message: "Bloqueo de agenda inválido." }, { status: 400 });

  try {
    const professional = await prisma.professional.findUnique({ where: { id: result.data.professionalId }, select: { id: true } });
    if (!professional) return NextResponse.json({ message: "Profesional no encontrado." }, { status: 404 });

    const timeOff = await prisma.timeOff.create({ data: { professionalId: result.data.professionalId, startsAt: new Date(result.data.startsAt), endsAt: new Date(result.data.endsAt), reason: result.data.reason || null } });
    return NextResponse.json({ timeOff }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "No fue posible crear el bloqueo. Intenta nuevamente." }, { status: 500 });
  }
}
