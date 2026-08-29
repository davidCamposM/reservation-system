import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBuyOrder, getWebpayReturnUrl, getWebpayTransaction, type WebpayStartResponse } from "@/lib/webpay";

export const runtime = "nodejs";

/** Valida que el navegador envíe el identificador de una reserva existente. */
const paymentStartSchema = z.object({ reservationId: z.string().min(1) });

/** Cambia los pagos vencidos a EXPIRED antes de iniciar un nuevo intento. */
async function expirePendingPayments() {
  await prisma.payment.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
}

/**
 * DESCRIPCIÓN: Inicio de una transacción Webpay Plus.
 * QUÉ HACE: Valida la reserva del cliente, crea o reutiliza su pago pendiente y solicita a Transbank un token de pago.
 * PARA QUÉ SE UTILIZA: El cliente recibe una URL y token para ser redirigido mediante POST hacia la página segura de Webpay.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Debes iniciar sesión para pagar." }, { status: 401 });
  if (session.user.role !== "CUSTOMER") return NextResponse.json({ message: "Las cuentas administrativas no pueden iniciar pagos." }, { status: 403 });

  const parsed = paymentStartSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ message: "La reserva indicada no es válida." }, { status: 400 });

  await expirePendingPayments();

  const reservation = await prisma.reservation.findFirst({
    where: { id: parsed.data.reservationId, customerId: session.user.id },
    include: { payment: true },
  });
  if (!reservation) return NextResponse.json({ message: "Reserva no encontrada." }, { status: 404 });

  // Un pago aprobado no puede iniciarse por segunda vez para la misma reserva.
  if (reservation.payment?.status === "PAID") {
    return NextResponse.json({ message: "Esta reserva ya tiene un pago aprobado." }, { status: 409 });
  }

  // La reserva solo puede pagarse mientras continúa pendiente y dentro de su periodo temporal de bloqueo.
  if (reservation.status !== "PENDING" || !reservation.expiresAt || reservation.expiresAt <= new Date()) {
    await prisma.reservation.updateMany({
      where: { id: reservation.id, status: "PENDING" },
      data: { status: "CANCELED" },
    });
    return NextResponse.json({ message: "La reserva expiró antes de iniciar el pago. Selecciona otro horario." }, { status: 409 });
  }

  // Si el cliente ya inició Webpay y aún no expira, se reutiliza el mismo enlace en lugar de crear otra transacción.
  if (
    reservation.payment?.status === "PENDING"
    && reservation.payment.expiresAt
    && reservation.payment.expiresAt > new Date()
    && reservation.payment.token
    && reservation.payment.gatewayUrl
  ) {
    return NextResponse.json({
      url: reservation.payment.gatewayUrl,
      token: reservation.payment.token,
      paymentId: reservation.payment.id,
    });
  }

  const buyOrder = createBuyOrder();
  const payment = await prisma.payment.upsert({
    where: { reservationId: reservation.id },
    create: {
      reservationId: reservation.id,
      provider: "WEBPAY_PLUS",
      buyOrder,
      amount: reservation.price,
      status: "PENDING",
      expiresAt: reservation.expiresAt,
    },
    update: {
      provider: "WEBPAY_PLUS",
      buyOrder,
      token: null,
      gatewayUrl: null,
      authorizationId: null,
      paidAt: null,
      status: "PENDING",
      expiresAt: reservation.expiresAt,
    },
  });

  try {
    const response = await getWebpayTransaction().create(
      payment.buyOrder,
      session.user.id,
      Number(payment.amount),
      getWebpayReturnUrl(request.url),
    ) as WebpayStartResponse;

    if (!response.token || !response.url) throw new Error("Webpay no devolvió token ni URL de pago.");

    await prisma.payment.update({
      where: { id: payment.id },
      data: { token: response.token, gatewayUrl: response.url },
    });

    return NextResponse.json({ url: response.url, token: response.token, paymentId: payment.id });
  } catch {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return NextResponse.json({ message: "No fue posible iniciar Webpay. Intenta nuevamente." }, { status: 502 });
  }
}
