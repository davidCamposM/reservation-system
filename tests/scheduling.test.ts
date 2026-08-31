/**
 * DESCRIPCIÓN: Pruebas de disponibilidad de agenda.
 * QUÉ HACE: Comprueba la creación de horarios y la exclusión de bloqueos o reservas existentes.
 * PARA QUÉ SE UTILIZA: Evita ofrecer una hora que no cabe en la jornada o que ya está ocupada.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { buildAvailableSlots, chileDateTime, isValidCalendarDate } from "@/lib/scheduling";

const date = "2026-09-01";
const morningWindow = [{ startTime: "09:00", endTime: "10:00" }];

test("genera horarios de 15 minutos que respetan la duración del servicio", () => {
  const slots = buildAvailableSlots({
    date,
    durationMins: 30,
    windows: morningWindow,
    blockedRanges: [],
    occupiedRanges: [],
  });

  assert.deepEqual(slots.map((slot) => slot.label), ["09:00", "09:15", "09:30"]);
});

test("oculta horarios que se cruzan con un bloqueo excepcional", () => {
  const slots = buildAvailableSlots({
    date,
    durationMins: 15,
    windows: morningWindow,
    blockedRanges: [{ startsAt: chileDateTime(date, "09:30"), endsAt: chileDateTime(date, "10:00") }],
    occupiedRanges: [],
  });

  assert.deepEqual(slots.map((slot) => slot.label), ["09:00", "09:15"]);
});

test("oculta horarios que se cruzan con una reserva pendiente o confirmada", () => {
  const slots = buildAvailableSlots({
    date,
    durationMins: 15,
    windows: morningWindow,
    blockedRanges: [],
    occupiedRanges: [{ startsAt: chileDateTime(date, "09:15"), endsAt: chileDateTime(date, "09:30") }],
  });

  assert.deepEqual(slots.map((slot) => slot.label), ["09:00", "09:30", "09:45"]);
});

test("acepta únicamente fechas reales de calendario", () => {
  assert.equal(isValidCalendarDate("2028-02-29"), true);
  assert.equal(isValidCalendarDate("2026-02-29"), false);
  assert.equal(isValidCalendarDate("2026-13-01"), false);
  assert.equal(isValidCalendarDate("2026-09-31"), false);
});
