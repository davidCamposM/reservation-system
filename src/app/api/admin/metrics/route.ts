/**
 * DESCRIPCIÓN: API privada de métricas administrativas.
 * QUÉ HACE: Valida el filtro recibido, comprueba el rol ADMIN y devuelve indicadores calculados en el servidor.
 * PARA QUÉ SE UTILIZA: Permite cambiar el período del dashboard sin exponer la base de datos al navegador.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { METRIC_PERIODS, getDashboardMetrics } from "@/lib/admin-metrics";
import { getAdminSession, unauthorized } from "@/lib/authorization";
import { isValidCalendarDate } from "@/lib/scheduling";

/** Reglas de formato para los parámetros de consulta del dashboard. */
const metricsQuerySchema = z.object({
  period: z.enum(METRIC_PERIODS).default("THIS_MONTH"),
  from: z.string().refine(isValidCalendarDate).optional(),
  to: z.string().refine(isValidCalendarDate).optional(),
});

/** Evita que Next almacene una fotografía antigua de datos administrativos. */
export const dynamic = "force-dynamic";

/**
 * DESCRIPCIÓN: Consulta de indicadores por período.
 * QUÉ HACE: Lee los query params, devuelve errores de validación claros y calcula los resultados actuales.
 * PARA QUÉ SE UTILIZA: El componente MetricsDashboard la consulta al cambiar el filtro de fecha.
 */
export async function GET(request: Request) {
  if (!(await getAdminSession())) return unauthorized();

  const searchParams = Object.fromEntries(new URL(request.url).searchParams);
  const result = metricsQuerySchema.safeParse(searchParams);
  if (!result.success) {
    return NextResponse.json({ message: "El filtro de métricas no tiene un formato válido." }, { status: 400 });
  }

  // Un rango personalizado debe tener ambas fechas y no puede terminar antes de comenzar.
  if (result.data.period === "CUSTOM" && (!result.data.from || !result.data.to || result.data.from > result.data.to)) {
    return NextResponse.json({ message: "Selecciona una fecha inicial y final válidas." }, { status: 400 });
  }

  try {
    const metrics = await getDashboardMetrics(result.data);
    return NextResponse.json({ metrics });
  } catch {
    // Los detalles de base de datos se registran en el servidor y no se exponen a la interfaz administrativa.
    return NextResponse.json({ message: "No fue posible calcular las métricas. Intenta nuevamente." }, { status: 500 });
  }
}
