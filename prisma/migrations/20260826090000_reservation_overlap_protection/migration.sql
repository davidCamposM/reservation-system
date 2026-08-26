-- A professional cannot hold two active reservations whose time ranges overlap.
-- PENDING reservations also occupy their slot until they expire or are cancelled.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Reservation"
ADD CONSTRAINT "Reservation_professional_active_time_no_overlap"
EXCLUDE USING GIST (
  "professionalId" WITH =,
  tsrange("startsAt", "endsAt", '[)') WITH &&
)
WHERE ("status" IN ('PENDING', 'CONFIRMED'));
