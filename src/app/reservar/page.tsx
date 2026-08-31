import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { BookingFlow } from "@/components/booking-flow";
import { SectionHeading } from "@/components/section-heading";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicServiceWhere } from "@/lib/public-catalog";

/** Booking page: loads active catalog data on the server, then lets the client choose a slot. */
export default async function BookingPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/ingresar?callbackUrl=${encodeURIComponent(`/reservar${service ? `?service=${encodeURIComponent(service)}` : ""}`)}`);
  if (session.user.role !== "CUSTOMER") redirect("/admin");

  const services = await prisma.service.findMany({
    where: publicServiceWhere,
    include: { professionals: { where: { professional: { active: true } }, include: { professional: true } } },
    orderBy: { name: "asc" },
  });

  // Decimal prices are transformed to numbers because client components accept serializable props only.
  const bookingServices = services.map((service) => ({ ...service, price: Number(service.price) }));

  return (
    <section className="space-y-9">
      <SectionHeading eyebrow="Nueva reserva" title="Reserva tu próxima hora" description="Elige servicio, profesional, fecha y un horario disponible." />
      <p className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">Demostración: Webpay opera en ambiente de integración. Deben utilizarse únicamente tarjetas de prueba; no se realizan cobros reales.</p>
      {bookingServices.length ? <BookingFlow services={bookingServices} initialServiceId={service} /> : <p className="admin-card text-slate-600">El negocio todavía no ha publicado servicios con profesionales disponibles.</p>}
    </section>
  );
}
