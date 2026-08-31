import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentsEnabled } from "@/lib/environment";
import { scheduleReservationReminder, sendPaymentResultEmail } from "@/lib/notifications";
import { evaluateWebpayCommit, getWebpayTransaction, type WebpayCommitResponse } from "@/lib/webpay";

export const runtime = "nodejs";

/** Construye una redirección segura hacia la pantalla interna de resultado de pago. */
function paymentResultRedirect(request: Request, paymentId?: string, status?: string) {
  const url = new URL("/pago/resultado", new URL(request.url).origin);
  if (paymentId) url.searchParams.set("payment", paymentId);
  if (status) url.searchParams.set("status", status);
  return NextResponse.redirect(url, 303);
}

/**
 * DESCRIPCIÓN: Lectura tolerante de los valores que devuelve Webpay.
 * QUÉ HACE: Busca token_ws y TBK_TOKEN primero en formularios multipart y luego en el cuerpo de texto o URL.
 * PARA QUÉ SE UTILIZA: Algunas devoluciones de Webpay pueden llegar sin el encabezado Content-Type esperado; aun así el token debe recuperarse.
 */
async function getWebpayReturnData(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return {
      token: String(formData.get("token_ws") || ""),
      abortedToken: String(formData.get("TBK_TOKEN") || ""),
    };
  }

  // Webpay Plus normalmente envía application/x-www-form-urlencoded. Se interpreta el cuerpo aunque el proveedor omita ese encabezado.
  const bodyParameters = new URLSearchParams(await request.text());
  const urlParameters = new URL(request.url).searchParams;
  return {
    token: bodyParameters.get("token_ws") || urlParameters.get("token_ws") || "",
    abortedToken: bodyParameters.get("TBK_TOKEN") || urlParameters.get("TBK_TOKEN") || "",
  };
}

/** Consulta la reserva con las relaciones necesarias para crear correos después del resultado de pago. */
async function getReservationForNotifications(reservationId: string) {
  return prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { customer: true, professional: true, payment: true },
  });
}

/**
 * DESCRIPCIÓN: Retorno de Webpay Plus.
 * QUÉ HACE: Recibe el token enviado por Transbank, confirma la transacción en el servidor y actualiza Payment y Reservation.
 * PARA QUÉ SE UTILIZA: El navegador nunca confirma un pago por sí mismo; el estado final proviene del commit seguro de Webpay.
 */
async function processWebpayReturn(request: Request) {
  if (!paymentsEnabled()) return paymentResultRedirect(request, undefined, "disabled");
  const { token, abortedToken } = await getWebpayReturnData(request);

  // Webpay envía TBK_TOKEN cuando el cliente abandona, vence o cancela desde su pantalla.
  if (abortedToken && !token) {
    const payment = await prisma.payment.findUnique({ where: { token: abortedToken } });
    if (!payment) return paymentResultRedirect(request, undefined, "abandoned");

    await prisma.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    const reservation = await getReservationForNotifications(payment.reservationId);
    if (reservation) await sendPaymentResultEmail(reservation, false);
    return paymentResultRedirect(request, payment.id, "abandoned");
  }

  if (!token) return paymentResultRedirect(request, undefined, "invalid-return");

  const payment = await prisma.payment.findUnique({
    where: { token },
    include: { reservation: { include: { customer: true, professional: true, payment: true } } },
  });
  if (!payment) return paymentResultRedirect(request, undefined, "unknown-payment");

  // Si Transbank reintenta el retorno, el pago ya confirmado se conserva y no genera correos duplicados.
  if (payment.status === "PAID") return paymentResultRedirect(request, payment.id, "approved");

  // Un intento rechazado, abandonado o vencido no debe volver a confirmarse si Transbank repite el retorno.
  if (payment.status !== "PENDING") {
    return paymentResultRedirect(request, payment.id, payment.status.toLowerCase());
  }

  // La reserva temporal tiene su propio vencimiento. Pasado ese momento no se confirma una atención antigua.
  if (payment.reservation.status !== "PENDING" || !payment.reservation.expiresAt || payment.reservation.expiresAt <= new Date()) {
    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { status: "EXPIRED" } }),
      prisma.reservation.updateMany({
        where: { id: payment.reservationId, status: "PENDING" },
        data: { status: "CANCELED" },
      }),
    ]);
    return paymentResultRedirect(request, payment.id, "expired");
  }

  let paymentResult;

  try {
    const response = await getWebpayTransaction().commit(token) as WebpayCommitResponse;

    // Esta regla verifica los nombres oficiales de Transbank: response_code, buy_order y authorization_code.
    paymentResult = evaluateWebpayCommit(response, {
      buyOrder: payment.buyOrder,
      amount: Number(payment.amount),
    });
  } catch {
    /**
     * DESCRIPCIÓN: Error temporal al consultar el resultado de Transbank.
     * QUÉ HACE: Conserva el pago como pendiente en vez de marcarlo como fallido sin una respuesta oficial.
     * PARA QUÉ SE UTILIZA: Una interrupción de red después de autorizar una tarjeta no puede invalidar por error un pago real.
     */
    return paymentResultRedirect(request, payment.id, "pending");
  }

  if (!paymentResult.approved) {
    try {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", authorizationId: paymentResult.authorizationId },
      });
    } catch {
      return paymentResultRedirect(request, payment.id, "error");
    }

    const reservation = await getReservationForNotifications(payment.reservationId);
    // Un correo no puede transformar un rechazo confirmado en un error de proceso.
    if (reservation) await Promise.allSettled([sendPaymentResultEmail(reservation, false)]);
    return paymentResultRedirect(request, payment.id, "rejected");
  }

  try {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          authorizationId: paymentResult.authorizationId,
          paidAt: new Date(),
          expiresAt: null,
        },
      }),
      prisma.reservation.update({
        where: { id: payment.reservationId },
        data: { status: "CONFIRMED", expiresAt: null },
      }),
    ]);
  } catch {
    // Si la persistencia falla, no se inventa un rechazo: el próximo retorno puede reintentar la confirmación oficial.
    return paymentResultRedirect(request, payment.id, "pending");
  }

  const reservation = await getReservationForNotifications(payment.reservationId);
  if (reservation) {
    /**
     * DESCRIPCIÓN: Notificaciones posteriores a un cobro confirmado.
     * QUÉ HACE: Ejecuta correo y recordatorio sin dejar que uno de ellos cambie el resultado ya guardado del pago.
     * PARA QUÉ SE UTILIZA: El estado comercial depende de Webpay y PostgreSQL, no de la disponibilidad de Resend.
     */
    await Promise.allSettled([
      sendPaymentResultEmail(reservation, true),
      scheduleReservationReminder(reservation),
    ]);
  }

  return paymentResultRedirect(request, payment.id, "approved");
}

/**
 * DESCRIPCIÓN: Retorno estándar de Webpay por formulario POST.
 * QUÉ HACE: Delega el procesamiento al mismo flujo que valida y confirma el pago.
 * PARA QUÉ SE UTILIZA: Mantiene una sola fuente de verdad para actualizar Payment y Reservation.
 */
export async function POST(request: Request) {
  try {
    return await processWebpayReturn(request);
  } catch {
    return paymentResultRedirect(request, undefined, "error");
  }
}

/**
 * DESCRIPCIÓN: Retorno alternativo de Webpay mediante parámetros URL.
 * QUÉ HACE: Procesa token_ws también cuando un navegador o proxy convierte el retorno en GET.
 * PARA QUÉ SE UTILIZA: Evita descartar un pago válido por depender exclusivamente del método POST esperado.
 */
export async function GET(request: Request) {
  try {
    return await processWebpayReturn(request);
  } catch {
    return paymentResultRedirect(request, undefined, "error");
  }
}
