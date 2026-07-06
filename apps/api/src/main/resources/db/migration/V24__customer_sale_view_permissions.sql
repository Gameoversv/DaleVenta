INSERT INTO role_permissions (role, code, created_at, updated_at) VALUES
    ('ADMIN', 'DASHBOARD_VIEW', NOW(), NOW()),
    ('ADMIN', 'SALE_VIEW_HISTORY', NOW(), NOW()),
    ('ADMIN', 'CUSTOMER_VIEW', NOW(), NOW()),
    ('CASHIER', 'CUSTOMER_VIEW', NOW(), NOW())
ON CONFLICT (role, code) DO NOTHING;

-- Cashiers are view-only on customers by default; admin grants
-- CUSTOMER_CREATE/CUSTOMER_EDIT per user via the permission override UI.
DELETE FROM role_permissions WHERE role = 'CASHIER' AND code = 'CUSTOMER_CREATE';
