const DAY = 86_400_000;

/** Resend acepta programación hasta 30 días: las reservas lejanas esperan al proceso diario. */
export function reminderWindow(startsAt: Date, now = new Date()) {
  const scheduledFor = new Date(startsAt.getTime() - DAY);
  if (scheduledFor <= now) return { action: "skip" as const, scheduledFor };
  if (scheduledFor.getTime() > now.getTime() + 30 * DAY) return { action: "defer" as const, scheduledFor };
  return { action: "schedule" as const, scheduledFor };
}

/** Un resultado incierto no vuelve a enviarse fuera de la ventana de idempotencia de 24 horas. */
export function requiresReconciliation(uncertainSince: Date | null, now = new Date()) {
  return !!uncertainSince && now.getTime() - uncertainSince.getTime() >= 23 * 60 * 60_000;
}

export function retryAt(attempts: number, now = new Date()) {
  return new Date(now.getTime() + Math.min(60, 2 ** attempts) * 60_000);
}
