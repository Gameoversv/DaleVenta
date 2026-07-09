ALTER TABLE tenants
    ADD COLUMN purchase_module_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE suppliers (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID         NOT NULL REFERENCES tenants(id),
    name        VARCHAR(180) NOT NULL,
    contact_name VARCHAR(150),
    phone       VARCHAR(30),
    email       VARCHAR(255),
    address     TEXT,
    tax_id      VARCHAR(30),
    notes       TEXT,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255)
);

CREATE INDEX idx_suppliers_tenant_id ON suppliers(tenant_id);
CREATE UNIQUE INDEX idx_suppliers_tenant_name_active ON suppliers(tenant_id, LOWER(name)) WHERE active = TRUE;

CREATE TABLE purchases (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID          NOT NULL REFERENCES tenants(id),
    purchase_number VARCHAR(30)   NOT NULL,
    supplier_id     UUID          NOT NULL REFERENCES suppliers(id),
    branch_id       UUID          NOT NULL REFERENCES branches(id),
    status          VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    invoice_number  VARCHAR(80),
    purchased_at    TIMESTAMP     NOT NULL,
    received_at     TIMESTAMP,
    notes           TEXT,
    subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_total       NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_total  NUMERIC(12,2) NOT NULL DEFAULT 0,
    total           NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_by_user_id UUID       NOT NULL REFERENCES users(id),
    received_by_user_id UUID      REFERENCES users(id),
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255),
    UNIQUE (tenant_id, purchase_number)
);

CREATE INDEX idx_purchases_tenant_id ON purchases(tenant_id);
CREATE INDEX idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX idx_purchases_branch_id ON purchases(branch_id);

CREATE TABLE purchase_items (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID          NOT NULL REFERENCES tenants(id),
    purchase_id    UUID          NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id     UUID          NOT NULL REFERENCES products(id),
    quantity       INTEGER       NOT NULL CHECK (quantity > 0),
    unit_cost      NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),
    tax_rate       NUMERIC(5,2)  NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    line_total     NUMERIC(12,2) NOT NULL,
    created_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by     VARCHAR(255),
    updated_by     VARCHAR(255)
);

CREATE INDEX idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product_id ON purchase_items(product_id);

INSERT INTO role_permissions (role, code, created_at, updated_at) VALUES
    ('ADMIN', 'SUPPLIER_VIEW', NOW(), NOW()),
    ('ADMIN', 'SUPPLIER_MANAGE', NOW(), NOW()),
    ('ADMIN', 'PURCHASE_VIEW', NOW(), NOW()),
    ('ADMIN', 'PURCHASE_CREATE', NOW(), NOW()),
    ('ADMIN', 'PURCHASE_RECEIVE', NOW(), NOW())
ON CONFLICT (role, code) DO NOTHING;
