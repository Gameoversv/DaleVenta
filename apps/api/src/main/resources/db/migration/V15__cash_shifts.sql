CREATE TABLE cash_shifts (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID          NOT NULL REFERENCES tenants(id),
    register_id    UUID          NOT NULL REFERENCES registers(id),
    status         VARCHAR(10)   NOT NULL,
    opened_by      UUID          NOT NULL REFERENCES users(id),
    opened_at      TIMESTAMP     NOT NULL,
    closed_at      TIMESTAMP,
    opening_total  NUMERIC(14,2) NOT NULL,
    expected_cash  NUMERIC(14,2),
    counted_cash   NUMERIC(14,2),
    cash_difference NUMERIC(14,2),
    closing_notes  TEXT,
    created_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by     VARCHAR(255),
    updated_by     VARCHAR(255)
);

CREATE INDEX idx_cash_shifts_tenant_id ON cash_shifts(tenant_id);
CREATE INDEX idx_cash_shifts_register_id ON cash_shifts(register_id);
CREATE UNIQUE INDEX idx_cash_shifts_one_open_per_register ON cash_shifts(register_id) WHERE status = 'OPEN';

CREATE TABLE cash_shift_denominations (
    id               UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID      NOT NULL REFERENCES tenants(id),
    cash_shift_id    UUID      NOT NULL REFERENCES cash_shifts(id),
    denomination_id  UUID      NOT NULL REFERENCES denominations(id),
    opening_quantity INT       NOT NULL DEFAULT 0,
    current_quantity INT       NOT NULL DEFAULT 0,
    closing_quantity INT,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by       VARCHAR(255),
    updated_by       VARCHAR(255)
);

CREATE UNIQUE INDEX idx_csd_shift_denom ON cash_shift_denominations(cash_shift_id, denomination_id);
CREATE INDEX idx_csd_tenant_id ON cash_shift_denominations(tenant_id);
