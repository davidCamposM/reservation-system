"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/** Datos mínimos de un profesional que se muestran durante la reserva. */
type BookingProfessional = { id: string; name: string; bio: string | null };

/** Servicio entregado por la página del servidor al formulario interactivo. */
type BookingService = {
  id: string;
  name: string;
  description: string | null;
  durationMins: number;
  price: number;
  professionals: Array<{ professional: BookingProfessional }>;
};

/** Horario libre calculado por la API de disponibilidad. */
type Slot = { startsAt: string; endsAt: string; label: string };
type CreatedReservation = { id: string };

/** Propiedades necesarias para mostrar una etapa del indicador de progreso. */
type BookingStepProps = { completed: boolean; label: string; number: number };

/** Extrae un mensaje de error solo si la API devolvió un texto seguro para mostrar al cliente. */
function getApiMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string") {
    return payload.message;
  }

  return fallback;
}

/** Confirma que una respuesta contiene una reserva nueva identificable antes de guardar su estado local. */
function getCreatedReservation(payload: unknown): CreatedReservation | null {
  if (
    payload
    && typeof payload === "object"
    && "reservation" in payload
    && payload.reservation
    && typeof payload.reservation === "object"
    && "id" in payload.reservation
    && typeof payload.reservation.id === "string"
  ) {
    return { id: payload.reservation.id };
  }

  return null;
}

/** Comprueba URL y token antes de crear el formulario POST requerido por Webpay. */
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

/**
 * DESCRIPCIÓN: Obtiene la fecha actual en el horario de Chile.
 * QUÉ HACE: Devuelve una fecha con formato YYYY-MM-DD compatible con el campo HTML de tipo date.
 * PARA QUÉ SE UTILIZA: Evita que la fecha mínima de reserva cambie por la zona horaria del navegador o del servidor.
 */
function todayInChile() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
}

/**
 * DESCRIPCIÓN: Formateador de precios en pesos chilenos.
 * QUÉ HACE: Convierte un número a un texto como $18.000.
 * PARA QUÉ SE UTILIZA: Mantiene el mismo formato de precio en todas las tarjetas del flujo.
 */
function clp(value: number) {
  return `$${value.toLocaleString("es-CL")}`;
}

/**
 * DESCRIPCIÓN: Una tarjeta individual del indicador de avance.
 * QUÉ HACE: Cambia su estilo según si el usuario ya completó ese paso del formulario.
 * PARA QUÉ SE UTILIZA: Hace visible el progreso real de la reserva sin cambiar de página.
 */
function BookingStep({ completed, label, number }: BookingStepProps) {
  const completedStyle = "border-teal-700 bg-teal-700 text-white";
  const pendingStyle = "border-slate-200 bg-white text-slate-500";

  return (
    <li className={`rounded-lg border px-4 py-3 ${completed ? completedStyle : pendingStyle}`}>
      {number}. {label}
    </li>
  );
}

/**
 * DESCRIPCIÓN: Flujo interactivo con el que un cliente crea una reserva.
 * QUÉ HACE: Mantiene las selecciones del usuario, consulta horarios libres y envía la reserva a la API.
 * PARA QUÉ SE UTILIZA: Reúne las tres decisiones necesarias —servicio, profesional y horario— en una sola experiencia.
 */
export function BookingFlow({ services, initialServiceId }: { services: BookingService[]; initialServiceId?: string }) {
  /** Estado de cada decisión que el cliente toma durante el proceso. */
  const [serviceId, setServiceId] = useState(services.find((service) => service.id === initialServiceId)?.id ?? services[0]?.id ?? "");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState(todayInChile());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  /** Estado de comunicación: evita doble envío e informa el resultado al cliente. */
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [message, setMessage] = useState("");
  const [booking, setBooking] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<CreatedReservation | null>(null);
  const [startingPayment, setStartingPayment] = useState(false);

  /**
   * DESCRIPCIÓN: Datos derivados de las selecciones actuales.
   * QUÉ HACE: Encuentra el servicio y profesional seleccionados sin guardar datos duplicados en el estado.
   * PARA QUÉ SE UTILIZA: El resumen, el progreso y la petición de reserva siempre usan la selección vigente.
   */
  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [serviceId, services],
  );
  const professionals = selectedService?.professionals.map((item) => item.professional) ?? [];
  const selectedProfessional = professionals.find((professional) => professional.id === professionalId);

  /**
   * DESCRIPCIÓN: Estado de avance del flujo de reserva.
   * QUÉ HACE: Determina qué pasos se consideran completos con base en las selecciones actuales.
   * PARA QUÉ SE UTILIZA: El indicador superior se actualiza al elegir servicio, profesional y horario.
   * NOTA: El pago se completa fuera de esta pantalla, cuando Webpay autoriza la transacción.
   */
  const completedSteps = {
    service: Boolean(selectedService),
    professional: Boolean(selectedProfessional),
    schedule: Boolean(selectedSlot),
  };

  /**
   * DESCRIPCIÓN: Cambio de servicio.
   * QUÉ HACE: Guarda el servicio elegido y limpia las elecciones que dependían del servicio anterior.
   * PARA QUÉ SE UTILIZA: Impide reservar con un profesional u horario que pertenecía a otro servicio.
   */
  function chooseService(id: string) {
    setServiceId(id);
    setProfessionalId("");
    setSelectedSlot(null);
    setSlots([]);
    setMessage("");
    setCreatedReservation(null);
  }

  /**
   * DESCRIPCIÓN: Carga automática de horarios disponibles.
   * QUÉ HACE: Consulta la API cuando hay servicio, profesional y fecha; cancela la consulta anterior al cambiar una elección.
   * PARA QUÉ SE UTILIZA: Los botones de horas siempre representan la disponibilidad más reciente del profesional elegido.
   */
  useEffect(() => {
    if (!serviceId || !professionalId || !date) {
      setSlots([]);
      setLoadingSlots(false);
      return;
    }

    const controller = new AbortController();

    async function loadSlots() {
      setLoadingSlots(true);
      setSelectedSlot(null);
      setMessage("");
      setCreatedReservation(null);

      const params = new URLSearchParams({ serviceId, professionalId, date });
      try {
        const response = await fetch(`/api/availability?${params}`, { signal: controller.signal });
        const data = await response.json().catch(() => null);

        if (!response.ok || !data || typeof data !== "object" || !("slots" in data) || !Array.isArray(data.slots)) {
          if (!controller.signal.aborted) {
            setSlots([]);
            setMessage(getApiMessage(data, "No fue posible consultar los horarios disponibles."));
          }
          return;
        }

        if (!controller.signal.aborted) setSlots(data.slots as Slot[]);
      } catch {
        if (!controller.signal.aborted) {
          setSlots([]);
          setMessage("No fue posible consultar los horarios disponibles. Intenta nuevamente.");
        }
      } finally {
        if (!controller.signal.aborted) setLoadingSlots(false);
      }
    }

    void loadSlots();

    return () => controller.abort();
  }, [serviceId, professionalId, date]);

  /**
   * DESCRIPCIÓN: Envío final de la reserva.
   * QUÉ HACE: Envía las tres elecciones a la API, que vuelve a validar disponibilidad antes de crear la reserva pendiente.
   * PARA QUÉ SE UTILIZA: Evita que el navegador pueda crear un cruce de horario usando datos antiguos o manipulados.
   */
  async function createReservation() {
    if (!selectedSlot || !selectedService || !selectedProfessional) return;

    setBooking(true);
    setMessage("");

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          professionalId: selectedProfessional.id,
          startsAt: selectedSlot.startsAt,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(getApiMessage(data, "No fue posible crear la reserva. Intenta nuevamente."));
        return;
      }

      const reservation = getCreatedReservation(data);
      if (!reservation) {
        setMessage("La reserva fue creada, pero no fue posible preparar el pago. Revísala desde tu cuenta.");
        return;
      }

      setCreatedReservation(reservation);
      setMessage("Reserva pendiente creada. El horario queda bloqueado mientras se completa el pago.");
    } catch {
      setMessage("No fue posible conectarse con el servidor. Revisa tu conexión e intenta nuevamente.");
    } finally {
      setBooking(false);
    }
  }

  /**
   * DESCRIPCIÓN: Inicio de la redirección segura hacia Webpay Plus.
   * QUÉ HACE: Solicita a la API un token de pago y crea un formulario POST que Webpay exige para recibirlo.
   * PARA QUÉ SE UTILIZA: Ninguna clave ni llamada a Transbank se expone al navegador; solo se envía el token temporal devuelto por el servidor.
   */
  async function startWebpayPayment() {
    if (!createdReservation) return;

    setStartingPayment(true);
    setMessage("");
    try {
      const response = await fetch("/api/payments/webpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: createdReservation.id }),
      });
      const data = await response.json().catch(() => null);

      const webpayStart = getWebpayStartData(data);
      if (!response.ok || !webpayStart) {
        setMessage(getApiMessage(data, "No fue posible iniciar el pago. Intenta nuevamente."));
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
      setMessage("No fue posible conectarse con Webpay. Intenta nuevamente.");
    } finally {
      // Si el formulario redirige correctamente, el navegador abandona esta página antes de que este estado sea visible.
      setStartingPayment(false);
    }
  }

  return (
    <div className="space-y-6">
      {/** Indicador dentro del componente cliente: puede reaccionar a las selecciones del usuario. */}
      <ol className="grid gap-3 text-sm font-semibold sm:grid-cols-4" aria-label="Progreso de la reserva">
        <BookingStep completed={completedSteps.service} label="Servicio" number={1} />
        <BookingStep completed={completedSteps.professional} label="Profesional" number={2} />
        <BookingStep completed={completedSteps.schedule} label="Horario" number={3} />
        <BookingStep completed={false} label="Pago" number={4} />
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold">1. Elige un servicio</h2>
            <div className="mt-4 grid gap-3">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => chooseService(service.id)}
                  className={`flex items-center justify-between rounded-xl border p-4 text-left ${service.id === serviceId ? "border-teal-600 bg-teal-50" : "border-slate-200 hover:border-teal-400"}`}
                >
                  <span>
                    <span className="block font-bold text-slate-950">{service.name}</span>
                    <span className="mt-1 block text-sm text-slate-600">{service.durationMins} min · {service.description}</span>
                  </span>
                  <strong>{clp(service.price)}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold">2. Elige un profesional</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {professionals.map((professional) => (
                <button
                  key={professional.id}
                  type="button"
                  onClick={() => {
                    setProfessionalId(professional.id);
                    setSelectedSlot(null);
                    setCreatedReservation(null);
                    setMessage("");
                  }}
                  className={`rounded-xl border p-4 text-left ${professional.id === professionalId ? "border-teal-600 bg-teal-50" : "border-slate-200 hover:border-teal-400"}`}
                >
                  <span className="block font-bold text-slate-950">{professional.name}</span>
                  <span className="mt-1 block text-sm text-slate-600">{professional.bio || "Atención profesional"}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <label className="block text-lg font-bold">
              3. Elige fecha y hora
              <input
                type="date"
                min={todayInChile()}
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setSelectedSlot(null);
                  setCreatedReservation(null);
                  setMessage("");
                }}
                className="mt-3 block rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
              />
            </label>

            {!professionalId && <p className="mt-4 text-sm text-slate-500">Primero selecciona un profesional.</p>}
            {loadingSlots && <p className="mt-4 text-sm text-slate-500">Buscando horarios disponibles...</p>}
            {professionalId && !loadingSlots && !slots.length && <p className="mt-4 text-sm text-slate-500">No hay horarios disponibles para esta fecha.</p>}

            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {slots.map((slot) => (
                <button
                  key={slot.startsAt}
                  type="button"
                  onClick={() => {
                    setSelectedSlot(slot);
                    setCreatedReservation(null);
                    setMessage("");
                  }}
                  className={`rounded-lg border py-2 text-sm font-bold ${slot.startsAt === selectedSlot?.startsAt ? "border-teal-700 bg-teal-700 text-white" : "border-slate-200 text-slate-700 hover:border-teal-600 hover:bg-teal-50"}`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-2xl bg-slate-950 p-6 text-white">
          <p className="text-sm font-bold text-teal-300">RESUMEN</p>
          <h2 className="mt-4 text-xl font-bold">{selectedService?.name || "Elige un servicio"}</h2>
          <dl className="mt-5 space-y-3 border-y border-white/15 py-5 text-sm text-slate-300">
            <div className="flex justify-between"><dt>Duración</dt><dd className="font-semibold text-white">{selectedService ? `${selectedService.durationMins} min` : "—"}</dd></div>
            <div className="flex justify-between"><dt>Profesional</dt><dd className="font-semibold text-white">{selectedProfessional?.name || "—"}</dd></div>
            <div className="flex justify-between"><dt>Hora</dt><dd className="font-semibold text-white">{selectedSlot?.label || "—"}</dd></div>
          </dl>
          <div className="mt-5 flex justify-between"><span className="font-semibold">Total</span><strong className="text-xl">{selectedService ? clp(selectedService.price) : "—"}</strong></div>
          <button type="button" disabled={!selectedSlot || booking || Boolean(createdReservation)} onClick={createReservation} className="mt-6 w-full rounded-lg bg-teal-400 px-4 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-teal-300">{booking ? "Creando reserva..." : createdReservation ? "Reserva creada" : "Reservar hora"}</button>
          {createdReservation && <button type="button" disabled={startingPayment} onClick={startWebpayPayment} className="mt-3 w-full rounded-lg bg-white px-4 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-200">{startingPayment ? "Redirigiendo a Webpay..." : "Pagar con Webpay"}</button>}
          {message && <p className="mt-3 text-sm leading-5 text-teal-200">{message}</p>}
          {createdReservation && <Link href="/cuenta" className="mt-4 inline-flex text-sm font-bold text-white underline">Ver mis reservas</Link>}
        </aside>
      </div>
    </div>
  );
}
