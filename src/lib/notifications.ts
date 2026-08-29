import { Prisma } from "@prisma/client";
import { Resend } from "resend";
import { BUSINESS_TIME_ZONE } from "@/lib/scheduling";
import { prisma } from "@/lib/prisma";

type ReservationEmailData = Prisma.ReservationGetPayload<{
  include: { customer: true; professional: true; payment: true };
}>;

const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "ReservaPro <onboarding@resend.dev>";

/**
 * DESCRIPCIÓN: Acceso opcional a Resend.
 * QUÉ HACE: Crea el cliente solo cuando RESEND_API_KEY está configurada.
 * PARA QUÉ SE UTILIZA: La aplicación puede funcionar en localhost sin clave, mientras que una clave válida habilita correos reales.
 */
function getResendClient() {
  return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
}

/** Evita que texto almacenado por usuarios se interprete como HTML dentro de un correo. */
function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

/** Formatea una fecha de reserva para el horario de Chile dentro de los mensajes enviados. */
function formatReservationDate(date: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(date);
}

/** Construye el contenido compartido de una reserva para mensajes de confirmación y recordatorio. */
function reservationDetails(reservation: ReservationEmailData) {
  return `<ul>
    <li><strong>Servicio:</strong> ${escapeHtml(reservation.serviceName)}</li>
    <li><strong>Profesional:</strong> ${escapeHtml(reservation.professional.name)}</li>
    <li><strong>Fecha y hora:</strong> ${escapeHtml(formatReservationDate(reservation.startsAt))}</li>
    <li><strong>Duración:</strong> ${reservation.durationMins} minutos</li>
  </ul>`;
}

/**
 * DESCRIPCIÓN: Registro de un correo que Resend aceptó para envío.
 * QUÉ HACE: Crea o actualiza NotificationLog con el identificador que devuelve el proveedor.
 * PARA QUÉ SE UTILIZA: Impide reenviar la misma categoría de notificación para una reserva y permite cancelar recordatorios programados.
 */
async function recordNotification({ reservationId, type, recipient, providerId, sentAt, scheduledFor }: {
  reservationId: string;
  type: string;
  recipient: string;
  providerId?: string;
  sentAt?: Date;
  scheduledFor?: Date;
}) {
  await prisma.notificationLog.upsert({
    where: { reservationId_type: { reservationId, type } },
    create: { reservationId, type, recipient, providerId, sentAt, scheduledFor },
    update: { recipient, providerId, sentAt, scheduledFor },
  });
}

/**
 * DESCRIPCIÓN: Correo de resultado del pago.
 * QUÉ HACE: Envía un mensaje de aprobación o rechazo cuando Resend está configurado y registra el resultado.
 * PARA QUÉ SE UTILIZA: Informa al cliente del resultado comercial fuera de la pantalla de retorno de Webpay.
 */
export async function sendPaymentResultEmail(reservation: ReservationEmailData, approved: boolean) {
  const resend = getResendClient();
  if (!resend) return { skipped: true };

  const subject = approved
    ? "Pago aprobado y reserva confirmada | ReservaPro"
    : "No fue posible aprobar el pago | ReservaPro";
  const html = approved
    ? `<h1>Reserva confirmada</h1><p>El pago fue aprobado correctamente.</p>${reservationDetails(reservation)}`
    : `<h1>Pago no aprobado</h1><p>La reserva continúa pendiente mientras su horario no expire. Se puede intentar pagar nuevamente desde la reserva.</p>${reservationDetails(reservation)}`;

  try {
    const response = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: [reservation.customer.email],
      subject,
      html,
      headers: { "Idempotency-Key": `reservapro-${reservation.id}-${approved ? "payment-approved" : "payment-failed"}` },
    });

    if (response.error || !response.data?.id) return { skipped: false, error: response.error };

    await recordNotification({
      reservationId: reservation.id,
      type: approved ? "PAYMENT_APPROVED" : "PAYMENT_FAILED",
      recipient: reservation.customer.email,
      providerId: response.data.id,
      sentAt: new Date(),
    });
    return { skipped: false, providerId: response.data.id };
  } catch {
    // Un fallo de proveedor no debe revertir un pago confirmado por Webpay.
    return { skipped: false, error: "No fue posible enviar el correo." };
  }
}

/**
 * DESCRIPCIÓN: Programación del recordatorio previo a una atención.
 * QUÉ HACE: Solicita a Resend enviar un correo exactamente 24 horas antes del inicio de una reserva confirmada.
 * PARA QUÉ SE UTILIZA: El recordatorio permanece programado aun cuando el servidor local deje de ejecutarse.
 */
export async function scheduleReservationReminder(reservation: ReservationEmailData) {
  const resend = getResendClient();
  if (!resend) return { skipped: true };

  const reminderAt = new Date(reservation.startsAt.getTime() - 24 * 60 * 60 * 1000);
  if (reminderAt <= new Date()) return { skipped: true, reason: "La reserva ocurre en menos de 24 horas." };

  const existing = await prisma.notificationLog.findUnique({
    where: { reservationId_type: { reservationId: reservation.id, type: "RESERVATION_REMINDER_24H" } },
  });
  if (existing) return { skipped: true, reason: "El recordatorio ya fue programado." };

  try {
    const response = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: [reservation.customer.email],
      subject: "Recordatorio: tu reserva es mañana | ReservaPro",
      html: `<h1>Recordatorio de reserva</h1><p>La atención está programada para las próximas 24 horas.</p>${reservationDetails(reservation)}`,
      scheduledAt: reminderAt.toISOString(),
      headers: { "Idempotency-Key": `reservapro-${reservation.id}-reminder-24h` },
    });

    if (response.error || !response.data?.id) return { skipped: false, error: response.error };

    await recordNotification({
      reservationId: reservation.id,
      type: "RESERVATION_REMINDER_24H",
      recipient: reservation.customer.email,
      providerId: response.data.id,
      scheduledFor: reminderAt,
    });
    return { skipped: false, providerId: response.data.id };
  } catch {
    return { skipped: false, error: "No fue posible programar el recordatorio." };
  }
}

/**
 * DESCRIPCIÓN: Cancelación de un recordatorio programado.
 * QUÉ HACE: Pide a Resend cancelar el correo pendiente y elimina el registro local para evitar que quede asociado a una reserva cancelada.
 * PARA QUÉ SE UTILIZA: Evita enviar recordatorios de atenciones que el administrador anuló antes de su fecha.
 */
export async function cancelReservationReminder(reservationId: string) {
  const reminder = await prisma.notificationLog.findUnique({
    where: { reservationId_type: { reservationId, type: "RESERVATION_REMINDER_24H" } },
  });
  if (!reminder) return;

  const resend = getResendClient();
  if (resend && reminder.providerId) {
    try {
      await resend.emails.cancel(reminder.providerId);
    } catch {
      // Si ya fue enviado o el proveedor no puede cancelarlo, se conserva la cancelación funcional de la reserva.
    }
  }

  await prisma.notificationLog.delete({ where: { id: reminder.id } });
}
