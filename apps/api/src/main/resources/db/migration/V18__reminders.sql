CREATE TYPE reminder_type AS ENUM (
    'OIL_CHANGE',
    'BRAKE_SERVICE',
    'COOLANT_CHANGE',
    'TIMING_BELT',
    'ALIGNMENT_BALANCE',
    'GENERAL_INSPECTION',
    'OTHER'
);

CREATE TYPE reminder_status AS ENUM ('UPCOMING', 'DUE_SOON', 'OVERDUE', 'COMPLETED');

CREATE TABLE reminders (
    id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID             NOT NULL,
    vehicle_id      UUID             NOT NULL REFERENCES vehicles(id),
    type            reminder_type    NOT NULL,
    custom_label    VARCHAR(200),
    last_service_km INTEGER,
    last_service_at DATE,
    interval_km     INTEGER,
    interval_days   INTEGER,
    next_km         INTEGER,
    next_date       DATE,
    status          reminder_status  NOT NULL DEFAULT 'UPCOMING',
    notes           TEXT,
    active          BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP        NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP        NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255)
);

CREATE INDEX idx_reminders_tenant_id  ON reminders(tenant_id);
CREATE INDEX idx_reminders_vehicle_id ON reminders(vehicle_id);
CREATE INDEX idx_reminders_status     ON reminders(tenant_id, status) WHERE active = TRUE;
CREATE INDEX idx_reminders_next_date  ON reminders(tenant_id, next_date) WHERE active = TRUE;
