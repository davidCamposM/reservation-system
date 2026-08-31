import type { Prisma } from "@prisma/client";

/** Publicación mínima común al catálogo y a la reserva. La API vuelve a validar antes de guardar. */
export const publicServiceWhere = { active: true, professionals: { some: { professional: { active: true } } } } satisfies Prisma.ServiceWhereInput;
