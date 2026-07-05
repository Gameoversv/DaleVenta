-- Seed system roles
INSERT INTO roles (id, name, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'OWNER',        NOW(), NOW()),
    (gen_random_uuid(), 'MANAGER',      NOW(), NOW()),
    (gen_random_uuid(), 'RECEPTIONIST', NOW(), NOW()),
    (gen_random_uuid(), 'MECHANIC',     NOW(), NOW()),
    (gen_random_uuid(), 'CLIENT',       NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
