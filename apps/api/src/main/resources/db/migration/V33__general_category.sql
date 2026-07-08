INSERT INTO categories (tenant_id, name, active, created_at, updated_at)
SELECT t.id, 'General', TRUE, NOW(), NOW()
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1
    FROM categories c
    WHERE c.tenant_id = t.id
      AND LOWER(c.name) = 'general'
);
