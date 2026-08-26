import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, unauthorized } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const timeOffSchema = z.object({ professionalId: z.string().min(1), startsAt: z.string().datetime(), endsAt: z.string().datetime(), reason: z.string().trim().max(200).optional() });

/** Creates an exceptional period in which a professional cannot receive bookings. */
export async function POST(request: Request) {
  if (!(await getAdminSession())) return unauthorized();
  const result = timeOffSchema.safeParse(await request.json());
  if (!result.success || new Date(result.data.startsAt) >= new Date(result.data.endsAt)) return NextResponse.json({ message: "Bloqueo de agenda inválido." }, { status: 400 });
  const timeOff = await prisma.timeOff.create({ data: { professionalId: result.data.professionalId, startsAt: new Date(result.data.startsAt), endsAt: new Date(result.data.endsAt), reason: result.data.reason || null } });
  return NextResponse.json({ timeOff }, { status: 201 });
}
