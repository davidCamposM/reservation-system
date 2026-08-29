import { IntegrationApiKeys, IntegrationCommerceCodes, WebpayPlus } from "transbank-sdk";

/**
 * DESCRIPCIÓN: Datos mínimos que devuelve Webpay al iniciar una transacción.
 * QUÉ HACE: Describe la dirección de Webpay y el token que el navegador debe enviar mediante un formulario POST.
 * PARA QUÉ SE UTILIZA: Evita que los componentes cliente dependan directamente de los tipos internos del SDK.
 */
export type WebpayStartResponse = {
  token: string;
  url: string;
};

/**
 * DESCRIPCIÓN: Cliente Webpay Plus configurado para integración.
 * QUÉ HACE: Usa las credenciales configuradas en variables de entorno o, si no existen, las credenciales públicas del ambiente de integración del SDK oficial.
 * PARA QUÉ SE UTILIZA: Mantiene las claves fuera del código productivo y permite demostrar el flujo local sin usar credenciales reales.
 */
export function getWebpayTransaction() {
  const commerceCode = process.env.WEBPAY_COMMERCE_CODE || IntegrationCommerceCodes.WEBPAY_PLUS;
  const apiKey = process.env.WEBPAY_API_KEY || IntegrationApiKeys.WEBPAY;

  return WebpayPlus.Transaction.buildForIntegration(String(commerceCode), apiKey);
}

/**
 * DESCRIPCIÓN: Generador de órdenes de compra únicas y cortas.
 * QUÉ HACE: Combina tiempo y aleatoriedad sin superar el límite permitido por Webpay para buy_order.
 * PARA QUÉ SE UTILIZA: Cada intento de pago debe tener una orden distinguible para relacionarlo con un registro Payment.
 */
export function createBuyOrder() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `RP${timestamp}${random}`;
}

/**
 * DESCRIPCIÓN: Evaluación del resultado autorizado por Webpay.
 * QUÉ HACE: Comprueba simultáneamente el estado de autorización y el código de respuesta exitoso.
 * PARA QUÉ SE UTILIZA: Un token válido no basta para confirmar una reserva; el pago debe haber sido efectivamente aprobado.
 */
export function isWebpayApproved(response: { status?: string; responseCode?: number | string }) {
  return response.status === "AUTHORIZED" && Number(response.responseCode) === 0;
}

/**
 * DESCRIPCIÓN: Construcción de la URL de retorno desde Webpay.
 * QUÉ HACE: Usa NEXTAUTH_URL cuando está configurada y, de otro modo, toma el origen de la solicitud que inició el pago.
 * PARA QUÉ SE UTILIZA: Webpay necesita una dirección absoluta a la cual devolver el navegador después de pagar, rechazar o abandonar.
 */
export function getWebpayReturnUrl(requestUrl: string) {
  const applicationUrl = process.env.NEXTAUTH_URL || new URL(requestUrl).origin;
  return `${applicationUrl.replace(/\/$/, "")}/api/payments/webpay/return`;
}
