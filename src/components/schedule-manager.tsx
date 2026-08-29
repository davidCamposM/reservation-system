"use client";

import { FormEvent, useMemo, useState } from "react";

type WeeklyWindow = {
  id: string;
  professionalId: string;
  weekday: number;
  startTime: string;
  endTime: string;
};

type TimeOffBlock = {
  id: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
};

type Professional = {
  id: string;
  name: string;
  active: boolean;
  availability: WeeklyWindow[];
  timeOff: TimeOffBlock[];
};

type Reservation = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "COMPLETED";
  serviceName: string;
  startsAt: string;
  endsAt: string;
  customer: { name: string; email: string };
  professional: { name: string };
};

type ScheduleManagerProps = {
  initialProfessionals: Professional[];
  initialReservations: Reservation[];
};

const WEEK_DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const RESERVATION_STATUSES: Reservation["status"][] = ["PENDING", "CONFIRMED", "CANCELED", "COMPLETED"];

/**
 * DESCRIPCIÓN: Convierte los estados internos a textos claros para la interfaz.
 * QUÉ HACE: Relaciona cada valor técnico del enum con una frase en español.
 * PARA QUÉ SE UTILIZA: El administrador no necesita conocer los identificadores usados por la base de datos.
 */
const STATUS_LABELS: Record<Reservation["status"], string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELED: "Cancelada",
  COMPLETED: "Completada",
};

/**
 * DESCRIPCIÓN: Formatea una fecha para la zona horaria del negocio.
 * QUÉ HACE: Muestra la hora de Chile sin alterar el valor original guardado en la base de datos.
 * PARA QUÉ SE UTILIZA: Evita que un administrador vea una reserva desplazada por la zona horaria del navegador.
 */
function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Santiago",
  }).format(new Date(date));
}

/**
 * DESCRIPCIÓN: Herramienta administrativa interactiva de agenda.
 * QUÉ HACE: Permite editar jornadas semanales, crear bloqueos puntuales y actualizar estados de reservas.
 * PARA QUÉ SE UTILIZA: Entrega al administrador controles claros sin convertir toda la página del servidor en cliente.
 */
export function ScheduleManager({ initialProfessionals, initialReservations }: ScheduleManagerProps) {
  const [professionals, setProfessionals] = useState(initialProfessionals);
  const [reservations, setReservations] = useState(initialReservations);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState(initialProfessionals[0]?.id ?? "");
  const [availability, setAvailability] = useState<WeeklyWindow[]>(initialProfessionals[0]?.availability ?? []);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedProfessional = useMemo(
    () => professionals.find((professional) => professional.id === selectedProfessionalId),
    [professionals, selectedProfessionalId],
  );

  /** Actualiza el profesional elegido y carga sus ventanas semanales en el formulario. */
  function chooseProfessional(professionalId: string) {
    const professional = professionals.find((item) => item.id === professionalId);
    setSelectedProfessionalId(professionalId);
    setAvailability(professional?.availability ?? []);
    setMessage("");
  }

  /** Añade una fila editable de disponibilidad antes de guardarla en la base de datos. */
  function addAvailabilityWindow() {
    setAvailability((current) => [
      ...current,
      { id: `new-${Date.now()}`, professionalId: selectedProfessionalId, weekday: 1, startTime: "09:00", endTime: "18:00" },
    ]);
  }

  /** Reemplaza una propiedad puntual de una ventana semanal sin mutar el estado anterior. */
  function updateAvailabilityWindow(index: number, field: keyof Pick<WeeklyWindow, "weekday" | "startTime" | "endTime">, value: string) {
    setAvailability((current) => current.map((window, windowIndex) => (
      windowIndex === index ? { ...window, [field]: field === "weekday" ? Number(value) : value } : window
    )));
  }

  /** Elimina una fila de la vista; el cambio queda pendiente hasta presionar Guardar jornada. */
  function removeAvailabilityWindow(index: number) {
    setAvailability((current) => current.filter((_, windowIndex) => windowIndex !== index));
  }

  /** Envía toda la jornada semanal del profesional seleccionado al endpoint administrativo. */
  async function saveAvailability() {
    if (!selectedProfessionalId) return;
    setIsSaving(true);
    setMessage("");

    const response = await fetch(`/api/admin/professionals/${selectedProfessionalId}/availability`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        windows: availability.map(({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime })),
      }),
    });
    const payload = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setMessage(payload.message ?? "No fue posible guardar la jornada.");
      return;
    }

    setAvailability(payload.availability);
    setProfessionals((current) => current.map((professional) => (
      professional.id === selectedProfessionalId ? { ...professional, availability: payload.availability } : professional
    )));
    setMessage("Jornada semanal guardada correctamente.");
  }

  /** Crea un bloqueo excepcional mediante el formulario y lo incorpora a la interfaz. */
  async function createTimeOff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProfessionalId) return;
    const form = new FormData(event.currentTarget);
    const startsAt = String(form.get("startsAt"));
    const endsAt = String(form.get("endsAt"));
    const reason = String(form.get("reason"));
    setIsSaving(true);
    setMessage("");

    const response = await fetch("/api/admin/time-off", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        professionalId: selectedProfessionalId,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        reason,
      }),
    });
    const payload = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setMessage(payload.message ?? "No fue posible crear el bloqueo.");
      return;
    }

    setProfessionals((current) => current.map((professional) => (
      professional.id === selectedProfessionalId
        ? { ...professional, timeOff: [...professional.timeOff, payload.timeOff] }
        : professional
    )));
    event.currentTarget.reset();
    setMessage("Bloqueo excepcional creado.");
  }

  /** Elimina un bloqueo excepcional, liberando nuevamente ese periodo en la agenda. */
  async function deleteTimeOff(timeOffId: string) {
    const response = await fetch(`/api/admin/time-off/${timeOffId}`, { method: "DELETE" });
    if (!response.ok) {
      setMessage("No fue posible eliminar el bloqueo.");
      return;
    }

    setProfessionals((current) => current.map((professional) => ({
      ...professional,
      timeOff: professional.timeOff.filter((block) => block.id !== timeOffId),
    })));
    setMessage("Bloqueo eliminado y horario liberado.");
  }

  /** Actualiza el estado de una reserva y refleja la respuesta del servidor de inmediato. */
  async function updateReservationStatus(reservationId: string, status: Reservation["status"]) {
    const response = await fetch(`/api/admin/reservations/${reservationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.message ?? "No fue posible actualizar la reserva.");
      return;
    }

    setReservations((current) => current.map((reservation) => (
      reservation.id === reservationId ? { ...reservation, status: payload.reservation.status } : reservation
    )));
    setMessage("Estado de reserva actualizado.");
  }

  if (!selectedProfessional) {
    return <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">Crea un profesional para configurar su agenda.</p>;
  }

  return (
    <div className="space-y-8">
      {message && <p className="rounded-xl bg-teal-50 p-4 text-sm font-medium text-teal-800">{message}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Jornada semanal</h2>
          <p className="mt-1 text-sm text-slate-600">Estos son los horarios que podrán aparecer al reservar.</p>
          <label className="mt-5 block text-sm font-semibold text-slate-700">
            Profesional
            <select className="mt-2 w-full rounded-lg border border-slate-300 p-2" value={selectedProfessionalId} onChange={(event) => chooseProfessional(event.target.value)}>
              {professionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.name}</option>)}
            </select>
          </label>

          <div className="mt-5 space-y-3">
            {availability.map((window, index) => (
              <div key={window.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                <select className="rounded-lg border border-slate-300 p-2 text-sm" value={window.weekday} onChange={(event) => updateAvailabilityWindow(index, "weekday", event.target.value)}>
                  {WEEK_DAYS.map((day, dayIndex) => <option key={day} value={dayIndex + 1}>{day}</option>)}
                </select>
                <input className="rounded-lg border border-slate-300 p-2 text-sm" type="time" value={window.startTime} onChange={(event) => updateAvailabilityWindow(index, "startTime", event.target.value)} />
                <input className="rounded-lg border border-slate-300 p-2 text-sm" type="time" value={window.endTime} onChange={(event) => updateAvailabilityWindow(index, "endTime", event.target.value)} />
                <button className="rounded-lg px-2 text-sm font-semibold text-rose-700 hover:bg-rose-50" type="button" onClick={() => removeAvailabilityWindow(index)}>Quitar</button>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800" type="button" onClick={addAvailabilityWindow}>Agregar tramo</button>
            <button className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" type="button" disabled={isSaving} onClick={saveAvailability}>{isSaving ? "Guardando..." : "Guardar jornada"}</button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Bloqueos excepcionales</h2>
          <p className="mt-1 text-sm text-slate-600">Úsalos para vacaciones, licencias o indisponibilidades puntuales.</p>
          <form className="mt-5 space-y-3" onSubmit={createTimeOff}>
            <input className="w-full rounded-lg border border-slate-300 p-2 text-sm" name="startsAt" type="datetime-local" required />
            <input className="w-full rounded-lg border border-slate-300 p-2 text-sm" name="endsAt" type="datetime-local" required />
            <input className="w-full rounded-lg border border-slate-300 p-2 text-sm" name="reason" placeholder="Motivo opcional" maxLength={200} />
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" type="submit" disabled={isSaving}>Bloquear horario</button>
          </form>
          <div className="mt-5 space-y-3">
            {selectedProfessional.timeOff.length === 0 ? <p className="text-sm text-slate-500">No hay bloqueos para este profesional.</p> : selectedProfessional.timeOff.map((block) => (
              <article key={block.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                <p><strong>{formatDateTime(block.startsAt)}</strong> a <strong>{formatDateTime(block.endsAt)}</strong><br />{block.reason || "Sin motivo indicado"}</p>
                <button className="font-semibold text-rose-700" type="button" onClick={() => deleteTimeOff(block.id)}>Eliminar</button>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Últimas reservas</h2>
        <p className="mt-1 text-sm text-slate-600">Una reserva pendiente mantiene su horario bloqueado durante 15 minutos.</p>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b text-slate-500"><tr><th className="pb-3 pr-4">Cliente</th><th className="pb-3 pr-4">Atención</th><th className="pb-3 pr-4">Fecha</th><th className="pb-3">Estado</th></tr></thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4"><strong>{reservation.customer.name}</strong><br /><span className="text-slate-500">{reservation.customer.email}</span></td>
                  <td className="py-3 pr-4">{reservation.serviceName}<br /><span className="text-slate-500">{reservation.professional.name}</span></td>
                  <td className="py-3 pr-4">{formatDateTime(reservation.startsAt)}</td>
                  <td className="py-3"><select className="rounded-lg border border-slate-300 p-2" value={reservation.status} onChange={(event) => updateReservationStatus(reservation.id, event.target.value as Reservation["status"])}>{RESERVATION_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></td>
                </tr>
              ))}
              {reservations.length === 0 && <tr><td className="py-5 text-slate-500" colSpan={4}>Todavía no hay reservas.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
