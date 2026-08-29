-- AlterTable
ALTER TABLE "public"."NotificationLog" ADD COLUMN     "providerId" TEXT,
ADD COLUMN     "scheduledFor" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Payment" ADD COLUMN     "expiresAt" TIMESTAMP(3);
