import { Prisma } from "@prisma/client";
import { Resend, type CreateEmailOptions } from "resend";
import { BUSINESS_TIME_ZONE } from "@/lib/scheduling";
import { prisma } from "@/lib/prisma";
import { reminderWindow, requiresReconciliation, retryAt } from "@/lib/notification-policy";

type ReservationEmailData = Prisma.ReservationGetPayload<{ include: { customer: true; professional: true; payment: true } }>;
const REMINDER = "RESERVATION_REMINDER_24H";
const include = { customer: true, professional: true, payment: true } as const;

/** La instancia puede sustituirse en pruebas; en previews no se envían correos reales. */
export function getResendClient() {
  return process.env.RESEND_API_KEY && process.env.VERCEL_ENV !== "preview" ? new Resend(process.env.RESEND_API_KEY) : null;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function details(reservation: ReservationEmailData) {
  const date = new Intl.DateTimeFormat("es-CL", { dateStyle: "full", timeStyle: "short", timeZone: BUSINESS_TIME_ZONE }).format(reservation.startsAt);
  return `<ul><li>Servicio: ${escapeHtml(reservation.serviceName)}</li><li>Profesional: ${escapeHtml(reservation.professional.name)}</li><li>Fecha: ${escapeHtml(date)}</li><li>Duración: ${reservation.durationMins} minutos</li></ul>`;
}

/** La carga se congela al encolar: los reintentos con la misma clave llevan exactamente el mismo correo. */
async function enqueue(reservation: ReservationEmailData, type: string) {
  const reminder = type === REMINDER;
  const window = reminderWindow(reservation.startsAt);
  const approved = type === "PAYMENT_APPROVED";
  const payload = {
    from: process.env.RESEND_FROM_EMAIL || "ReservaPro <onboarding@resend.dev>",
    to: [reservation.customer.email],
    subject: reminder ? "Recordatorio: tu reserva es mañana | ReservaPro" : approved ? "Pago aprobado y reserva confirmada | ReservaPro" : "Pago no aprobado | ReservaPro",
    html: `<h1>${reminder ? "Recordatorio de reserva" : approved ? "Reserva confirmada" : "Pago no aprobado"}</h1>${details(reservation)}<p>Webpay funciona en ambiente de integración: no corresponde a un cobro real.</p>`,
    ...(reminder ? { scheduledAt: window.scheduledFor.toISOString() } : {}),
  };
  const skipped = reminder && window.action === "skip";
  return prisma.notificationLog.upsert({
    where: { reservationId_type: { reservationId: reservation.id, type } },
    create: {
      reservationId: reservation.id, type, recipient: reservation.customer.email,
      payload, status: skipped ? "SKIPPED" : "PENDING",
      scheduledFor: reminder ? window.scheduledFor : null,
      nextAttemptAt: skipped ? null : reminder && window.action === "defer" ? new Date(window.scheduledFor.getTime() - 30 * 86_400_000) : new Date(),
    }, update: {},
  });
}

/** Un bloqueo con vencimiento evita que dos ejecuciones envíen simultáneamente la misma notificación. */
export async function processNotification(id: string, resend = getResendClient()) {
  if (!resend) return { skipped: true };
  const now = new Date();
  const claimed = await prisma.notificationLog.updateMany({
    where: { id, status: { in: ["PENDING", "FAILED", "PROCESSING"] }, attempts: { lt: 5 },
      nextAttemptAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] },
    data: { status: "PROCESSING", leaseUntil: new Date(now.getTime() + 120_000), attempts: { increment: 1 } },
  });
  if (!claimed.count) return { skipped: true };
  const log = await prisma.notificationLog.findUniqueOrThrow({ where: { id }, include: { reservation: { include } } });
  const finish = (data: Prisma.NotificationLogUpdateInput) => prisma.notificationLog.update({ where: { id }, data: { leaseUntil: null, ...data } });
  try {
    if (log.providerId) {
      await finish({ status: log.type === REMINDER ? "SCHEDULED" : "SENT", nextAttemptAt: null });
      if (log.type === REMINDER && (log.cancelRequested || log.reservation.status !== "CONFIRMED")) await cancelReservationReminder(log.reservationId, resend);
      return { skipped: true };
    }
    if (!log.uncertainSince && (log.cancelRequested || log.type === REMINDER && log.reservation.status !== "CONFIRMED" || log.type === "PAYMENT_FAILED" && log.reservation.payment?.status === "PAID")) {
      await finish({ status: "CANCELED", nextAttemptAt: null });
      return { skipped: true };
    }
    if (requiresReconciliation(log.uncertainSince)) {
      await finish({ status: "FAILED", nextAttemptAt: null, lastError: "REQUIRES_RECONCILIATION: comprobar el proveedor antes de reenviar." });
      return { skipped: true };
    }
    if (log.type === REMINDER && !log.uncertainSince) {
      const window = reminderWindow(log.reservation.startsAt);
      if (window.action !== "schedule") {
        await finish({ status: window.action === "skip" ? "SKIPPED" : "PENDING", nextAttemptAt: window.action === "skip" ? null : new Date(window.scheduledFor.getTime() - 30 * 86_400_000) });
        return { skipped: true };
      }
    }
    if (!log.payload) {
      await finish({ status: "FAILED", nextAttemptAt: null, lastError: "Carga ausente; requiere revisión del historial anterior." });
      return { skipped: true };
    }

    // Se registra incertidumbre ANTES de la llamada: un corte después del envío no habilita duplicados al día siguiente.
    await prisma.notificationLog.update({ where: { id }, data: { uncertainSince: log.uncertainSince ?? now } });
    const response = await resend.emails.send(log.payload as unknown as CreateEmailOptions, { idempotencyKey: `reservapro/${id}` });
    if (response.error || !response.data?.id) {
      const definitelyRejected = ["validation_error", "missing_required_field", "invalid_api_key", "rate_limit_exceeded", "restricted_api_key", "invalid_from_address"].includes(response.error?.name ?? "");
      await finish({ status: "FAILED", ...(definitelyRejected ? { uncertainSince: null } : {}), nextAttemptAt: log.attempts < 5 ? retryAt(log.attempts) : null, lastError: "El proveedor no confirmó la solicitud de correo." });
      return { skipped: false, error: true };
    }
    await finish({
      providerId: response.data.id, status: log.type === REMINDER ? "SCHEDULED" : "SENT",
      sentAt: log.type === REMINDER ? null : new Date(), uncertainSince: null, lastError: null, nextAttemptAt: null,
    });
    // Si una cancelación coincidió con la solicitud de envío, se cancela ahora el identificador recién recibido.
    if (log.type === REMINDER) {
      const latest = await prisma.notificationLog.findUniqueOrThrow({ where: { id }, include: { reservation: { select: { status: true } } } });
      if (latest.cancelRequested || latest.reservation.status !== "CONFIRMED") await cancelReservationReminder(log.reservationId, resend);
    }
    return { skipped: false, providerId: response.data.id };
  } catch {
    await finish({ status: "FAILED", nextAttemptAt: retryAt(log.attempts), lastError: "Resultado de envío incierto. Se conserva la clave de idempotencia." });
    return { skipped: false, error: true };
  }
}

/** Los fallos de correo nunca cambian el estado comercial confirmado de un pago. */
export async function sendPaymentResultEmail(reservation: ReservationEmailData, approved: boolean) {
  try { return await processNotification((await enqueue(reservation, approved ? "PAYMENT_APPROVED" : "PAYMENT_FAILED")).id); }
  catch { console.error("notification_enqueue_failed"); return { skipped: false, error: true }; }
}

export async function scheduleReservationReminder(reservation: ReservationEmailData) {
  if (reservation.status !== "CONFIRMED") return { skipped: true };
  try { return await processNotification((await enqueue(reservation, REMINDER)).id); }
  catch { console.error("reminder_enqueue_failed"); return { skipped: false, error: true }; }
}

/** No elimina el registro: conserva el identificador y los reintentos hasta que el proveedor confirme la cancelación. */
export async function cancelReservationReminder(reservationId: string, resend = getResendClient()) {
  const log = await prisma.notificationLog.findUnique({ where: { reservationId_type: { reservationId, type: REMINDER } } });
  if (!log || ["CANCELED", "SENT", "SKIPPED"].includes(log.status)) return;
  await prisma.notificationLog.update({ where: { id: log.id }, data: { cancelRequested: true } });
  if (!log.providerId) {
    // Un envío en curso terminará y observará cancelRequested antes de dar la operación por completada.
    if (log.status !== "PROCESSING" && !log.uncertainSince) await prisma.notificationLog.update({ where: { id: log.id }, data: { status: "CANCELED", nextAttemptAt: null } });
    return;
  }
  if (!resend) return;
  try {
    const result = await resend.emails.cancel(log.providerId);
    if (result.error) throw new Error("cancel_failed");
    await prisma.notificationLog.update({ where: { id: log.id }, data: { status: "CANCELED", leaseUntil: null, nextAttemptAt: null, lastError: null } });
  } catch {
    await prisma.notificationLog.update({ where: { id: log.id }, data: { lastError: "Cancelación pendiente de confirmar en el proveedor.", nextAttemptAt: retryAt(log.attempts) } });
  }
}

/** Recupera correos programados sin afirmar que se enviaron solo porque pasó su fecha. */
async function reconcileScheduled(resend: Resend) {
  const scheduled = await prisma.notificationLog.findMany({ where: { status: "SCHEDULED", scheduledFor: { lte: new Date() } }, take: 10, orderBy: { scheduledFor: "asc" } });
  for (const log of scheduled) {
    if (!log.providerId) continue;
    const result = await resend.emails.get(log.providerId);
    if (result.data && ["sent", "delivered", "opened", "clicked"].includes(result.data.last_event)) {
      await prisma.notificationLog.update({ where: { id: log.id }, data: { status: "SENT", sentAt: log.scheduledFor } });
    } else if (result.data?.last_event === "canceled") {
      await prisma.notificationLog.update({ where: { id: log.id }, data: { status: "CANCELED" } });
    } else if (result.data && ["failed", "bounced", "suppressed", "complained"].includes(result.data.last_event)) {
      await prisma.notificationLog.update({ where: { id: log.id }, data: { status: "FAILED", nextAttemptAt: null, lastError: "El proveedor informó que el correo no pudo entregarse. Requiere revisión." } });
    }
    await new Promise((resolve) => setTimeout(resolve, 550));
  }
}

/** Trabajo acotado para serverless; el próximo cron recupera el trabajo que quede pendiente. */
export async function runNotificationBatch(resend = getResendClient()) {
  if (!resend) return { skipped: true, processed: 0 };
  const now = new Date();
  const upcoming = await prisma.reservation.findMany({
    where: { status: "CONFIRMED", startsAt: { gt: now, lte: new Date(now.getTime() + 31 * 86_400_000) }, notifications: { none: { type: REMINDER } } },
    include, take: 50, orderBy: { startsAt: "asc" },
  });
  for (const reservation of upcoming) await enqueue(reservation, REMINDER);
  // También recupera confirmaciones si hubo un corte entre confirmar el pago y encolar el correo.
  const missing = await prisma.reservation.findMany({ where: { payment: { status: "PAID" }, notifications: { none: { type: "PAYMENT_APPROVED" } } }, include, take: 50 });
  for (const reservation of missing) await enqueue(reservation, "PAYMENT_APPROVED");

  const canceled = await prisma.notificationLog.findMany({
    where: { type: REMINDER, status: { notIn: ["CANCELED", "SENT", "SKIPPED"] }, OR: [{ cancelRequested: true }, { reservation: { status: { not: "CONFIRMED" } } }] }, take: 10,
  });
  for (const log of canceled) { await cancelReservationReminder(log.reservationId, resend); await new Promise((resolve) => setTimeout(resolve, 550)); }
  await reconcileScheduled(resend);
  const pending = await prisma.notificationLog.findMany({
    where: { status: { in: ["PENDING", "FAILED", "PROCESSING"] }, nextAttemptAt: { lte: now }, attempts: { lt: 5 } },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }], take: 20,
  });
  for (const log of pending) { await processNotification(log.id, resend); await new Promise((resolve) => setTimeout(resolve, 550)); }
  return { skipped: false, processed: pending.length };
}
