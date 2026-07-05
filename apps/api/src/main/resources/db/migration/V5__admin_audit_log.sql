CREATE TABLE admin_actions (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_email VARCHAR(255) NOT NULL,
    action      VARCHAR(50)  NOT NULL,
    tenant_id   UUID         REFERENCES tenants(id) ON DELETE SET NULL,
    detail      TEXT,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_tenant_id  ON admin_actions(tenant_id);
CREATE INDEX idx_admin_actions_created_at ON admin_actions(created_at DESC);
