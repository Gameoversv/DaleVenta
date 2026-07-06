CREATE TABLE audit_logs (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_user_id  UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action         VARCHAR(60)  NOT NULL,
    entity_type    VARCHAR(60)  NOT NULL,
    entity_id      UUID         NOT NULL,
    reason         TEXT,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant_created  ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity          ON audit_logs(tenant_id, entity_type, entity_id);

INSERT INTO role_permissions (role, code, created_at, updated_at) VALUES
    ('ADMIN', 'AUDIT_VIEW', NOW(), NOW())
ON CONFLICT (role, code) DO NOTHING;
