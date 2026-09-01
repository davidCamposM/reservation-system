import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBody } from "@/lib/http";
import { sendPasswordResetEmail } from "@/lib/notifications";
import { createPasswordResetToken, PASSWORD_RESET_TTL_MS } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({ email: z.string().trim().email() });
const response = { message: "Si existe una cuenta asociada, se enviará un enlace de recuperación a ese correo." };

export async function POST(request: Request) {
  const result = requestSchema.safeParse(await readJsonBody(request));
  if (!result.success) return NextResponse.json({ message: "Ingresa un correo válido." }, { status: 400 });
  try {
    const user = await prisma.user.findUnique({ where: { email: result.data.email.toLowerCase() }, select: { id: true, email: true } });
    if (!user) return NextResponse.json(response);
    const recent = await prisma.passwordResetToken.findFirst({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60_000) } }, select: { id: true } });
    if (recent) return NextResponse.json(response);
    const { token, tokenHash } = createPasswordResetToken();
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS) } }),
    ]);
    try { await sendPasswordResetEmail(user.email, token); } catch { console.error("password_reset_email_failed"); }
    return NextResponse.json(response);
  } catch {
    return NextResponse.json(response);
  }
}
