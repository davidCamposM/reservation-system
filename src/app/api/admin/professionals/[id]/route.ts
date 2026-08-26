/**
 * DESCRIPCIÓN: Herramientas necesarias para esta API administrativa.
 * QUÉ HACE: Importa la forma de responder HTTP, la validación de datos,
 *           la comprobación de permisos y la conexión a PostgreSQL mediante Prisma.
 * PARA QUÉ SE UTILIZA: Permite modificar o eliminar un profesional desde el panel /admin.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, unauthorized } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

/**
 * DESCRIPCIÓN: Reglas de validación para actualizar un profesional.
 * QUÉ HACE: Define cuáles campos se aceptan y sus límites antes de guardar cambios.
 * PARA QUÉ SE UTILIZA: Evita almacenar datos incompletos o inválidos enviados desde el navegador.
 * NOTA: Todos los campos son opcionales porque una actualización puede modificar solo uno de ellos.
 */
const updateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  active: z.boolean().optional(),
});




// ACTUALIZAR PROFESIONAL EXISTENTE
//-------------------------------------------------------------------------------------------------------------------
/**
 * DESCRIPCIÓN: Endpoint para actualizar un profesional existente.
 * QUÉ HACE: Recibe una solicitud PATCH, valida al administrador y actualiza los datos del profesional.
 * PARA QUÉ SE UTILIZA: El componente AdminManager lo llama cuando el administrador presiona “Guardar”.
 * RUTA: /api/admin/professionals/[id], donde [id] identifica al profesional que se editará.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  /**
   * DESCRIPCIÓN: Validación del rol del usuario que hizo la solicitud.
   * QUÉ HACE: Busca la sesión actual y confirma que pertenece a un administrador.
   * PARA QUÉ SE UTILIZA: Evita que un cliente, o una persona sin sesión, edite profesionales mediante la API.
   */
  if (!(await getAdminSession())) return unauthorized();

  /**
   * DESCRIPCIÓN: Identificador recibido desde la URL.
   * QUÉ HACE: Extrae el valor de [id] de la ruta solicitada.
   * PARA QUÉ SE UTILIZA: Prisma necesita este id para saber exactamente qué profesional debe actualizar.
   */
  const { id } = await params;

  /**
   * DESCRIPCIÓN: Validación del cuerpo de la solicitud.
   * QUÉ HACE: Lee el JSON enviado por el navegador y lo compara con updateSchema.
   * PARA QUÉ SE UTILIZA: Solo los datos permitidos y bien formados llegan a la base de datos.
   */
  const result = updateSchema.safeParse(await request.json());

  /**
   * DESCRIPCIÓN: Respuesta ante datos inválidos.
   * QUÉ HACE: Devuelve código HTTP 400 con un mensaje que puede mostrar la interfaz.
   * PARA QUÉ SE UTILIZA: Informa que el problema está en los datos recibidos, no en el servidor.
   */
  if (!result.success) {
    return NextResponse.json({ message: "Datos de profesional inválidos." }, { status: 400 });
  }

  try {
    /**
     * DESCRIPCIÓN: Actualización del registro en PostgreSQL.
     * QUÉ HACE: Prisma busca el profesional por id y reemplaza solo los campos validados.
     * PARA QUÉ SE UTILIZA: Guarda cambios como nombre, biografía o estado activo/inactivo.
     */
    const professional = await prisma.professional.update({ where: { id }, data: result.data });

    // Código 200 implícito: comunica que la actualización fue exitosa y devuelve el nuevo registro.
    return NextResponse.json({ professional });
  } catch {
    /**
     * DESCRIPCIÓN: Respuesta cuando el id no existe en la tabla Professional.
     * QUÉ HACE: Devuelve código HTTP 404, que significa “recurso no encontrado”.
     * PARA QUÉ SE UTILIZA: Evita que la API termine con un error técnico difícil de entender.
     */
    return NextResponse.json({ message: "Profesional no encontrado." }, { status: 404 });
  }
}
//-------------------------------------------------------------------------------------------------------------------
















/**
 * DESCRIPCIÓN: Endpoint para eliminar un profesional existente.
 * QUÉ HACE: Recibe una solicitud DELETE y borra el registro indicado por [id].
 * PARA QUÉ SE UTILIZA: El componente AdminManager lo llama después de que el administrador confirma eliminar.
 */
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  /**
   * DESCRIPCIÓN: Validación del rol antes de borrar datos.
   * QUÉ HACE: Permite continuar solo si la sesión actual pertenece a un administrador.
   * PARA QUÉ SE UTILIZA: La eliminación es una acción sensible y no debe estar disponible para clientes.
   */
  if (!(await getAdminSession())) return unauthorized();

  /**
   * DESCRIPCIÓN: Identificador del profesional a eliminar.
   * QUÉ HACE: Obtiene el parámetro [id] desde la URL.
   * PARA QUÉ SE UTILIZA: Define el único registro que Prisma intentará eliminar.
   */
  const { id } = await params;

  try {
    /**
     * DESCRIPCIÓN: Eliminación del registro en PostgreSQL.
     * QUÉ HACE: Prisma elimina el profesional cuyo id coincide con el valor recibido.
     * PARA QUÉ SE UTILIZA: Quita profesionales que ya no deben estar disponibles en el negocio.
     */
    await prisma.professional.delete({ where: { id } });

    // HTTP 204 indica éxito sin enviar contenido adicional en la respuesta.
    return new NextResponse(null, { status: 204 });
  } catch {
    /**
     * DESCRIPCIÓN: Respuesta ante una eliminación que PostgreSQL no permite.
     * QUÉ HACE: Devuelve código HTTP 409, que significa que existe un conflicto con otros datos.
     * PARA QUÉ SE UTILIZA: Protege reservas relacionadas y explica por qué no se puede borrar el profesional.
     */
    return NextResponse.json(
      { message: "No se puede eliminar un profesional que ya posee reservas." },
      { status: 409 },
    );
  }
}
