import { NextResponse } from "next/server";
import { getAdminSession, unauthorized } from "@/lib/authorization";
import { getAdminCatalog } from "@/lib/admin-catalog";
import { catalogErrorResponse } from "@/lib/catalog-api";

export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await getAdminSession())) return unauthorized();
  try { return NextResponse.json({ catalog: await getAdminCatalog() }); }
  catch (error) { return catalogErrorResponse(error); }
}
