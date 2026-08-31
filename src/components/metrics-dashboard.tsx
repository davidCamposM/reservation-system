"use client";

/**
 * DESCRIPCIÓN: Dependencias del dashboard interactivo.
 * QUÉ HACE: useState conserva filtro, resultados, carga y mensajes luego de cada consulta al servidor.
 * PARA QUÉ SE UTILIZA: El administrador puede actualizar el período sin recargar toda la página /admin.
 */
import { FormEvent, useState } from "react";
import type { DashboardMetrics, MetricPeriod } from "@/lib/admin-metrics";

/** Propiedades iniciales entregadas por la página de administración renderizada en servidor. */
type MetricsDashboardProps = {
  initialMetrics: DashboardMetrics;
};

/** Textos comprensibles para los valores internos de estado de reserva. */
const RESERVATION_STATUS_LABELS = {
  PENDING: "Pendientes",
  CONFIRMED: "Confirmadas",
  CANCELED: "Canceladas",
  COMPLETED: "Completadas",
} as const;

/** Formatea montos enteros como pesos chilenos. */
function formatCurrency(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`;
}

/**
 * DESCRIPCIÓN: Panel de desempeño comercial por período.
 * QUÉ HACE: Solicita métricas protegidas al servidor y muestra reservas, estados, pagos aprobados y facturación.
 * PARA QUÉ SE UTILIZA: Entrega una lectura rápida del negocio sin mezclar cálculos económicos con el navegador.
 */
export function MetricsDashboard({ initialMetrics }: MetricsDashboardProps) {
  /** Estado visual del filtro elegido y de la última respuesta válida de la API. */
  const [period, setPeriod] = useState<MetricPeriod>("THIS_MONTH");
  const [from, setFrom] = useState(initialMetrics.range.from ?? "");
  const [to, setTo] = useState(initialMetrics.range.to ?? "");
  const [metrics, setMetrics] = useState(initialMetrics);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  /**
   * DESCRIPCIÓN: Solicitud de métricas filtradas.
   * QUÉ HACE: Valida fechas personalizadas, crea query params seguros y reemplaza las tarjetas al recibir la respuesta.
   * PARA QUÉ SE UTILIZA: Impide consultas incompletas y comunica errores de red o validación al administrador.
   */
  async function loadMetrics(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (period === "CUSTOM" && (!from || !to || from > to)) {
      setMessage("Selecciona una fecha inicial y final válidas.");
      return;
    }

    const params = new URLSearchParams({ period });
    if (period === "CUSTOM") {
      params.set("from", from);
      params.set("to", to);
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/metrics?${params.toString()}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload || typeof payload !== "object" || !("metrics" in payload)) {
        const errorMessage = payload && typeof payload === "object" && "message" in payload ? payload.message : null;
        throw new Error(typeof errorMessage === "string" ? errorMessage : "No fue posible actualizar las métricas.");
      }

      setMetrics(payload.metrics as DashboardMetrics);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ocurrió un error inesperado al cargar las métricas.");
    } finally {
      setIsLoading(false);
    }
  }

  const mainCards = [
    { label: "Reservas", value: String(metrics.reservations.total), description: "Según fecha de atención" },
    { label: "Pagos aprobados", value: String(metrics.payments.approved), description: "Según fecha de pago" },
    { label: "Facturación pagada", value: formatCurrency(metrics.payments.revenue), description: "Solo pagos aprobados" },
  ];

  return (
    <section className="space-y-5" aria-busy={isLoading}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Métricas del negocio</h2>
          <p className="mt-1 text-sm text-slate-600">Período activo: {metrics.range.label}.</p>
        </div>

        <form onSubmit={loadMetrics} className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Período
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as MetricPeriod)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
            >
              <option value="LAST_7_DAYS">Últimos 7 días</option>
              <option value="LAST_30_DAYS">Últimos 30 días</option>
              <option value="THIS_MONTH">Mes actual</option>
              <option value="CUSTOM">Personalizado</option>
              <option value="ALL_TIME">Todo el historial</option>
            </select>
          </label>

          {period === "CUSTOM" && (
            <>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Desde
                <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 font-normal" required />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Hasta
                <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 font-normal" required />
              </label>
            </>
          )}

          <button type="submit" disabled={isLoading} className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60">
            {isLoading ? "Actualizando..." : "Aplicar filtro"}
          </button>
        </form>
      </div>

      {message && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{message}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {mainCards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{card.value}</p>
            <p className="mt-2 text-xs text-slate-500">{card.description}</p>
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-950">Estados de reservas</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Object.entries(RESERVATION_STATUS_LABELS).map(([status, label]) => (
            <div key={status} className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-600">{label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{metrics.reservations.byStatus[status as keyof typeof metrics.reservations.byStatus]}</p>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
