/**
 * DESCRIPCIÓN: Utilidades defensivas para entradas y respuestas HTTP.
 * QUÉ HACE: Evita que un JSON malformado provoque una excepción sin controlar en una ruta API.
 * PARA QUÉ SE UTILIZA: Las rutas devuelven errores 400 comprensibles en vez de respuestas 500 por datos inválidos.
 */

/** Lee un cuerpo JSON; devuelve null cuando el formato no se puede interpretar. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** Obtiene un mensaje seguro de una respuesta API sin asumir que el cuerpo sea JSON válido. */
export function getResponseMessage(payload: unknown, fallback: string) {
  if (
    payload
    && typeof payload === "object"
    && "message" in payload
    && typeof payload.message === "string"
  ) {
    return payload.message;
  }

  return fallback;
}
