/**
 * DESCRIPCIÓN: Dependencias de la API que crea servicios.
 * QUÉ HACE: Importa respuestas HTTP, validación de datos, comprobación de permisos y Prisma.
 * PARA QUÉ SE UTILIZA: Permite que el administrador agregue servicios al catálogo de ReservaPro.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, unauthorized } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

/**
 * DESCRIPCIÓN: Reglas obligatorias de un nuevo servicio.
 * QUÉ HACE: Valida nombre, descripción opcional, duración y precio antes de crear un registro.
 * PARA QUÉ SE UTILIZA: Mantiene un catálogo consistente y evita precios o duraciones inválidas.
 * NOTA: price se guarda como entero en CLP; por ejemplo, 18000 representa $18.000.
 */
const serviceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  durationMins: z.coerce.number().int().min(15).max(480),
  price: z.coerce.number().int().min(0).max(10000000),
});

/**
 * DESCRIPCIÓN: Endpoint para crear un servicio del negocio.
 * QUÉ HACE: Recibe una solicitud POST, valida la sesión administrativa y guarda el nuevo servicio.
 * PARA QUÉ SE UTILIZA: AdminManager lo llama cuando se envía el formulario “Agregar servicio”.
 * RUTA: /api/admin/services.
 */
export async function POST(request: Request) {
  /**
   * DESCRIPCIÓN: Control de acceso administrativo.
   * QUÉ HACE: Recupera la sesión actual y permite seguir solo si pertenece a un ADMIN.
   * PARA QUÉ SE UTILIZA: Protege el catálogo de modificaciones realizadas por visitantes o clientes.
   */
  if (!(await getAdminSession())) return unauthorized();

  /**
   * DESCRIPCIÓN: Validación de los datos enviados desde el formulario.
   * QUÉ HACE: Lee el cuerpo JSON y lo verifica contra serviceSchema.
   * PARA QUÉ SE UTILIZA: Comprueba que nombre, duración y precio sean seguros y válidos antes de guardarlos.
   */
  const result = serviceSchema.safeParse(await request.json());

  /**
   * DESCRIPCIÓN: Respuesta cuando la información del servicio es inválida.
   * QUÉ HACE: Envía HTTP 400 y un mensaje que puede mostrar el panel administrativo.
   * PARA QUÉ SE UTILIZA: Informa que los datos deben corregirse sin crear un registro incompleto.
   */
  if (!result.success) {
    return NextResponse.json({ message: "Revisa nombre, duración y precio." }, { status: 400 });
  }

  /**
   * DESCRIPCIÓN: Creación del registro Service en PostgreSQL.
   * QUÉ HACE: Prisma inserta los datos validados en la tabla Service.
   * PARA QUÉ SE UTILIZA: Hace que el nuevo servicio quede disponible para su gestión y, más adelante, para reservas.
   * NOTA: Una descripción vacía se convierte a null para representar que el servicio no tiene descripción.
   */
  const service = await prisma.service.create({
    data: {
      ...result.data,
      description: result.data.description || null,
    },
  });

  /**
   * DESCRIPCIÓN: Respuesta de creación exitosa.
   * QUÉ HACE: Devuelve el nuevo servicio y HTTP 201, que significa “recurso creado”.
   * PARA QUÉ SE UTILIZA: AdminManager agrega el servicio a la lista sin tener que recargar la página.
   */
  return NextResponse.json({ service }, { status: 201 });
}
