-- Remove only exact copies created by an earlier seed execution.
-- Different time ranges are preserved so the administrator can still use split schedules.
DELETE FROM "WeeklyAvailability" AS duplicate
USING "WeeklyAvailability" AS original
WHERE duplicate."professionalId" = original."professionalId"
  AND duplicate.weekday = original.weekday
  AND duplicate."startTime" = original."startTime"
  AND duplicate."endTime" = original."endTime"
  AND duplicate.id > original.id;

-- A seed rerun or a repeated save can no longer create the same weekly range twice.
CREATE UNIQUE INDEX "WeeklyAvailability_professionalId_weekday_startTime_endTime_key"
ON "WeeklyAvailability" ("professionalId", weekday, "startTime", "endTime");
