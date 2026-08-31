/**
 * DESCRIPCIÓN: Pruebas de validación del resultado de Webpay.
 * QUÉ HACE: Comprueba que solo una respuesta autorizada, con monto y orden correctos, apruebe el pago local.
 * PARA QUÉ SE UTILIZA: Previene el error en que nombres de campos de Transbank mal interpretados rechazan pagos válidos.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { evaluateWebpayCommit } from "@/lib/webpay";

const expectedPayment = { buyOrder: "RPORDER123", amount: 25000 };

test("aprueba una respuesta Webpay autorizada con orden y monto coincidentes", () => {
  const result = evaluateWebpayCommit({
    status: "AUTHORIZED",
    response_code: 0,
    buy_order: "RPORDER123",
    amount: 25000,
    authorization_code: "123456",
  }, expectedPayment);

  assert.deepEqual(result, { approved: true, authorizationId: "123456" });
});

test("rechaza una respuesta autorizada si la orden no corresponde al pago", () => {
  const result = evaluateWebpayCommit({
    status: "AUTHORIZED",
    response_code: 0,
    buy_order: "OTHER-ORDER",
    amount: 25000,
  }, expectedPayment);

  assert.equal(result.approved, false);
});

test("rechaza una respuesta Webpay con código de rechazo", () => {
  const result = evaluateWebpayCommit({
    status: "AUTHORIZED",
    response_code: -1,
    buy_order: "RPORDER123",
    amount: 25000,
  }, expectedPayment);

  assert.equal(result.approved, false);
});
