/**
 * DESCRIPCIÓN: Cliente central de Prisma para acceder a PostgreSQL.
 * QUÉ HACE: Crea una sola instancia reutilizable de PrismaClient durante el desarrollo.
 * PARA QUÉ SE UTILIZA: Evita abrir conexiones adicionales cada vez que Next.js vuelve a cargar un archivo.
 */
import { PrismaClient } from "@prisma/client";

/**
 * DESCRIPCIÓN: Espacio global temporal para el cliente Prisma.
 * QUÉ HACE: Declara que el objeto global puede guardar una propiedad prisma.
 * PARA QUÉ SE UTILIZA: Next.js reutiliza esta conexión en desarrollo en lugar de crear una por cada recarga.
 */
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

/**
 * DESCRIPCIÓN: Instancia usada por el resto del sistema para consultar la base de datos.
 * QUÉ HACE: Reutiliza la instancia global si existe; si no, crea una nueva PrismaClient.
 * PARA QUÉ SE UTILIZA: Archivos como auth.ts y las rutas API importan prisma desde aquí.
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

/**
 * DESCRIPCIÓN: Conservación de la instancia en modo desarrollo.
 * QUÉ HACE: Guarda prisma en global cuando NODE_ENV no es production.
 * PARA QUÉ SE UTILIZA: Previene advertencias de demasiadas conexiones al editar archivos con el servidor local activo.
 */
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
