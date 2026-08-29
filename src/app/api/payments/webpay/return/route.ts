import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleReservationReminder, sendPaymentResultEmail } from "@/lib/notifications";
import { getWebpayTransaction, isWebpayApproved } from "@/lib/webpay";

export const runtime = "nodejs";

/**
 * DESCRIPCIÓN: Respuesta relevante que entrega el SDK de Transbank al confirmar una transacción.
 * QUÉ HACE: Declara los nombres con guion bajo que Webpay utiliza realmente en su respuesta REST.
 * PARA QUÉ SE UTILIZA: Evita interpretar un pago autorizado como rechazado por usar nombres de propiedades distintos.
 */
type WebpayCommitResponse = {
  status?: string;
  response_code?: number | string;
  amount?: number | string;
  buy_order?: string;
  authorization_code?: string;
};

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

  try {
    const response = await getWebpayTransaction().commit(token) as WebpayCommitResponse;

    // El SDK conserva los nombres oficiales de la API de Transbank: response_code, buy_order y authorization_code.
    const hasMatchingOrder = response.buy_order === payment.buyOrder;
    const hasMatchingAmount = Number(response.amount) === Number(payment.amount);
    const approved = isWebpayApproved({ status: response.status, responseCode: response.response_code })
      && hasMatchingOrder
      && hasMatchingAmount;

    if (!approved) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", authorizationId: response.authorization_code || null },
      });
      const reservation = await getReservationForNotifications(payment.reservationId);
      if (reservation) await sendPaymentResultEmail(reservation, false);
      return paymentResultRedirect(request, payment.id, "rejected");
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          authorizationId: response.authorization_code || null,
          paidAt: new Date(),
          expiresAt: null,
        },
      }),
      prisma.reservation.update({
        where: { id: payment.reservationId },
        data: { status: "CONFIRMED", expiresAt: null },
      }),
    ]);

    const reservation = await getReservationForNotifications(payment.reservationId);
    if (reservation) {
      await sendPaymentResultEmail(reservation, true);
      await scheduleReservationReminder(reservation);
    }
    return paymentResultRedirect(request, payment.id, "approved");
  } catch {
    await prisma.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "FAILED" },
    });
    const reservation = await getReservationForNotifications(payment.reservationId);
    if (reservation) await sendPaymentResultEmail(reservation, false);
    return paymentResultRedirect(request, payment.id, "error");
  }
}

/**
 * DESCRIPCIÓN: Retorno estándar de Webpay por formulario POST.
 * QUÉ HACE: Delega el procesamiento al mismo flujo que valida y confirma el pago.
 * PARA QUÉ SE UTILIZA: Mantiene una sola fuente de verdad para actualizar Payment y Reservation.
 */
export async function POST(request: Request) {
  return processWebpayReturn(request);
}

/**
 * DESCRIPCIÓN: Retorno alternativo de Webpay mediante parámetros URL.
 * QUÉ HACE: Procesa token_ws también cuando un navegador o proxy convierte el retorno en GET.
 * PARA QUÉ SE UTILIZA: Evita descartar un pago válido por depender exclusivamente del método POST esperado.
 */
export async function GET(request: Request) {
  return processWebpayReturn(request);
}
