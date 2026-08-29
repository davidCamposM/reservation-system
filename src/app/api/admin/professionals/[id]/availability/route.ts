import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, unauthorized } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const availabilitySchema = z.object({ windows: z.array(z.object({ weekday: z.number().int().min(1).max(7), startTime: timeSchema, endTime: timeSchema })).max(14) });

/** Replaces a professional's weekly hours with the list configured by an administrator. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return unauthorized();
  const { id } = await params;
  const result = availabilitySchema.safeParse(await request.json());
  if (!result.success || result.data.windows.some((window) => window.startTime >= window.endTime)) return NextResponse.json({ message: "Horario semanal inválido." }, { status: 400 });

  const professional = await prisma.professional.findUnique({ where: { id }, select: { id: true } });
  if (!professional) return NextResponse.json({ message: "Profesional no encontrado." }, { status: 404 });

  const availability = await prisma.$transaction(async (transaction) => {
    await transaction.weeklyAvailability.deleteMany({ where: { professionalId: id } });
    if (!result.data.windows.length) return [];
    await transaction.weeklyAvailability.createMany({ data: result.data.windows.map((window) => ({ ...window, professionalId: id })) });
    return transaction.weeklyAvailability.findMany({ where: { professionalId: id }, orderBy: [{ weekday: "asc" }, { startTime: "asc" }] });
  });
  return NextResponse.json({ availability });
}
