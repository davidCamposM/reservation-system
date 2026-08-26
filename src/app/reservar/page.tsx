import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { BookingFlow } from "@/components/booking-flow";
import { SectionHeading } from "@/components/section-heading";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Booking page: loads active catalog data on the server, then lets the client choose a slot. */
export default async function BookingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/ingresar");
  if (session.user.role !== "CUSTOMER") redirect("/admin");

  const services = await prisma.service.findMany({
    where: { active: true },
    include: { professionals: { where: { professional: { active: true } }, include: { professional: true } } },
    orderBy: { name: "asc" },
  });

  // Decimal prices are transformed to numbers because client components accept serializable props only.
  const bookingServices = services.map((service) => ({ ...service, price: Number(service.price) }));

  return (
    <section className="space-y-9">
      <SectionHeading eyebrow="Nueva reserva" title="Reserva tu próxima hora" description="Elige servicio, profesional, fecha y un horario disponible." />
      <BookingFlow services={bookingServices} />
    </section>
  );
}
