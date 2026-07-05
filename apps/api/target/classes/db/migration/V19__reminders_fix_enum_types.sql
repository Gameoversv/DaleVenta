-- Convert custom enum types to VARCHAR to match project convention
ALTER TABLE reminders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE reminders ALTER COLUMN type   TYPE VARCHAR(30) USING type::text;
ALTER TABLE reminders ALTER COLUMN status TYPE VARCHAR(20) USING status::text;
ALTER TABLE reminders ALTER COLUMN status SET DEFAULT 'UPCOMING';

DROP TYPE IF EXISTS reminder_type   CASCADE;
DROP TYPE IF EXISTS reminder_status CASCADE;
