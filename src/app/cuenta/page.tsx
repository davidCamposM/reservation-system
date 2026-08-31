import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SectionHeading } from "@/components/section-heading";
import { PaymentStartButton } from "@/components/payment-start-button";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DESCRIPCIÓN: Textos legibles de los estados internos de una reserva.
 * QUÉ HACE: Traduce los valores guardados por Prisma a términos que entiende un cliente.
 * PARA QUÉ SE UTILIZA: La interfaz nunca debe exponer etiquetas técnicas como PENDING o COMPLETED.
 */
const reservationStatusLabels = {
  PENDING: "Pendiente de confirmación",
  CONFIRMED: "Confirmada",
  CANCELED: "Cancelada",
  COMPLETED: "Completada",
};

/**
 * DESCRIPCIÓN: Etiquetas visibles para el estado de cobro de una reserva.
 * QUÉ HACE: Traduce los valores internos de Payment a textos que el cliente puede comprender.
 * PARA QUÉ SE UTILIZA: Diferencia una reserva pendiente de la situación concreta de su pago.
 */
const paymentStatusLabels = {
  PENDING: "Pago pendiente",
  PAID: "Pago aprobado",
  FAILED: "Pago rechazado",
  EXPIRED: "Pago expirado",
};

/**
 * DESCRIPCIÓN: Página privada de reservas del cliente.
 * QUÉ HACE: Obtiene la sesión, consulta únicamente las reservas del cliente autenticado y las muestra en orden de fecha.
 * PARA QUÉ SE UTILIZA: El cliente puede revisar el resultado de una reserva sin acceder al panel administrativo.
 */
export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  // Un visitante sin sesión debe ingresar antes de consultar información privada.
  if (!session) redirect("/ingresar");

  // El panel administrativo tiene una vista propia; así no se mezcla la experiencia de cliente con sus permisos de gestión.
  if (session.user.role !== "CUSTOMER") redirect("/admin");

  /**
   * DESCRIPCIÓN: Consulta aislada de reservas del cliente.
   * QUÉ HACE: Filtra por customerId usando el id de la sesión e incluye al profesional y pago para mostrar sus estados.
   * PARA QUÉ SE UTILIZA: Impide que un cliente pueda ver por accidente reservas pertenecientes a otra persona.
   */
  const reservations = await prisma.reservation.findMany({
    where: { customerId: session.user.id },
    include: { professional: true, payment: true },
    orderBy: { startsAt: "asc" },
  });

  return (
    <section className="space-y-8">
      <SectionHeading
        eyebrow="Mi cuenta"
        title={`Hola, ${session.user.name?.split(" ")[0] ?? "cliente"}`}
        description="Revisa el estado y horario de tus reservas."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-4">
          {reservations.length > 0 ? (
            reservations.map((reservation) => (
              <article key={reservation.id} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
                      {reservationStatusLabels[reservation.status]}
                    </span>
                    <h2 className="mt-4 text-xl font-bold">{reservation.serviceName}</h2>
                  <p className="mt-1 text-slate-600">Con {reservation.professional.name}</p>
                  {reservation.payment && (
                    <p className="mt-3 text-sm font-semibold text-slate-600">
                      {paymentStatusLabels[reservation.payment.status]}
                    </p>
                  )}
                  </div>
                  <p className="text-right text-sm font-semibold text-slate-500">
                    {reservation.startsAt.toLocaleDateString("es-CL", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      timeZone: "America/Santiago",
                    })}
                    <br />
                    <span className="text-lg text-slate-950">
                      {reservation.startsAt.toLocaleTimeString("es-CL", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "America/Santiago",
                      })}
                    </span>
                  </p>
                </div>
                {reservation.status === "PENDING" && reservation.expiresAt && reservation.expiresAt > new Date() && reservation.payment?.status !== "PAID" && (
                  <PaymentStartButton reservationId={reservation.id} />
                )}
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <h2 className="text-xl font-bold">Aún no tienes reservas</h2>
              <p className="mt-2 text-slate-600">Cuando agendes una atención, aparecerá aquí.</p>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl bg-teal-50 p-6">
          <p className="font-bold text-slate-950">¿Necesitas una hora?</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Agenda una nueva atención en pocos pasos.</p>
          <Link href="/reservar" className="mt-5 inline-flex rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-bold text-white">
            Reservar ahora
          </Link>
        </aside>
      </div>
    </section>
  );
}
