/** Contrato serializable del catálogo administrativo: no expone fechas internas ni Decimal de Prisma. */
export type AdminService = { id: string; name: string; description: string | null; durationMins: number; price: number; active: boolean; professionalIds: string[] };
export type AdminProfessional = { id: string; name: string; bio: string | null; active: boolean; serviceIds: string[]; availabilityCount: number };
export type AdminCatalog = { services: AdminService[]; professionals: AdminProfessional[] };

export function professionalReadiness(professional: AdminProfessional, services: AdminService[]) {
  if (!professional.active) return "Inactivo";
  if (!services.some((service) => service.active && professional.serviceIds.includes(service.id))) return "Sin servicios";
  if (!professional.availabilityCount) return "Sin jornada";
  return "Listo para recibir reservas";
}
