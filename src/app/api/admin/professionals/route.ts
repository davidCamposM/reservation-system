/**
 * DESCRIPCIÓN: Herramientas necesarias para crear profesionales desde la API.
 * QUÉ HACE: Importa respuestas HTTP, validación de datos, autorización y Prisma.
 * PARA QUÉ SE UTILIZA: Permite que el panel administrativo guarde nuevos profesionales en PostgreSQL.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, unauthorized } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

/**
 * DESCRIPCIÓN: Reglas que debe cumplir un nuevo profesional.
 * QUÉ HACE: Exige un nombre entre 2 y 100 caracteres y acepta una biografía breve opcional.
 * PARA QUÉ SE UTILIZA: Evita guardar registros sin nombre o textos demasiado extensos.
 * NOTA: trim() elimina espacios al inicio y final antes de validar el dato.
 */
const professionalSchema = z.object({
  name: z.string().trim().min(2).max(100),
  bio: z.string().trim().max(500).optional(),
});

/**
 * DESCRIPCIÓN: Endpoint para crear un nuevo profesional.
 * QUÉ HACE: Recibe una solicitud POST, valida al administrador y almacena el profesional en la base de datos.
 * PARA QUÉ SE UTILIZA: AdminManager llama esta ruta cuando el administrador usa el formulario “Agregar profesional”.
 * RUTA: /api/admin/professionals.
 */
export async function POST(request: Request) {
  /**
   * DESCRIPCIÓN: Comprobación de permisos administrativos.
   * QUÉ HACE: Recupera la sesión actual y permite continuar solo si su rol es ADMIN.
   * PARA QUÉ SE UTILIZA: Impide que clientes o visitantes agreguen profesionales mediante una llamada directa a la API.
   */
  if (!(await getAdminSession())) return unauthorized();

  /**
   * DESCRIPCIÓN: Lectura y validación de los datos enviados por el formulario.
   * QUÉ HACE: Convierte el cuerpo de la solicitud a JSON y lo compara con professionalSchema.
   * PARA QUÉ SE UTILIZA: Garantiza que solo lleguen a PostgreSQL campos permitidos y correctamente formados.
   */
  const result = professionalSchema.safeParse(await request.json());

  /**
   * DESCRIPCIÓN: Respuesta cuando los datos no cumplen las reglas.
   * QUÉ HACE: Devuelve código HTTP 400 y un mensaje entendible para la interfaz.
   * PARA QUÉ SE UTILIZA: Indica que la solicitud del navegador debe corregirse antes de volver a enviarla.
   */
  if (!result.success) {
    return NextResponse.json({ message: "Revisa el nombre del profesional." }, { status: 400 });
  }

  /**
   * DESCRIPCIÓN: Creación del registro Professional en PostgreSQL.
   * QUÉ HACE: Prisma inserta un profesional con el nombre y biografía validados.
   * PARA QUÉ SE UTILIZA: Guarda permanentemente el profesional para que luego pueda asignarse a servicios y horarios.
   * NOTA: Si bio llega vacía, se almacena null para representar que no existe una biografía.
   */
  const professional = await prisma.professional.create({
    data: {
      name: result.data.name,
      bio: result.data.bio || null,
    },
  });

  /**
   * DESCRIPCIÓN: Respuesta de creación exitosa.
   * QUÉ HACE: Devuelve el profesional recién creado junto con el código HTTP 201.
   * PARA QUÉ SE UTILIZA: AdminManager agrega inmediatamente el nuevo registro a la lista visible, sin recargar la página.
   */
  return NextResponse.json({ professional }, { status: 201 });
}
