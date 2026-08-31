import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/** Business timezone used for every availability and reservation calculation. */
export const BUSINESS_TIME_ZONE = "America/Santiago";
export const SLOT_INTERVAL_MINUTES = 15;

export type AvailableSlot = { startsAt: string; endsAt: string; label: string };

/** Converts a date (YYYY-MM-DD) and time (HH:mm) in Chile into an absolute UTC Date. */
export function chileDateTime(date: string, time: string) {
  return fromZonedTime(`${date}T${time}:00`, BUSINESS_TIME_ZONE);
}

/** Returns ISO weekday 1-7, where Monday is 1. This matches WeeklyAvailability.weekday. */
export function isoWeekday(date: string) {
  return Number(formatInTimeZone(chileDateTime(date, "12:00"), BUSINESS_TIME_ZONE, "i"));
}

/** Adds minutes without mutating the source Date. */
export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

/** Formats a Date as a short customer-facing time in Chile. */
export function formatChileTime(date: Date) {
  return formatInTimeZone(date, BUSINESS_TIME_ZONE, "HH:mm");
}

/** Formats an absolute Date as the local calendar date used by the business. */
export function formatChileDate(date: Date) {
  return formatInTimeZone(date, BUSINESS_TIME_ZONE, "yyyy-MM-dd");
}

/** Verifica que YYYY-MM-DD represente un día real del calendario y no solo una cadena con apariencia válida. */
export function isValidCalendarDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

/** True when two half-open ranges [start, end) collide. */
export function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

/**
 * Builds selectable slots from weekly working hours after excluding blocks and existing reservations.
 * The caller supplies all dates as UTC Date objects, while this function keeps the public labels in Chile time.
 */
export function buildAvailableSlots({ date, durationMins, windows, blockedRanges, occupiedRanges }: {
  date: string;
  durationMins: number;
  windows: Array<{ startTime: string; endTime: string }>;
  blockedRanges: Array<{ startsAt: Date; endsAt: Date }>;
  occupiedRanges: Array<{ startsAt: Date; endsAt: Date }>;
}): AvailableSlot[] {
  /**
   * DESCRIPCIÓN: Índice temporal de horarios candidatos.
   * QUÉ HACE: Usa la fecha-hora de inicio como clave única para cada horario generado.
   * PARA QUÉ SE UTILIZA: Si el administrador define tramos superpuestos, un mismo horario solo aparece una vez.
   */
  const slotsByStart = new Map<string, AvailableSlot>();

  for (const window of windows) {
    const windowStart = chileDateTime(date, window.startTime);
    const windowEnd = chileDateTime(date, window.endTime);

    for (let startsAt = windowStart; addMinutes(startsAt, durationMins) <= windowEnd; startsAt = addMinutes(startsAt, SLOT_INTERVAL_MINUTES)) {
      const endsAt = addMinutes(startsAt, durationMins);
      const hasBlock = blockedRanges.some((block) => overlaps(startsAt, endsAt, block.startsAt, block.endsAt));
      const hasReservation = occupiedRanges.some((reservation) => overlaps(startsAt, endsAt, reservation.startsAt, reservation.endsAt));

      if (!hasBlock && !hasReservation) {
        const slot = {
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          label: formatChileTime(startsAt),
        };

        // set reemplaza una eventual clave repetida sin crear un segundo botón en la agenda.
        slotsByStart.set(slot.startsAt, slot);
      }
    }
  }

  /**
   * DESCRIPCIÓN: Lista final de horarios disponibles.
   * QUÉ HACE: Convierte el índice en arreglo y lo ordena de forma cronológica.
   * PARA QUÉ SE UTILIZA: La interfaz presenta 09:00, 09:15, 09:30... aunque existan ventanas guardadas en otro orden.
   */
  return [...slotsByStart.values()].sort((first, second) => first.startsAt.localeCompare(second.startsAt));
}
