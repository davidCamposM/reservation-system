/** Reglas de despliegue sin imprimir valores secretos. Localhost conserva integraciones opcionales. */
export function paymentsEnabled(env: NodeJS.ProcessEnv = process.env) {
  if (env.VERCEL_ENV === "preview") return false;
  return env.PAYMENTS_ENABLED !== "false";
}

export function environmentErrors(env: NodeJS.ProcessEnv = process.env) {
  const errors: string[] = [];
  if (!env.DATABASE_URL) errors.push("DATABASE_URL es obligatoria.");
  const hosted = env.VERCEL_ENV === "production" || env.VERCEL_ENV === "preview";
  if (!hosted) return errors;
  if (!env.DIRECT_URL) errors.push("DIRECT_URL es obligatoria para las migraciones.");
  if (!env.NEXTAUTH_SECRET || env.NEXTAUTH_SECRET.length < 32 || env.NEXTAUTH_SECRET.includes("replace-with")) errors.push("NEXTAUTH_SECRET debe ser un secreto aleatorio de al menos 32 caracteres.");
  for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) {
    try {
      const url = new URL(env[key] || "");
      if (!["postgres:", "postgresql:"].includes(url.protocol) || /localhost|127\.0\.0\.1|\.internal$/.test(url.hostname) || !["require", "verify-full"].includes(url.searchParams.get("sslmode") || "")) errors.push(`${key} requiere una conexión PostgreSQL pública con SSL.`);
    } catch { errors.push(`${key} no es una URL válida.`); }
  }
  if (env.VERCEL_ENV === "production") {
    try { if (new URL(env.NEXTAUTH_URL || "").protocol !== "https:") throw new Error(); } catch { errors.push("NEXTAUTH_URL debe ser la URL HTTPS de producción."); }
    if (!env.RESEND_API_KEY) errors.push("RESEND_API_KEY es obligatoria en producción.");
    if (!env.RESEND_FROM_EMAIL || env.RESEND_FROM_EMAIL.includes("onboarding@resend.dev")) errors.push("RESEND_FROM_EMAIL debe usar el dominio verificado del negocio.");
    if (!env.CRON_SECRET || env.CRON_SECRET.length < 32) errors.push("CRON_SECRET debe tener al menos 32 caracteres.");
  }
  return errors;
}

export function siteUrl() {
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}
