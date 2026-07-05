CREATE TABLE receptions (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id       UUID         NOT NULL REFERENCES vehicles(id),
    entry_km         INTEGER      NOT NULL,
    reported_problem TEXT         NOT NULL,
    checklist        JSONB        NOT NULL DEFAULT '{}',
    photos           JSONB        NOT NULL DEFAULT '[]',
    notes            TEXT,
    active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_by       VARCHAR(255),
    updated_by       VARCHAR(255)
);

CREATE INDEX idx_receptions_vehicle_id ON receptions(vehicle_id);
CREATE INDEX idx_receptions_created_at ON receptions(created_at DESC);
