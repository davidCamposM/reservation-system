import Link from "next/link";
import { CalendarDays, Clock3, Users } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { prisma } from "@/lib/prisma";
import { publicServiceWhere } from "@/lib/public-catalog";

export const dynamic = "force-dynamic";

/** La vitrina utiliza el mismo catálogo publicado que el flujo de reservas, no datos ficticios. */
export default async function CataloguePage() {
  const services = await prisma.service.findMany({
    where: publicServiceWhere, orderBy: { name: "asc" },
    include: { professionals: { where: { professional: { active: true } }, include: { professional: { select: { name: true, _count: { select: { availability: true } } } } } } },
  });
  return <section className="space-y-10">
    <SectionHeading eyebrow="Servicios" title="Encuentra el momento para ti" description="Servicios y profesionales del negocio, con precios y duración claros antes de reservar." />
    {!services.length && <div className="admin-card text-slate-600">El catálogo se está preparando. Pronto habrá servicios disponibles para reservar.</div>}
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{services.map((service) => {
      const hasHours = service.professionals.some((link) => link.professional._count.availability > 0);
      return <article key={service.id} className="admin-card flex flex-col gap-4">
        <span className="flex items-center gap-2 text-sm font-bold text-brand-deep"><Clock3 size={18} />{service.durationMins} minutos</span>
        <h2 className="text-xl font-extrabold">{service.name}</h2>
        <p className="text-sm leading-6 text-slate-600">{service.description || "Atención personalizada con el equipo del negocio."}</p>
        <p className="flex items-start gap-2 text-sm text-slate-600"><Users size={18} className="shrink-0" />{service.professionals.map((link) => link.professional.name).join(", ")}</p>
        <p className="text-xl font-extrabold">${Number(service.price).toLocaleString("es-CL")} CLP</p>
        {hasHours ? <Link href={`/reservar?service=${encodeURIComponent(service.id)}`} className="ui-button ui-button-primary mt-auto"><CalendarDays size={18} />Elegir horario</Link> : <p className="mt-auto rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Este servicio aún no tiene jornada disponible. El negocio está preparando sus horarios.</p>}
      </article>;
    })}</div>
  </section>;
}
