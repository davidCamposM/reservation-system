import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAvailableSlots, chileDateTime, isValidCalendarDate, isoWeekday } from "@/lib/scheduling";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  serviceId: z.string().min(1),
  professionalId: z.string().min(1),
  date: z.string().refine(isValidCalendarDate),
});

/** Returns free slots for one service, professional and local Chilean date. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return NextResponse.json({ message: "Consulta de disponibilidad inválida." }, { status: 400 });

  try {
    const { serviceId, professionalId, date } = parsed.data;
    const [service, professional, connection] = await Promise.all([
      prisma.service.findFirst({ where: { id: serviceId, active: true } }),
      prisma.professional.findFirst({ where: { id: professionalId, active: true } }),
      prisma.serviceProfessional.findUnique({ where: { serviceId_professionalId: { serviceId, professionalId } } }),
    ]);

    if (!service || !professional || !connection) return NextResponse.json({ message: "El servicio o profesional no está disponible." }, { status: 404 });

    // A pending booking only blocks a slot for 15 minutes. Expired pending records become cancelled.
    await prisma.reservation.updateMany({ where: { status: "PENDING", expiresAt: { lt: new Date() } }, data: { status: "CANCELED" } });

    const dayStart = chileDateTime(date, "00:00");
    const dayEnd = chileDateTime(date, "23:59");
    const [windows, blockedRanges, occupiedRanges] = await Promise.all([
      prisma.weeklyAvailability.findMany({ where: { professionalId, weekday: isoWeekday(date) } }),
      prisma.timeOff.findMany({ where: { professionalId, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } } }),
      prisma.reservation.findMany({
        where: { professionalId, status: { in: ["PENDING", "CONFIRMED"] }, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } },
        select: { startsAt: true, endsAt: true },
      }),
    ]);

    const slots = buildAvailableSlots({ date, durationMins: service.durationMins, windows, blockedRanges, occupiedRanges });
    return NextResponse.json({ slots: slots.filter((slot) => new Date(slot.startsAt) > new Date()) });
  } catch {
    return NextResponse.json({ message: "No fue posible consultar los horarios disponibles. Intenta nuevamente." }, { status: 500 });
  }
}
