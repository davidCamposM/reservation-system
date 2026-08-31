import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminCatalog } from "@/lib/catalog-types";
import type { ProfessionalInput, ServiceInput } from "@/lib/catalog-validation";

/** Una consulta compartida mantiene sincronizadas las fichas y la matriz tras cada cambio. */
export async function getAdminCatalog(db: Prisma.TransactionClient = prisma): Promise<AdminCatalog> {
  const [services, professionals] = await Promise.all([
    db.service.findMany({ orderBy: { name: "asc" }, include: { professionals: { select: { professionalId: true } } } }),
    db.professional.findMany({ orderBy: { name: "asc" }, include: { services: { select: { serviceId: true } }, _count: { select: { availability: true } } } }),
  ]);
  return {
    services: services.map((s) => ({ id: s.id, name: s.name, description: s.description, durationMins: s.durationMins, price: Number(s.price), active: s.active, professionalIds: s.professionals.map((p) => p.professionalId) })),
    professionals: professionals.map((p) => ({ id: p.id, name: p.name, bio: p.bio, active: p.active, serviceIds: p.services.map((s) => s.serviceId), availabilityCount: p._count.availability })),
  };
}

export class CatalogError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** Reintenta conflictos de escritura; una operación guarda todos sus vínculos o no guarda ninguno. */
async function atomic<T>(work: (db: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: "Serializable" }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
  throw new CatalogError("Otro administrador modificó el catálogo. Actualiza la página.", 409);
}

export async function saveService(input: Partial<ServiceInput>, id?: string) {
  return atomic(async (db) => {
    const { professionalIds, ...fields } = input;
    if (professionalIds && await db.professional.count({ where: { id: { in: professionalIds } } }) !== professionalIds.length) throw new CatalogError("Algún profesional ya no existe. Actualiza el catálogo.", 409);
    const record = id
      ? await db.service.update({ where: { id }, data: fields })
      : await db.service.create({ data: fields as ServiceInput });
    if (professionalIds !== undefined) {
      await db.serviceProfessional.deleteMany({ where: { serviceId: record.id, professionalId: { notIn: professionalIds } } });
      await db.serviceProfessional.createMany({ data: professionalIds.map((professionalId) => ({ serviceId: record.id, professionalId })), skipDuplicates: true });
    }
    const catalog = await getAdminCatalog(db);
    return { service: catalog.services.find((service) => service.id === record.id)!, catalog };
  });
}

export async function saveProfessional(input: Partial<ProfessionalInput>, id?: string) {
  return atomic(async (db) => {
    const { serviceIds, newServices = [], ...fields } = input;
    if (serviceIds && await db.service.count({ where: { id: { in: serviceIds } } }) !== serviceIds.length) throw new CatalogError("Algún servicio ya no existe. Actualiza el catálogo.", 409);
    const record = id
      ? await db.professional.update({ where: { id }, data: fields })
      : await db.professional.create({ data: fields as { name: string; bio?: string | null; active?: boolean } });
    const createdIds: string[] = [];
    for (const service of newServices) createdIds.push((await db.service.create({ data: service })).id);
    if (serviceIds !== undefined) await db.serviceProfessional.deleteMany({ where: { professionalId: record.id, serviceId: { notIn: serviceIds } } });
    await db.serviceProfessional.createMany({ data: [...(serviceIds ?? []), ...createdIds].map((serviceId) => ({ professionalId: record.id, serviceId })), skipDuplicates: true });
    const catalog = await getAdminCatalog(db);
    return { professional: catalog.professionals.find((professional) => professional.id === record.id)!, catalog };
  });
}
