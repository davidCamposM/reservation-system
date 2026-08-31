import { NextResponse } from "next/server";
import { validCronSecret } from "@/lib/cron-auth";
import { runNotificationBatch } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!validCronSecret(request.headers.get("authorization"))) return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  if (process.env.VERCEL_ENV === "preview") return NextResponse.json({ skipped: true });
  try { return NextResponse.json(await runNotificationBatch(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ message: "No fue posible procesar las notificaciones." }, { status: 503 }); }
}
