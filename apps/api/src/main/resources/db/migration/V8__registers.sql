CREATE TABLE registers (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID         NOT NULL REFERENCES tenants(id),
    branch_id  UUID         NOT NULL REFERENCES branches(id),
    name       VARCHAR(150) NOT NULL,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE INDEX idx_registers_tenant_id ON registers(tenant_id);
CREATE INDEX idx_registers_branch_id ON registers(branch_id);
