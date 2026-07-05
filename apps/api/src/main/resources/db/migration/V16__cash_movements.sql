CREATE TABLE cash_movements (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID          NOT NULL REFERENCES tenants(id),
    cash_shift_id UUID        NOT NULL REFERENCES cash_shifts(id),
    type        VARCHAR(20)   NOT NULL,
    amount      NUMERIC(14,2) NOT NULL,
    reason      TEXT          NOT NULL,
    user_id     UUID          NOT NULL REFERENCES users(id),
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255)
);

CREATE INDEX idx_cash_movements_tenant_id ON cash_movements(tenant_id);
CREATE INDEX idx_cash_movements_shift_id ON cash_movements(cash_shift_id);

CREATE TABLE cash_movement_denominations (
    id                UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID      NOT NULL REFERENCES tenants(id),
    cash_movement_id  UUID      NOT NULL REFERENCES cash_movements(id),
    denomination_id   UUID      NOT NULL REFERENCES denominations(id),
    quantity          INT       NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by        VARCHAR(255),
    updated_by        VARCHAR(255)
);

CREATE INDEX idx_cmd_movement_id ON cash_movement_denominations(cash_movement_id);
CREATE INDEX idx_cmd_tenant_id ON cash_movement_denominations(tenant_id);
