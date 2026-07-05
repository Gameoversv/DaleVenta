-- Tenants table and SUPER_ADMIN role

INSERT INTO roles (id, name, created_at, updated_at)
VALUES (gen_random_uuid(), 'SUPER_ADMIN', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

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

-- Default development tenant
INSERT INTO tenants (id, name, slug, plan, status, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Taller Demo',
    'taller-demo',
    'ENTERPRISE',
    'ACTIVE',
    NOW(),
    NOW()
);
