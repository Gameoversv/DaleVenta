CREATE TABLE shift_inventory_counts (
    id                UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID      NOT NULL REFERENCES tenants(id),
    cash_shift_id     UUID      NOT NULL REFERENCES cash_shifts(id),
    product_id        UUID      NOT NULL REFERENCES products(id),
    opening_quantity  INT       NOT NULL,
    closing_quantity  INT,
    expected_quantity INT,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by        VARCHAR(255),
    updated_by        VARCHAR(255)
);

CREATE UNIQUE INDEX idx_sic_shift_product ON shift_inventory_counts(cash_shift_id, product_id);
CREATE INDEX idx_sic_tenant_id ON shift_inventory_counts(tenant_id);
