/**
 * DESCRIPCIÓN: Pruebas de lectura segura de solicitudes HTTP.
 * QUÉ HACE: Comprueba que una carga JSON correcta se lea y que una carga malformada no lance una excepción.
 * PARA QUÉ SE UTILIZA: Las rutas API pueden responder con un error 400 controlado cuando un navegador o cliente envía JSON inválido.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readJsonBody } from "@/lib/http";

test("lee un cuerpo JSON válido", async () => {
  const request = new Request("http://localhost/api/example", {
    method: "POST",
    body: JSON.stringify({ name: "ReservaPro" }),
  });

  assert.deepEqual(await readJsonBody(request), { name: "ReservaPro" });
});

test("devuelve null cuando el cuerpo JSON es inválido", async () => {
  const request = new Request("http://localhost/api/example", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{no-es-json}",
  });

  assert.equal(await readJsonBody(request), null);
});
