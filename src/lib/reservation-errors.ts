import { Prisma } from "@prisma/client";

/** PostgreSQL puede comunicar la exclusión como error desconocido de Prisma, no solo como P2002. */
export function isReservationConflict(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) return true;
  const diagnostic = error instanceof Error ? error.message : "";
  return diagnostic.includes("23P01") && diagnostic.includes("Reservation_professional_active_time_no_overlap");
}
