import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().min(8).max(30).optional().or(z.literal("")),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  const result = registrationSchema.safeParse(await readJsonBody(request));
  if (!result.success) return NextResponse.json({ message: "Revisa los datos ingresados." }, { status: 400 });

  const email = result.data.email.toLowerCase();

  try {
    const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (exists) return NextResponse.json({ message: "Ya existe una cuenta con este correo." }, { status: 409 });

    await prisma.user.create({ data: { name: result.data.name, email, phone: result.data.phone || null, passwordHash: await hash(result.data.password, 12) } });
    return NextResponse.json({ message: "Cuenta creada correctamente." }, { status: 201 });
  } catch (error) {
    // La consulta previa evita duplicados en condiciones normales; este control cubre dos registros enviados al mismo tiempo.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Ya existe una cuenta con este correo." }, { status: 409 });
    }
    return NextResponse.json({ message: "No fue posible crear la cuenta. Intenta nuevamente." }, { status: 500 });
  }
}
