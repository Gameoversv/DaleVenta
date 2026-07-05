CREATE TABLE inventory_movements (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID        NOT NULL REFERENCES tenants(id),
    branch_inventory_id UUID        NOT NULL REFERENCES branch_inventory(id),
    type                VARCHAR(20) NOT NULL,
    quantity            INT         NOT NULL,
    previous_stock      INT         NOT NULL,
    new_stock           INT         NOT NULL,
    reason              TEXT        NOT NULL,
    user_id             UUID        NOT NULL REFERENCES users(id),
    created_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(255),
    updated_by          VARCHAR(255)
);

CREATE INDEX idx_inventory_movements_tenant_id ON inventory_movements(tenant_id);
CREATE INDEX idx_inventory_movements_branch_inventory_id ON inventory_movements(branch_inventory_id);
