import assert from "node:assert/strict";
import { after, test } from "node:test";
import type { Resend } from "resend";
import { prisma } from "../../src/lib/prisma";
import { saveProfessional, saveService } from "../../src/lib/admin-catalog";
import { chileDateTime, formatChileDate, isoWeekday } from "../../src/lib/scheduling";
import { processNotification, scheduleReservationReminder, sendPaymentResultEmail, cancelReservationReminder } from "../../src/lib/notifications";

if (!process.env.TEST_DATABASE_NAME?.startsWith("reservapro_test_") || new URL(process.env.DATABASE_URL!).pathname !== `/${process.env.TEST_DATABASE_NAME}`) throw new Error("Estas pruebas solo admiten la base desechable.");
const base = process.env.TEST_BASE_URL!;
after(() => prisma.$disconnect());

/** Cliente HTTP de prueba con cookies propias; no usa sesiones del navegador del desarrollador. */
class Client {
  cookies = new Map<string, string>();
  async request(path: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);
    headers.set("cookie", [...this.cookies].map(([key, value]) => `${key}=${value}`).join("; "));
    const response = await fetch(`${base}${path}`, { ...options, headers, redirect: "manual" });
    for (const item of response.headers.getSetCookie()) { const [pair] = item.split(";"); const index = pair.indexOf("="); this.cookies.set(pair.slice(0, index), pair.slice(index + 1)); }
    return response;
  }
  async login(email: string) {
    const csrf = await (await this.request("/api/auth/csrf")).json();
    await this.request("/api/auth/callback/credentials", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ csrfToken: csrf.csrfToken, email, password: "Testing-only-Reserve24!", json: "true", callbackUrl: `${base}/cuenta` }) });
    const session = await (await this.request("/api/auth/session")).json();
    assert.ok(session.user?.id, "El login debe crear una sesión real.");
  }
  json(path: string, method: string, body: object) { return this.request(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
}

test("API y páginas protegidas rechazan anónimos y clientes sin rol", async () => {
  const guest = new Client(), customer = new Client();
  await customer.login("customer@example.test");
  for (const client of [guest, customer]) {
    for (const path of ["/api/admin/services", "/api/admin/professionals"]) assert.equal((await client.json(path, "POST", {})).status, 403);
    for (const path of ["/api/admin/catalog", "/api/admin/metrics"]) assert.equal((await client.request(path)).status, 403);
    for (const path of ["/api/admin/services/missing", "/api/admin/professionals/missing", "/api/admin/reservations/missing"]) assert.equal((await client.json(path, "PATCH", {})).status, 403);
    for (const path of ["/admin", "/admin/agenda"]) {
      const response = await client.request(path);
      const destination = client === guest ? "/ingresar" : "/cuenta";
      if (response.status === 307) assert.ok(response.headers.get("location")?.endsWith(destination));
      else {
        // App Router puede transmitir la redirección en el HTML si ya inició el stream del layout.
        const html = await response.text();
        assert.ok(html.includes("NEXT_REDIRECT") && html.includes(destination));
        assert.ok(!html.includes("Quién realiza cada servicio"));
      }
    }
  }
  assert.equal((await guest.json("/api/reservations", "POST", {})).status, 401);
  assert.equal((await guest.request("/api/cron/notifications")).status, 401);
});

test("administrador crea profesional y servicio juntos; cliente reserva sin conflictos", async () => {
  const admin = new Client(), customer = new Client();
  await admin.login("admin@example.test"); await customer.login("customer@example.test");
  const response = await admin.json("/api/admin/professionals", "POST", { name: "Pedro Juan", bio: "Dentista", newServices: [{ name: "Clínica dental QA", durationMins: 30, price: 25000 }] });
  assert.equal(response.status, 201);
  const { professional, catalog } = await response.json();
  const service = catalog.services.find((record: { name: string }) => record.name === "Clínica dental QA");
  assert.deepEqual(professional.serviceIds, [service.id]);
  assert.deepEqual(service.professionalIds, [professional.id]);
  const date = formatChileDate(new Date(Date.now() + 7 * 86_400_000));
  assert.equal((await admin.json(`/api/admin/professionals/${professional.id}/availability`, "PUT", { windows: [{ weekday: isoWeekday(date), startTime: "09:00", endTime: "12:00" }] })).status, 200);
  const publicPage = await (await customer.request("/catalogo")).text(); assert.ok(publicPage.includes("Clínica dental QA"));
  const slotsResponse = await customer.request(`/api/availability?serviceId=${service.id}&professionalId=${professional.id}&date=${date}`);
  const { slots } = await slotsResponse.json(); assert.ok(slots.length);
  const payload = { serviceId: service.id, professionalId: professional.id, startsAt: slots[0].startsAt };
  const attempts = await Promise.all([customer.json("/api/reservations", "POST", payload), customer.json("/api/reservations", "POST", payload)]);
  assert.deepEqual(attempts.map((r) => r.status).sort(), [201, 409]);
  assert.equal((await customer.json("/api/reservations", "POST", { ...payload, startsAt: "2020-01-01T12:00:00Z" })).status, 400);
  assert.equal((await admin.json("/api/reservations", "POST", payload)).status, 403);
  assert.equal((await admin.request(`/api/admin/professionals/${professional.id}`, { method: "DELETE" })).status, 409);
  assert.equal((await admin.json(`/api/admin/services/${service.id}`, "PATCH", { professionalIds: [] })).status, 200);
  assert.equal(await prisma.reservation.count({ where: { serviceId: service.id } }), 1);
  assert.equal((await customer.request(`/api/availability?serviceId=${service.id}&professionalId=${professional.id}&date=${date}`)).status, 404);
  await admin.json(`/api/admin/services/${service.id}`, "PATCH", { professionalIds: [professional.id] });
});

test("transacción inválida no deja profesionales ni servicios huérfanos", async () => {
  const before = await prisma.professional.count();
  await assert.rejects(saveProfessional({ name: "No debe existir", serviceIds: ["inexistente"], newServices: [{ name: "Huérfano", price: 100, durationMins: 30 }] }));
  assert.equal(await prisma.professional.count(), before);
  assert.equal(await prisma.service.count({ where: { name: "Huérfano" } }), 0);
});

test("editar desde ambos lados sincroniza vínculos sin duplicarlos", async () => {
  const { professional } = await saveProfessional({ name: "Profesional matriz", serviceIds: [] });
  const { service } = await saveService({ name: "Servicio matriz", price: 18000, durationMins: 30, professionalIds: [professional.id] });
  await saveProfessional({ serviceIds: [service.id] }, professional.id);
  assert.equal(await prisma.serviceProfessional.count({ where: { professionalId: professional.id, serviceId: service.id } }), 1);
  await saveService({ active: false }, service.id);
  assert.equal(await prisma.serviceProfessional.count({ where: { serviceId: service.id } }), 1);
  await saveProfessional({ serviceIds: [] }, professional.id);
  assert.equal(await prisma.serviceProfessional.count({ where: { serviceId: service.id } }), 0);
});

test("JSON inválido recibe un mensaje controlado", async () => {
  const admin = new Client(); await admin.login("admin@example.test");
  const response = await admin.request("/api/admin/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(response.status, 400);
  assert.ok((await response.json()).message);
});

test("notificaciones: idempotencia concurrente, programación, cancelación y recuperación", async () => {
  const { professional } = await saveProfessional({ name: "Profesional correos", newServices: [{ name: "Servicio correos", price: 10000, durationMins: 30 }] });
  const startsAt = chileDateTime(formatChileDate(new Date(Date.now() + 5 * 86_400_000)), "15:00");
  const reservation = await prisma.reservation.create({ data: { customerId: "test-customer", professionalId: professional.id, serviceId: professional.serviceIds[0], serviceName: "Servicio correos", price: 10000, durationMins: 30, startsAt, endsAt: new Date(startsAt.getTime() + 30 * 60_000), status: "CONFIRMED", payment: { create: { buyOrder: "TEST_PAID", status: "PAID", amount: 10000, paidAt: new Date() } } }, include: { customer: true, professional: true, payment: true } });
  let sends = 0, cancels = 0;
  const keys = new Set<string>();
  const fake = { emails: {
    send: async (_payload: unknown, options: { idempotencyKey: string }) => { sends++; keys.add(options.idempotencyKey); return { data: { id: `test-message-${sends}` }, error: null }; },
    cancel: async () => { cancels++; return { data: { id: "canceled" }, error: null }; },
  } } as unknown as Resend;
  await sendPaymentResultEmail(reservation, true); // Sin clave Resend: encola, pero no envía correos reales.
  const approval = await prisma.notificationLog.findFirstOrThrow({ where: { reservationId: reservation.id, type: "PAYMENT_APPROVED" } });
  await Promise.all([processNotification(approval.id, fake), processNotification(approval.id, fake)]);
  assert.equal(sends, 1); assert.equal(keys.size, 1);
  assert.equal((await prisma.notificationLog.findUniqueOrThrow({ where: { id: approval.id } })).status, "SENT");
  await scheduleReservationReminder(reservation);
  const reminder = await prisma.notificationLog.findFirstOrThrow({ where: { reservationId: reservation.id, type: "RESERVATION_REMINDER_24H" } });
  await processNotification(reminder.id, fake);
  assert.equal((await prisma.notificationLog.findUniqueOrThrow({ where: { id: reminder.id } })).status, "SCHEDULED");
  await cancelReservationReminder(reservation.id, fake); assert.equal(cancels, 1);
  assert.equal((await prisma.notificationLog.findUniqueOrThrow({ where: { id: reminder.id } })).status, "CANCELED");
  await prisma.notificationLog.update({ where: { id: approval.id }, data: { providerId: null, status: "FAILED", attempts: 1, nextAttemptAt: new Date(), uncertainSince: new Date(Date.now() - 25 * 60 * 60_000) } });
  await processNotification(approval.id, fake); assert.equal(sends, 2);
  assert.ok((await prisma.notificationLog.findUniqueOrThrow({ where: { id: approval.id } })).lastError?.startsWith("REQUIRES_RECONCILIATION"));
  assert.equal((await prisma.payment.findUniqueOrThrow({ where: { reservationId: reservation.id } })).status, "PAID");
});
