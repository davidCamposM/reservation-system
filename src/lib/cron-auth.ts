import { timingSafeEqual } from "node:crypto";

export function validCronSecret(header: string | null, secret = process.env.CRON_SECRET) {
  if (!secret || secret.length < 32 || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
