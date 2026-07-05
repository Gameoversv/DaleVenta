-- Fixed permission catalog lives in Java (PermissionCode enum); these tables
-- only store which role/user has which code, referenced by its string name.

CREATE TABLE role_permissions (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    role       VARCHAR(50) NOT NULL,
    code       VARCHAR(60) NOT NULL,
    created_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    UNIQUE (role, code)
);

CREATE TABLE user_permissions (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code       VARCHAR(60) NOT NULL,
    effect     VARCHAR(10) NOT NULL, -- GRANT or REVOKE
    created_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    UNIQUE (user_id, code)
);

CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);

-- Default catalog: ADMIN gets everything, CASHIER gets the POS-floor subset.
INSERT INTO role_permissions (role, code, created_at, updated_at) VALUES
    ('ADMIN', 'INVENTORY_VIEW', NOW(), NOW()),
    ('ADMIN', 'INVENTORY_CREATE', NOW(), NOW()),
    ('ADMIN', 'INVENTORY_EDIT', NOW(), NOW()),
    ('ADMIN', 'INVENTORY_ADJUST', NOW(), NOW()),
    ('ADMIN', 'COST_VIEW', NOW(), NOW()),
    ('ADMIN', 'PRICE_VIEW', NOW(), NOW()),
    ('ADMIN', 'SALE_CREATE', NOW(), NOW()),
    ('ADMIN', 'SALE_DISCOUNT', NOW(), NOW()),
    ('ADMIN', 'SALE_PRICE_OVERRIDE', NOW(), NOW()),
    ('ADMIN', 'SALE_VOID', NOW(), NOW()),
    ('ADMIN', 'SALE_RETURN', NOW(), NOW()),
    ('ADMIN', 'CASHSHIFT_OPEN', NOW(), NOW()),
    ('ADMIN', 'CASHSHIFT_CLOSE', NOW(), NOW()),
    ('ADMIN', 'CASHSHIFT_VIEW_HISTORY', NOW(), NOW()),
    ('ADMIN', 'CUSTOMER_CREATE', NOW(), NOW()),
    ('ADMIN', 'CUSTOMER_EDIT', NOW(), NOW()),
    ('ADMIN', 'CREDIT_AUTHORIZE', NOW(), NOW()),
    ('ADMIN', 'CREDIT_RECEIVE_PAYMENT', NOW(), NOW()),
    ('ADMIN', 'REPORTS_VIEW', NOW(), NOW()),
    ('ADMIN', 'PROFIT_VIEW', NOW(), NOW()),
    ('ADMIN', 'USERS_MANAGE', NOW(), NOW()),
    ('ADMIN', 'SETTINGS_MANAGE', NOW(), NOW()),
    ('CASHIER', 'INVENTORY_VIEW', NOW(), NOW()),
    ('CASHIER', 'SALE_CREATE', NOW(), NOW()),
    ('CASHIER', 'CASHSHIFT_OPEN', NOW(), NOW()),
    ('CASHIER', 'CASHSHIFT_CLOSE', NOW(), NOW()),
    ('CASHIER', 'CUSTOMER_CREATE', NOW(), NOW()),
    ('CASHIER', 'CREDIT_RECEIVE_PAYMENT', NOW(), NOW())
ON CONFLICT (role, code) DO NOTHING;
