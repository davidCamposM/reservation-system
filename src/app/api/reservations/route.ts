import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { readJsonBody } from "@/lib/http";
import { buildAvailableSlots, chileDateTime, formatChileDate, isoWeekday } from "@/lib/scheduling";
import { prisma } from "@/lib/prisma";
import { isReservationConflict } from "@/lib/reservation-errors";

const reservationSchema = z.object({ serviceId: z.string().min(1), professionalId: z.string().min(1), startsAt: z.string().datetime() });

/** Creates a short-lived pending reservation for the signed-in customer. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Debes iniciar sesión para reservar." }, { status: 401 });
  if (session.user.role !== "CUSTOMER") return NextResponse.json({ message: "Las cuentas administrativas no pueden crear reservas." }, { status: 403 });

  const parsed = reservationSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return NextResponse.json({ message: "Datos de reserva inválidos." }, { status: 400 });

  try {
    const { serviceId, professionalId } = parsed.data;
    const startsAt = new Date(parsed.data.startsAt);
    if (startsAt <= new Date()) return NextResponse.json({ message: "Debe elegirse un horario futuro." }, { status: 400 });
    const date = formatChileDate(startsAt);

    const service = await prisma.service.findFirst({ where: { id: serviceId, active: true } });
    const professional = await prisma.professional.findFirst({ where: { id: professionalId, active: true } });
    const connection = await prisma.serviceProfessional.findUnique({ where: { serviceId_professionalId: { serviceId, professionalId } } });
    if (!service || !professional || !connection) return NextResponse.json({ message: "El servicio o profesional ya no está disponible." }, { status: 409 });

    await prisma.reservation.updateMany({ where: { status: "PENDING", expiresAt: { lt: new Date() } }, data: { status: "CANCELED" } });

    const dayStart = chileDateTime(date, "00:00");
    const dayEnd = chileDateTime(date, "23:59");
    const [windows, blockedRanges, occupiedRanges] = await Promise.all([
      prisma.weeklyAvailability.findMany({ where: { professionalId, weekday: isoWeekday(date) } }),
      prisma.timeOff.findMany({ where: { professionalId, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } } }),
      prisma.reservation.findMany({ where: { professionalId, status: { in: ["PENDING", "CONFIRMED"] }, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } }, select: { startsAt: true, endsAt: true } }),
    ]);

    const availableSlots = buildAvailableSlots({ date, durationMins: service.durationMins, windows, blockedRanges, occupiedRanges });
    const slot = availableSlots.find((available) => available.startsAt === startsAt.toISOString());
    if (!slot) return NextResponse.json({ message: "Ese horario ya no está disponible. Elige otro." }, { status: 409 });

    const reservation = await prisma.reservation.create({
      data: {
        customerId: session.user.id,
        serviceId,
        professionalId,
        startsAt,
        endsAt: new Date(slot.endsAt),
        expiresAt: new Date(Date.now() + 15 * 60_000),
        serviceName: service.name,
        durationMins: service.durationMins,
        price: service.price,
        status: "PENDING",
      },
    });
    return NextResponse.json({ reservation }, { status: 201 });
  } catch (error) {
    // PostgreSQL exclusion constraint is the final protection if another request takes the slot at the same instant.
    if (isReservationConflict(error)) {
      return NextResponse.json({ message: "Ese horario acaba de ser reservado. Elige otro." }, { status: 409 });
    }
    return NextResponse.json({ message: "No fue posible crear la reserva. Intenta nuevamente." }, { status: 500 });
  }
}
