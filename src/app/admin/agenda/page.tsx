import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ScheduleManager } from "@/components/schedule-manager";
import { SectionHeading } from "@/components/section-heading";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DESCRIPCIÓN: Pantalla administrativa para horarios, bloqueos y estados de reservas.
 * QUÉ HACE: Verifica el rol, consulta los datos necesarios y los entrega al componente interactivo.
 * PARA QUÉ SE UTILIZA: Centraliza la operación diaria de la agenda sin exponerla a clientes.
 */
export default async function AdminSchedulePage() {
  const session = await getServerSession(authOptions);

  // Las mismas reglas que en /admin protegen esta subpágina de la agenda.
  if (!session) redirect("/ingresar");
  if (session.user.role !== "ADMIN") redirect("/cuenta");

  /**
   * DESCRIPCIÓN: Carga paralela de agenda y profesionales.
   * QUÉ HACE: Lee horarios semanales, bloqueos excepcionales y las últimas reservas junto con sus relaciones.
   * PARA QUÉ SE UTILIZA: La interfaz recibe una fotografía completa del estado inicial sin hacer varias cargas en cascada.
   */
  const [professionals, reservations] = await Promise.all([
    prisma.professional.findMany({
      orderBy: { name: "asc" },
      include: {
        availability: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
        timeOff: { orderBy: { startsAt: "asc" } },
      },
    }),
    prisma.reservation.findMany({
      orderBy: { startsAt: "desc" },
      take: 30,
      include: {
        customer: { select: { name: true, email: true } },
        professional: { select: { name: true } },
      },
    }),
  ]);

  return (
    <section className="space-y-8">
      <SectionHeading
        eyebrow="Administración"
        title="Agenda y disponibilidad"
        description="Define la jornada de cada profesional, bloquea excepciones y administra el estado de las reservas."
      />

      {/** Convierte fechas de Prisma a texto ISO para enviarlas de forma segura al componente cliente. */}
      <ScheduleManager
        initialProfessionals={professionals.map((professional) => ({
          // Solo se entregan las propiedades que la interfaz necesita. Así no se filtran datos innecesarios.
          id: professional.id,
          name: professional.name,
          active: professional.active,
          availability: professional.availability,
          timeOff: professional.timeOff.map((block) => ({
            id: block.id,
            professionalId: block.professionalId,
            startsAt: block.startsAt.toISOString(),
            endsAt: block.endsAt.toISOString(),
            reason: block.reason,
          })),
        }))}
        initialReservations={reservations.map((reservation) => ({
          id: reservation.id,
          status: reservation.status,
          serviceName: reservation.serviceName,
          startsAt: reservation.startsAt.toISOString(),
          endsAt: reservation.endsAt.toISOString(),
          customer: reservation.customer,
          professional: reservation.professional,
        }))}
      />
    </section>
  );
}
