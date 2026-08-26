/**
 * DESCRIPCIÓN: Dependencias de la API que modifica un servicio específico.
 * QUÉ HACE: Importa respuestas HTTP, validación, control de permisos y acceso a PostgreSQL.
 * PARA QUÉ SE UTILIZA: Permite editar o eliminar el servicio identificado por [id] desde /admin.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, unauthorized } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

/**
 * DESCRIPCIÓN: Reglas de validación para una actualización parcial de servicio.
 * QUÉ HACE: Define campos editables, rangos de duración/precio y límites de texto.
 * PARA QUÉ SE UTILIZA: Evita guardar datos incorrectos cuando se modifica nombre, descripción, duración, precio o estado.
 * NOTA: z.coerce.number() transforma valores de formulario, que llegan como texto, a números antes de validarlos.
 */
const updateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  durationMins: z.coerce.number().int().min(15).max(480).optional(),
  price: z.coerce.number().int().min(0).max(10000000).optional(),
  active: z.boolean().optional(),
});









/**
 * DESCRIPCIÓN: Endpoint para actualizar un servicio existente.
 * QUÉ HACE: Procesa una solicitud PATCH, comprueba el rol ADMIN y persiste los campos validados.
 * PARA QUÉ SE UTILIZA: AdminManager lo llama al guardar cambios de nombre, duración, precio o estado de un servicio.
 * RUTA: /api/admin/services/[id].
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  /**
   * DESCRIPCIÓN: Protección de la acción administrativa.
   * QUÉ HACE: Revisa la sesión actual y permite continuar únicamente a usuarios ADMIN.
   * PARA QUÉ SE UTILIZA: Evita que clientes o visitantes alteren el catálogo mediante solicitudes directas a la API.
   */
  if (!(await getAdminSession())) return unauthorized();

  /**
   * DESCRIPCIÓN: Identificador recibido desde la URL.
   * QUÉ HACE: Obtiene el valor de [id] de la ruta solicitada.
   * PARA QUÉ SE UTILIZA: Prisma utiliza este id para encontrar el único servicio que debe modificarse.
   */
  const { id } = await params;

  /**
   * DESCRIPCIÓN: Validación del cuerpo de la solicitud.
   * QUÉ HACE: Lee el JSON enviado por AdminManager y lo verifica con updateSchema.
   * PARA QUÉ SE UTILIZA: Solo los campos permitidos y válidos pueden llegar a PostgreSQL.
   */
  const result = updateSchema.safeParse(await request.json());

  /**
   * DESCRIPCIÓN: Respuesta ante datos inválidos.
   * QUÉ HACE: Devuelve HTTP 400 junto con un mensaje para la interfaz.
   * PARA QUÉ SE UTILIZA: Señala que el administrador debe corregir la información enviada.
   */
  if (!result.success) {
    return NextResponse.json({ message: "Datos de servicio inválidos." }, { status: 400 });
  }

  try {
    /**
     * DESCRIPCIÓN: Actualización del servicio en PostgreSQL.
     * QUÉ HACE: Prisma busca por id y guarda únicamente los datos aprobados por updateSchema.
     * PARA QUÉ SE UTILIZA: Mantiene el catálogo actualizado sin modificar otros servicios.
     */
    const service = await prisma.service.update({ where: { id }, data: result.data });

    // HTTP 200 implícito: devuelve el servicio actualizado para refrescar la interfaz sin recargarla.
    return NextResponse.json({ service });
  } catch {
    /**
     * DESCRIPCIÓN: Respuesta cuando no existe un servicio con el id solicitado.
     * QUÉ HACE: Devuelve HTTP 404, que significa “recurso no encontrado”.
     * PARA QUÉ SE UTILIZA: Entrega un error comprensible en lugar de exponer un error interno de Prisma.
     */
    return NextResponse.json({ message: "Servicio no encontrado." }, { status: 404 });
  }
}













/**
 * DESCRIPCIÓN: Endpoint para eliminar un servicio.
 * QUÉ HACE: Procesa una solicitud DELETE y elimina el servicio indicado por [id].
 * PARA QUÉ SE UTILIZA: AdminManager lo llama después de que el administrador confirma la eliminación.
 */
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  /**
   * DESCRIPCIÓN: Protección de una acción destructiva.
   * QUÉ HACE: Verifica que quien solicita la eliminación tenga rol ADMIN.
   * PARA QUÉ SE UTILIZA: Impide que usuarios sin autorización borren servicios del catálogo.
   */
  if (!(await getAdminSession())) return unauthorized();

  /**
   * DESCRIPCIÓN: Servicio objetivo de la eliminación.
   * QUÉ HACE: Extrae el id de la URL.
   * PARA QUÉ SE UTILIZA: Limita la eliminación al único registro indicado por el administrador.
   */
  const { id } = await params;

  try {
    /**
     * DESCRIPCIÓN: Eliminación del servicio en PostgreSQL.
     * QUÉ HACE: Prisma borra el registro Service cuyo id coincide con el recibido.
     * PARA QUÉ SE UTILIZA: Retira del catálogo servicios que el negocio ya no ofrece.
     */
    await prisma.service.delete({ where: { id } });

    // HTTP 204 indica que la eliminación fue exitosa y no requiere devolver contenido.
    return new NextResponse(null, { status: 204 });
  } catch {
    /**
     * DESCRIPCIÓN: Respuesta ante un conflicto de datos relacionados.
     * QUÉ HACE: Devuelve HTTP 409 si la base no permite borrar el servicio, por ejemplo, porque tiene reservas.
     * PARA QUÉ SE UTILIZA: Protege el historial de reservas y explica el motivo de la operación rechazada.
     */
    return NextResponse.json(
      { message: "No se puede eliminar un servicio que ya posee reservas." },
      { status: 409 },
    );
  }
}
