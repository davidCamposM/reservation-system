import assert from "node:assert/strict";
import test from "node:test";
import { professionalSchema, serviceSchema, updateProfessionalSchema, updateServiceSchema } from "../src/lib/catalog-validation";
import { professionalReadiness } from "../src/lib/catalog-types";

const service = { id: "s", name: "Clínica dental", price: 25000, durationMins: 30, active: true, description: null, professionalIds: ["p"] };
test("profesional permite vincular existentes y crear varios servicios", () => {
  assert.equal(professionalSchema.safeParse({ name: "Pedro Juan", serviceIds: ["s"], newServices: [{ name: "Limpieza dental", price: 30000, durationMins: 45 }] }).success, true);
});
test("rechaza duplicados, importes inválidos y campos desconocidos", () => {
  assert.equal(professionalSchema.safeParse({ name: "Pedro", serviceIds: ["s", "s"] }).success, false);
  assert.equal(serviceSchema.safeParse({ name: "Dental", price: -1, durationMins: 30 }).success, false);
  assert.equal(professionalSchema.safeParse({ name: "Pedro", role: "ADMIN" }).success, false);
  assert.equal(updateServiceSchema.safeParse({}).success, false);
});
test("omitir relaciones no equivale a desvincular todas", () => {
  assert.equal(updateProfessionalSchema.parse({ active: false }).serviceIds, undefined);
  assert.deepEqual(updateProfessionalSchema.parse({ serviceIds: [] }).serviceIds, []);
});
test("preparación del profesional considera servicios activos y jornada", () => {
  const professional = { id: "p", name: "Pedro", bio: null, active: true, availabilityCount: 0, serviceIds: [] as string[] };
  assert.equal(professionalReadiness(professional, [service]), "Sin servicios");
  assert.equal(professionalReadiness({ ...professional, serviceIds: ["s"] }, [service]), "Sin jornada");
  assert.equal(professionalReadiness({ ...professional, serviceIds: ["s"], availabilityCount: 1 }, [service]), "Listo para recibir reservas");
  assert.equal(professionalReadiness({ ...professional, serviceIds: ["s"], availabilityCount: 1 }, [{ ...service, active: false }]), "Sin servicios");
});
