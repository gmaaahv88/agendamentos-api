-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "startsAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "endsAt" SET DATA TYPE TIMESTAMPTZ(3);
CREATE EXTENSION IF NOT EXISTS btree_gist;
-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "startsAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "endsAt" SET DATA TYPE TIMESTAMPTZ(3);

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointments"
ADD CONSTRAINT no_overlapping_appointments
EXCLUDE USING gist (
  "userId" WITH =,
  tstzrange("startsAt", "endsAt") WITH &&
);