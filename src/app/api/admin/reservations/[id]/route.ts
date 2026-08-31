import { Prisma, ReservationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, unauthorized } from "@/lib/authorization";
import { readJsonBody } from "@/lib/http";
import { cancelReservationReminder, scheduleReservationReminder } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

/**
 * DESCRIPCIÓN: Regla de validación para los estados que el administrador puede asignar.
 * QUÉ HACE: Acepta únicamente los cuatro estados definidos en el modelo ReservationStatus.
 * PARA QUÉ SE UTILIZA: Evita que una petición altere una reserva con un estado inexistente.
 */
const statusSchema = z.object({
  status: z.nativeEnum(ReservationStatus),
});

/**
 * DESCRIPCIÓN: Endpoint para actualizar el estado de una reserva.
 * QUÉ HACE: Comprueba que la sesión sea administrativa y cambia el estado de la reserva indicada por su id.
 * PARA QUÉ SE UTILIZA: Permite confirmar, cancelar o marcar como completada una atención desde la agenda.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Solo un administrador puede gestionar reservas de otros clientes.
  if (!(await getAdminSession())) return unauthorized();

  const { id } = await params;
  const result = statusSchema.safeParse(await readJsonBody(request));

  // Si el cuerpo de la petición no tiene un estado válido, no se modifica ningún dato.
  if (!result.success) {
    return NextResponse.json({ message: "El estado de la reserva no es válido." }, { status: 400 });
  }

  let reservation;

  try {
    /**
     * DESCRIPCIÓN: Actualización protegida del registro de reserva.
     * QUÉ HACE: Guarda el nuevo estado y elimina la fecha de expiración cuando deja de ser pendiente.
     * PARA QUÉ SE UTILIZA: Una reserva confirmada, cancelada o completada ya no depende del temporizador de 15 minutos.
     */
    reservation = await prisma.reservation.update({
      where: { id },
      data: {
        status: result.data.status,
        expiresAt: result.data.status === "PENDING" ? undefined : null,
      },
    });

  } catch (error) {
    // P2025 identifica con precisión un id inexistente; los demás errores no deben mostrarse como si la reserva no existiera.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ message: "Reserva no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ message: "No fue posible actualizar la reserva. Intenta nuevamente." }, { status: 500 });
  }

  // Una reserva anulada no debe conservar un cobro activo ni un recordatorio programado para el cliente.
  // Estas tareas secundarias no revierten el cambio principal si un proveedor externo falla después de cancelar la reserva.
  if (result.data.status === "CANCELED") {
    await Promise.allSettled([
      prisma.payment.updateMany({
        where: { reservationId: reservation.id, status: "PENDING" },
        data: { status: "EXPIRED" },
      }),
      cancelReservationReminder(reservation.id),
    ]);
  }

  if (result.data.status === "CONFIRMED") {
    const details = await prisma.reservation.findUnique({ where: { id }, include: { customer: true, professional: true, payment: true } });
    if (details) await Promise.allSettled([scheduleReservationReminder(details)]);
  }
  return NextResponse.json({ reservation });
}
