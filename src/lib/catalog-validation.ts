import { z } from "zod";

/** Los identificadores repetidos se rechazan antes de modificar relaciones. */
const ids = z.array(z.string().trim().min(1).max(100)).max(100).refine((values) => new Set(values).size === values.length, "No se permiten vínculos repetidos.");
export const newServiceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).nullish(),
  durationMins: z.number().int().min(5).max(480),
  price: z.number().int().min(1).max(999999999),
  active: z.boolean().optional(),
}).strict();
export const serviceSchema = newServiceSchema.extend({ professionalIds: ids.optional() });
export const professionalSchema = z.object({
  name: z.string().trim().min(2).max(100),
  bio: z.string().trim().max(1000).nullish(),
  active: z.boolean().optional(),
  serviceIds: ids.optional(),
  newServices: z.array(newServiceSchema).max(10).optional(),
}).strict();
export const updateServiceSchema = serviceSchema.partial().refine((value) => Object.keys(value).length > 0);
export const updateProfessionalSchema = professionalSchema.partial().refine((value) => Object.keys(value).length > 0);
export type ServiceInput = z.infer<typeof serviceSchema>;
export type ProfessionalInput = z.infer<typeof professionalSchema>;
