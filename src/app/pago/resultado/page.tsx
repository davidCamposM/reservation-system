import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SectionHeading } from "@/components/section-heading";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const paymentMessages = {
  PAID: { title: "Pago aprobado", description: "La reserva fue confirmada y se enviará un correo con el detalle.", color: "text-teal-800", background: "bg-teal-50" },
  FAILED: { title: "Pago no aprobado", description: "La reserva seguirá pendiente mientras el horario no expire. Se puede intentar nuevamente.", color: "text-rose-800", background: "bg-rose-50" },
  EXPIRED: { title: "Pago abandonado o expirado", description: "No se realizó ningún cobro. Se puede volver a intentar mientras la reserva permanezca pendiente.", color: "text-amber-800", background: "bg-amber-50" },
  PENDING: { title: "Pago pendiente", description: "Webpay aún no ha informado un resultado definitivo.", color: "text-slate-800", background: "bg-slate-100" },
} as const;

/**
 * DESCRIPCIÓN: Página de resultado comercial después del retorno de Webpay.
 * QUÉ HACE: Muestra al cliente el estado persistido del pago y protege el resultado para que solo su dueño pueda verlo.
 * PARA QUÉ SE UTILIZA: Separa la devolución técnica de Webpay de una pantalla clara dentro de ReservaPro.
 */
export default async function PaymentResultPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/ingresar");

  const { payment: paymentId } = await searchParams;
  if (!paymentId) {
    return (
      <section className="space-y-6">
        <SectionHeading eyebrow="Pago" title="No se encontró un pago" description="El retorno de Webpay no contenía una transacción válida." />
        <Link className="inline-flex rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white" href="/cuenta">Volver a mi cuenta</Link>
      </section>
    );
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { reservation: { include: { customer: true, professional: true } } },
  });
  if (!payment) redirect("/cuenta");
  if (session.user.role !== "ADMIN" && payment.reservation.customerId !== session.user.id) redirect("/cuenta");

  const message = paymentMessages[payment.status];
  return (
    <section className="max-w-2xl space-y-6">
      <SectionHeading eyebrow="Pago Webpay" title={message.title} description={message.description} />
      <article className={`rounded-2xl p-6 ${message.background} ${message.color}`}>
        <p className="font-bold">{payment.reservation.serviceName}</p>
        <p className="mt-2">Profesional: {payment.reservation.professional.name}</p>
        <p className="mt-2">Monto: ${Number(payment.amount).toLocaleString("es-CL")}</p>
      </article>
      <Link className="inline-flex rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white" href="/cuenta">Ver mis reservas</Link>
    </section>
  );
}
