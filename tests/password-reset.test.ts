import assert from "node:assert/strict";
import test from "node:test";
import { createPasswordResetToken, hashPasswordResetToken, PASSWORD_RESET_TTL_MS } from "@/lib/password-reset";

test("genera tokens recuperables solo mediante su hash", () => {
  const { token, tokenHash } = createPasswordResetToken();
  assert.ok(token.length >= 40);
  assert.equal(hashPasswordResetToken(token), tokenHash);
  assert.notEqual(token, tokenHash);
});

test("el vencimiento de recuperación es de treinta minutos", () => {
  assert.equal(PASSWORD_RESET_TTL_MS, 30 * 60 * 1000);
});
