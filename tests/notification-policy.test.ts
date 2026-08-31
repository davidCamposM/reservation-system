import assert from "node:assert/strict";
import test from "node:test";
import { reminderWindow, requiresReconciliation, retryAt } from "../src/lib/notification-policy";
import { validCronSecret } from "../src/lib/cron-auth";
import { environmentErrors, paymentsEnabled } from "../src/lib/environment";

const now = new Date("2030-01-01T12:00:00Z");
test("recordatorios diferidos, programables y fuera de plazo", () => {
  assert.equal(reminderWindow(new Date("2030-03-01T12:00:00Z"), now).action, "defer");
  assert.equal(reminderWindow(new Date("2030-01-03T12:00:00Z"), now).action, "schedule");
  assert.equal(reminderWindow(new Date("2030-01-02T12:00:00Z"), now).action, "skip");
  assert.equal(reminderWindow(new Date("2030-02-01T12:00:00Z"), now).action, "schedule");
});
test("un resultado incierto no se reenvía después de vencer la idempotencia", () => {
  assert.equal(requiresReconciliation(new Date("2029-12-31T12:00:00Z"), now), true);
  assert.equal(requiresReconciliation(now, now), false);
  assert.ok(retryAt(2, now) > now);
});
test("cron cerrado si falta secreto o el token no coincide", () => {
  const secret = "a".repeat(40);
  assert.equal(validCronSecret(null, secret), false);
  assert.equal(validCronSecret("Bearer otro", secret), false);
  assert.equal(validCronSecret(`Bearer ${secret}`, secret), true);
  assert.equal(validCronSecret("Bearer undefined", ""), false);
});
test("previews nunca inician pagos aunque una variable los habilite", () => {
  assert.equal(paymentsEnabled({ VERCEL_ENV: "preview", PAYMENTS_ENABLED: "true" }), false);
  assert.equal(paymentsEnabled({ PAYMENTS_ENABLED: "false" }), false);
  assert.equal(paymentsEnabled({ PAYMENTS_ENABLED: "true" }), true);
});
test("producción rechaza infraestructura local y configuración incompleta", () => {
  assert.ok(environmentErrors({ VERCEL_ENV: "production", DATABASE_URL: "postgresql://localhost/db" }).length >= 5);
  assert.deepEqual(environmentErrors({ DATABASE_URL: "postgresql://localhost/db" }), []);
});
