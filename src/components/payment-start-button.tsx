"use client";

import { useState } from "react";

/** Propiedades necesarias para iniciar o reintentar un pago de una reserva ya creada. */
type PaymentStartButtonProps = {
  reservationId: string;
};

/** Verifica que la API devuelva los únicos dos valores necesarios para redirigir a Webpay de forma segura. */
function getWebpayStartData(payload: unknown): { url: string; token: string } | null {
  if (
    !payload
    || typeof payload !== "object"
    || !("url" in payload)
    || !("token" in payload)
    || typeof payload.url !== "string"
    || typeof payload.token !== "string"
  ) {
    return null;
  }

  try {
    const url = new URL(payload.url);
    return url.protocol === "https:" && payload.token.length > 0 ? { url: url.toString(), token: payload.token } : null;
  } catch {
    return null;
  }
}

/** Lee un texto de error opcional evitando mostrar valores no serializables de una respuesta inesperada. */
function getApiMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string") {
    return payload.message;
  }

  return fallback;
}

/**
 * DESCRIPCIÓN: Botón cliente para iniciar Webpay desde una reserva existente.
 * QUÉ HACE: Pide un token de pago a la API y envía ese token a la URL segura entregada por Webpay.
 * PARA QUÉ SE UTILIZA: Permite reintentar un pago pendiente desde "Mi cuenta" sin generar otra reserva ni duplicar el horario.
 */
export function PaymentStartButton({ reservationId }: PaymentStartButtonProps) {
  /** Evita que un segundo clic cree otro intento mientras el navegador se redirige a Webpay. */
  const [startingPayment, setStartingPayment] = useState(false);
  /** Conserva un mensaje visible si la API no puede iniciar la transacción. */
  const [message, setMessage] = useState("");

  /**
   * DESCRIPCIÓN: Redirección mediante formulario requerido por Webpay.
   * QUÉ HACE: Recibe URL y token desde el servidor, crea un formulario temporal y lo envía por POST.
   * PARA QUÉ SE UTILIZA: Transbank exige que token_ws llegue por POST; las credenciales de integración nunca se envían al navegador.
   */
  async function startPayment() {
    setStartingPayment(true);
    setMessage("");

    try {
      const response = await fetch("/api/payments/webpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId }),
      });
      const data = await response.json().catch(() => null);

      const webpayStart = getWebpayStartData(data);
      if (!response.ok || !webpayStart) {
        setMessage(getApiMessage(data, "No fue posible iniciar el pago."));
        setStartingPayment(false);
        return;
      }

      const form = document.createElement("form");
      form.method = "POST";
      form.action = webpayStart.url;

      const tokenInput = document.createElement("input");
      tokenInput.type = "hidden";
      tokenInput.name = "token_ws";
      tokenInput.value = webpayStart.token;
      form.appendChild(tokenInput);
      document.body.appendChild(form);
      form.submit();
    } catch {
      setMessage("No fue posible comunicarse con el pago. Intenta nuevamente.");
      setStartingPayment(false);
    }
  }

  return (
    <div className="mt-4">
      <p className="mb-2 text-xs text-slate-600">Webpay de integración · solo tarjetas de prueba.</p>
      <button
        type="button"
        disabled={startingPayment}
        onClick={startPayment}
        className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {startingPayment ? "Redirigiendo a Webpay..." : "Pagar con Webpay"}
      </button>
      {message && <p className="mt-2 text-sm text-rose-700">{message}</p>}
    </div>
  );
}
