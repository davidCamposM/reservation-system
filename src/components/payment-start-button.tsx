"use client";

import { useState } from "react";

/** Propiedades necesarias para iniciar o reintentar un pago de una reserva ya creada. */
type PaymentStartButtonProps = {
  reservationId: string;
};

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
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "No fue posible iniciar el pago.");
        setStartingPayment(false);
        return;
      }

      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.url;

      const tokenInput = document.createElement("input");
      tokenInput.type = "hidden";
      tokenInput.name = "token_ws";
      tokenInput.value = data.token;
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
