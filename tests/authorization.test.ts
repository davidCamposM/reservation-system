/**
 * DESCRIPCIÓN: Pruebas de la regla de acceso administrativo.
 * QUÉ HACE: Comprueba que solo el rol ADMIN cumple la condición usada por las rutas protegidas.
 * PARA QUÉ SE UTILIZA: Evita que un cliente o un valor manipulado obtenga acceso a la API administrativa.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { hasAdminRole } from "@/lib/authorization";

test("permite únicamente el rol ADMIN", () => {
  assert.equal(hasAdminRole("ADMIN"), true);
  assert.equal(hasAdminRole("CUSTOMER"), false);
  assert.equal(hasAdminRole(undefined), false);
  assert.equal(hasAdminRole("admin"), false);
});
