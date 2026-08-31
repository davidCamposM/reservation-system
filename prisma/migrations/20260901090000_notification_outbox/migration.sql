-- Se conserva el historial anterior y se identifica lo ya aceptado por el proveedor.
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SCHEDULED', 'SENT', 'FAILED', 'CANCELED', 'SKIPPED');
ALTER TABLE "NotificationLog"
  ADD COLUMN "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nextAttemptAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "leaseUntil" TIMESTAMP(3),
  ADD COLUMN "uncertainSince" TIMESTAMP(3),
  ADD COLUMN "lastError" TEXT,
  ADD COLUMN "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "payload" JSONB;
UPDATE "NotificationLog" SET "status" = 'SENT', "nextAttemptAt" = NULL WHERE "sentAt" IS NOT NULL;
UPDATE "NotificationLog" SET "status" = 'SCHEDULED', "nextAttemptAt" = NULL WHERE "sentAt" IS NULL AND "providerId" IS NOT NULL AND "scheduledFor" IS NOT NULL;
CREATE INDEX "NotificationLog_status_nextAttemptAt_idx" ON "NotificationLog"("status", "nextAttemptAt");
