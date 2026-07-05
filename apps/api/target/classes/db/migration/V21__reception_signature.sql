ALTER TABLE receptions
    ADD COLUMN signature_data TEXT,
    ADD COLUMN signed_at TIMESTAMPTZ;
