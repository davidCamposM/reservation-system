import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().min(8).max(30).optional().or(z.literal("")),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  const result = registrationSchema.safeParse(await request.json());
  if (!result.success) return NextResponse.json({ message: "Revisa los datos ingresados." }, { status: 400 });

  const email = result.data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return NextResponse.json({ message: "Ya existe una cuenta con este correo." }, { status: 409 });

  await prisma.user.create({ data: { name: result.data.name, email, phone: result.data.phone || null, passwordHash: await hash(result.data.password, 12) } });
  return NextResponse.json({ message: "Cuenta creada correctamente." }, { status: 201 });
}
