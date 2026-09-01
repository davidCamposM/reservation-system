import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBody } from "@/lib/http";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

const resetSchema = z.object({ token: z.string().min(40).max(200), password: z.string().min(8).max(72) });

export async function POST(request: Request) {
  const result = resetSchema.safeParse(await readJsonBody(request));
  if (!result.success) return NextResponse.json({ message: "Revisa la contraseña ingresada." }, { status: 400 });
  try {
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashPasswordResetToken(result.data.token) }, select: { id: true, userId: true, expiresAt: true, usedAt: true } });
    if (!record || record.usedAt || record.expiresAt <= new Date()) return NextResponse.json({ message: "El enlace no es válido o ya venció. Solicita uno nuevo." }, { status: 400 });
    const consumed = await prisma.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (!consumed.count) return NextResponse.json({ message: "El enlace no es válido o ya venció. Solicita uno nuevo." }, { status: 400 });
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await hash(result.data.password, 12) } }),
      prisma.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() } }),
    ]);
    return NextResponse.json({ message: "Contraseña actualizada correctamente." });
  } catch {
    return NextResponse.json({ message: "No fue posible restablecer la contraseña. Solicita un enlace nuevo." }, { status: 500 });
  }
}
