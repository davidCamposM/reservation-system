import assert from "node:assert/strict";
import test from "node:test";
import { fallbackRoute, isSafeHistoryRoute, previousRoute, recordRoute } from "../src/lib/navigation";
import { safeCallbackUrl } from "../src/lib/auth-navigation";

test("volver conserva únicamente rutas internas autorizadas", () => {
  assert.deepEqual(recordRoute(["https://webpay.cl", "/api/auth/callback", "/admin", "/catalogo"], "/reservar", "CUSTOMER"), ["/catalogo", "/reservar"]);
  assert.equal(isSafeHistoryRoute("/cuenta?payment=secret", "CUSTOMER"), false);
});
test("regresar recorta el historial sin crear un bucle", () => {
  const history = ["/", "/catalogo", "/reservar"];
  assert.equal(previousRoute(history, "/reservar", "CUSTOMER"), "/catalogo");
  assert.deepEqual(recordRoute(history, "/catalogo", "CUSTOMER"), ["/", "/catalogo"]);
});
test("Webpay siempre sale hacia cuenta o panel, nunca hacia el pago anterior", () => {
  assert.equal(previousRoute(["/reservar"], "/pago/resultado", "CUSTOMER"), "/cuenta");
  assert.equal(previousRoute(["/catalogo"], "/pago/resultado", "ADMIN"), "/admin");
});
test("las entradas directas tienen salidas predecibles", () => {
  assert.equal(fallbackRoute("/admin/agenda", "ADMIN"), "/admin");
  assert.equal(fallbackRoute("/reservar", "CUSTOMER"), "/catalogo");
  assert.equal(fallbackRoute("/ingresar", null), "/");
  assert.equal(isSafeHistoryRoute("/admin", "CUSTOMER"), false);
  assert.equal(isSafeHistoryRoute("/ingresar", "ADMIN"), false);
});
test("login mantiene el servicio sin permitir redirecciones externas", () => {
  assert.equal(safeCallbackUrl("/reservar?service=dental&token=secret"), "/reservar?service=dental");
  for (const path of ["//evil.test", "https://evil.test", "/\\evil.test", "/api/payments/webpay/return"]) assert.equal(safeCallbackUrl(path), "/cuenta");
});
