-- Seed system roles: DaleVenta only has ADMIN and CASHIER staff roles,
-- plus SUPER_ADMIN (platform) and CLIENT (portal, phase 2).
INSERT INTO roles (id, name, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'SUPER_ADMIN', NOW(), NOW()),
    (gen_random_uuid(), 'ADMIN',       NOW(), NOW()),
    (gen_random_uuid(), 'CASHIER',     NOW(), NOW()),
    (gen_random_uuid(), 'CLIENT',      NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
