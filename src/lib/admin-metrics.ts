/**
 * DESCRIPCIÓN: Lógica de negocio para las métricas administrativas.
 * QUÉ HACE: Define períodos permitidos, transforma fechas chilenas a rangos consultables y calcula indicadores desde PostgreSQL.
 * PARA QUÉ SE UTILIZA: La página /admin y su API comparten exactamente los mismos criterios de reservas, pagos aprobados y facturación.
 */
import { PaymentStatus, ReservationStatus } from "@prisma/client";
import { fromZonedTime } from "date-fns-tz";
import { BUSINESS_TIME_ZONE, formatChileDate, isValidCalendarDate } from "@/lib/scheduling";
import { prisma } from "@/lib/prisma";

/** Períodos que el administrador puede seleccionar desde el dashboard. */
export const METRIC_PERIODS = ["LAST_7_DAYS", "LAST_30_DAYS", "THIS_MONTH", "CUSTOM", "ALL_TIME"] as const;

/** Unión de TypeScript creada desde los períodos disponibles. */
export type MetricPeriod = (typeof METRIC_PERIODS)[number];

/** Filtro recibido por la página del servidor o por la ruta API. */
export type MetricsFilter = {
  period: MetricPeriod;
  from?: string;
  to?: string;
};

/** Rango legible que se devuelve a la interfaz junto con los resultados. */
export type MetricsRange = {
  from: string | null;
  to: string | null;
  label: string;
};

/** Datos serializables que consume el dashboard administrativo. */
export type DashboardMetrics = {
  range: MetricsRange;
  reservations: {
    total: number;
    byStatus: Record<ReservationStatus, number>;
  };
  payments: {
    approved: number;
    revenue: number;
  };
};

/** Convierte una fecha YYYY-MM-DD a la medianoche de Chile almacenada como fecha UTC. */
function startOfChileDay(date: string) {
  return fromZonedTime(`${date}T00:00:00`, BUSINESS_TIME_ZONE);
}

/** Suma o resta días calendario sin verse afectado por cambios de horario de verano. */
function shiftCalendarDate(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

/** Verifica que un dato conserve el formato estricto de un campo date de HTML. */
function isDateInput(value: string | undefined): value is string {
  return Boolean(value && isValidCalendarDate(value));
}

/**
 * DESCRIPCIÓN: Resolución de un período a fechas de inicio y fin.
 * QUÉ HACE: Genera el rango solicitado por el administrador, donde la fecha final es inclusiva para la interfaz.
 * PARA QUÉ SE UTILIZA: Todas las consultas usan el mismo límite temporal y evitan interpretaciones distintas entre tarjetas.
 */
function resolveMetricsRange(filter: MetricsFilter): { range: MetricsRange; startsAt?: Date; endsBefore?: Date } {
  const today = formatChileDate(new Date());

  if (filter.period === "ALL_TIME") {
    return { range: { from: null, to: null, label: "Todo el historial" } };
  }

  let from: string;
  let to: string;
  let label: string;

  if (filter.period === "LAST_7_DAYS") {
    from = shiftCalendarDate(today, -6);
    to = today;
    label = "Últimos 7 días";
  } else if (filter.period === "LAST_30_DAYS") {
    from = shiftCalendarDate(today, -29);
    to = today;
    label = "Últimos 30 días";
  } else if (filter.period === "THIS_MONTH") {
    from = `${today.slice(0, 8)}01`;
    to = today;
    label = "Mes actual";
  } else {
    if (!isDateInput(filter.from) || !isDateInput(filter.to) || filter.from > filter.to) {
      throw new Error("Selecciona un rango de fechas válido.");
    }
    from = filter.from;
    to = filter.to;
    label = "Período personalizado";
  }

  return {
    range: { from, to, label },
    startsAt: startOfChileDay(from),
    // El límite superior es exclusivo: incluye toda la fecha final, hasta las 23:59 de Chile.
    endsBefore: startOfChileDay(shiftCalendarDate(to, 1)),
  };
}

/**
 * DESCRIPCIÓN: Cálculo central de indicadores del negocio.
 * QUÉ HACE: Cuenta reservas por estado y resume pagos PAID dentro del período seleccionado.
 * PARA QUÉ SE UTILIZA: Evita que la interfaz conozca consultas SQL o pueda alterar resultados económicos.
 */
export async function getDashboardMetrics(filter: MetricsFilter): Promise<DashboardMetrics> {
  const { range, startsAt, endsBefore } = resolveMetricsRange(filter);
  const reservationDateFilter = startsAt && endsBefore ? { startsAt: { gte: startsAt, lt: endsBefore } } : {};
  const paymentDateFilter = startsAt && endsBefore ? { paidAt: { gte: startsAt, lt: endsBefore } } : {};

  const [totalReservations, reservationsByStatus, approvedPayments, paidPayments] = await Promise.all([
    prisma.reservation.count({ where: reservationDateFilter }),
    prisma.reservation.groupBy({ by: ["status"], where: reservationDateFilter, _count: { _all: true } }),
    prisma.payment.count({ where: { status: PaymentStatus.PAID, ...paymentDateFilter } }),
    prisma.payment.aggregate({ where: { status: PaymentStatus.PAID, ...paymentDateFilter }, _sum: { amount: true } }),
  ]);

  const byStatus: Record<ReservationStatus, number> = {
    PENDING: 0,
    CONFIRMED: 0,
    CANCELED: 0,
    COMPLETED: 0,
  };
  for (const item of reservationsByStatus) byStatus[item.status] = item._count._all;

  return {
    range,
    reservations: { total: totalReservations, byStatus },
    payments: {
      approved: approvedPayments,
      // Decimal se transforma a number antes de cruzar el límite servidor-cliente.
      revenue: Number(paidPayments._sum.amount ?? 0),
    },
  };
}
