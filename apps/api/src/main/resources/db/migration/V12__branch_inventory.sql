CREATE TABLE branch_inventory (
    id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID    NOT NULL REFERENCES tenants(id),
    branch_id     UUID    NOT NULL REFERENCES branches(id),
    product_id    UUID    NOT NULL REFERENCES products(id),
    current_stock INT     NOT NULL DEFAULT 0,
    min_stock     INT     NOT NULL DEFAULT 0,
    max_stock     INT,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by    VARCHAR(255),
    updated_by    VARCHAR(255)
);

CREATE UNIQUE INDEX idx_branch_inventory_branch_product ON branch_inventory(branch_id, product_id);
CREATE INDEX idx_branch_inventory_tenant_id ON branch_inventory(tenant_id);
