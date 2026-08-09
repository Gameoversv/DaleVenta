CREATE TABLE user_branch_assignments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id  UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    CONSTRAINT uq_user_branch_assignments UNIQUE (user_id, branch_id)
);

CREATE INDEX idx_user_branch_assignments_user_id ON user_branch_assignments(user_id);
CREATE INDEX idx_user_branch_assignments_branch_id ON user_branch_assignments(branch_id);

CREATE TABLE user_register_assignments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    register_id UUID NOT NULL REFERENCES registers(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255),
    CONSTRAINT uq_user_register_assignments UNIQUE (user_id, register_id)
);

CREATE INDEX idx_user_register_assignments_user_id ON user_register_assignments(user_id);
CREATE INDEX idx_user_register_assignments_register_id ON user_register_assignments(register_id);

-- Preserve access for cashiers that existed before scoped assignments were introduced. New
-- cashiers stay unassigned until an administrator explicitly grants their locations and registers.
INSERT INTO user_branch_assignments (id, user_id, branch_id, created_at, updated_at)
SELECT gen_random_uuid(), u.id, b.id, NOW(), NOW()
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id AND r.name = 'CASHIER'
JOIN branches b ON b.tenant_id = u.tenant_id
ON CONFLICT (user_id, branch_id) DO NOTHING;

INSERT INTO user_register_assignments (id, user_id, register_id, created_at, updated_at)
SELECT gen_random_uuid(), u.id, reg.id, NOW(), NOW()
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id AND r.name = 'CASHIER'
JOIN registers reg ON reg.tenant_id = u.tenant_id
ON CONFLICT (user_id, register_id) DO NOTHING;
