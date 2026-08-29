import { ReservationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, unauthorized } from "@/lib/authorization";
import { cancelReservationReminder } from "@/lib/notifications";
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
  const result = statusSchema.safeParse(await request.json());

  // Si el cuerpo de la petición no tiene un estado válido, no se modifica ningún dato.
  if (!result.success) {
    return NextResponse.json({ message: "El estado de la reserva no es válido." }, { status: 400 });
  }

  try {
    /**
     * DESCRIPCIÓN: Actualización protegida del registro de reserva.
     * QUÉ HACE: Guarda el nuevo estado y elimina la fecha de expiración cuando deja de ser pendiente.
     * PARA QUÉ SE UTILIZA: Una reserva confirmada, cancelada o completada ya no depende del temporizador de 15 minutos.
     */
    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        status: result.data.status,
        expiresAt: result.data.status === "PENDING" ? undefined : null,
      },
    });

    // Una reserva anulada no debe conservar un cobro activo ni un recordatorio programado para el cliente.
    if (result.data.status === "CANCELED") {
      await Promise.all([
        prisma.payment.updateMany({
          where: { reservationId: reservation.id, status: "PENDING" },
          data: { status: "EXPIRED" },
        }),
        cancelReservationReminder(reservation.id),
      ]);
    }

    return NextResponse.json({ reservation });
  } catch {
    // Prisma lanza un error si no existe una reserva con el identificador recibido.
    return NextResponse.json({ message: "Reserva no encontrada." }, { status: 404 });
  }
}
