CREATE TABLE purchase_payments (
    id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID          NOT NULL REFERENCES tenants(id),
    purchase_id        UUID          NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    supplier_id        UUID          NOT NULL REFERENCES suppliers(id),
    method             VARCHAR(20)   NOT NULL,
    amount             NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    paid_at            TIMESTAMP     NOT NULL DEFAULT NOW(),
    reference          VARCHAR(120),
    notes              TEXT,
    created_by_user_id UUID          NOT NULL REFERENCES users(id),
    created_at         TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by         VARCHAR(255),
    updated_by         VARCHAR(255)
);

CREATE INDEX idx_purchase_payments_tenant_purchase ON purchase_payments(tenant_id, purchase_id);
CREATE INDEX idx_purchase_payments_supplier_id ON purchase_payments(supplier_id);

INSERT INTO role_permissions (role, code, created_at, updated_at) VALUES
    ('ADMIN', 'PURCHASE_PAYABLE_VIEW', NOW(), NOW()),
    ('ADMIN', 'PURCHASE_PAYMENT_RECORD', NOW(), NOW())
ON CONFLICT (role, code) DO NOTHING;
