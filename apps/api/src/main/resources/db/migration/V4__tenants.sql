CREATE TABLE tenants (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(150) NOT NULL,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    logo_url    TEXT,
    address     TEXT,
    city        VARCHAR(100),
    country     VARCHAR(100) NOT NULL DEFAULT 'DO',
    phone       VARCHAR(20),
    email       VARCHAR(255),
    website     VARCHAR(255),
    rnc         VARCHAR(20),
    plan        VARCHAR(20)  NOT NULL DEFAULT 'STARTER',
    status      VARCHAR(20)  NOT NULL DEFAULT 'TRIAL',
    trial_ends_at TIMESTAMP,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255)
);

CREATE INDEX idx_tenants_slug   ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

ALTER TABLE users ADD CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
