import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AdminManager } from "@/components/admin-manager";
import { MetricsDashboard } from "@/components/metrics-dashboard";
import { SectionHeading } from "@/components/section-heading";
import { getDashboardMetrics } from "@/lib/admin-metrics";
import { getAdminCatalog } from "@/lib/admin-catalog";
import { authOptions } from "@/lib/auth";

/** Comprueba el rol en el servidor y entrega solo los datos necesarios al espacio de gestión. */
export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/ingresar");
  if (session.user.role !== "ADMIN") redirect("/cuenta");
  const [catalog, metrics] = await Promise.all([getAdminCatalog(), getDashboardMetrics({ period: "THIS_MONTH" })]);
  return <section className="space-y-8">
    <SectionHeading eyebrow="Administración" title="El negocio, en orden" description="Servicios, equipo y resultados conectados en un solo espacio." />
    <Link href="/admin/agenda" className="route-control"><CalendarDays size={18} /> Agenda y reservas</Link>
    <AdminManager initialCatalog={catalog}><MetricsDashboard initialMetrics={metrics} /></AdminManager>
  </section>;
}
