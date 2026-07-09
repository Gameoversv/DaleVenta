INSERT INTO categories (tenant_id, name, active, created_at, updated_at)
SELECT t.id, 'General', TRUE, NOW(), NOW()
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1
    FROM categories c
    WHERE c.tenant_id = t.id
      AND LOWER(c.name) = LOWER('General')
);

UPDATE categories
SET active = TRUE
WHERE LOWER(name) = LOWER('General')
  AND active = FALSE;

UPDATE products p
SET category_id = g.id
FROM categories c, categories g
WHERE p.category_id = c.id
  AND c.tenant_id = p.tenant_id
  AND c.active = FALSE
  AND g.tenant_id = p.tenant_id
  AND LOWER(g.name) = LOWER('General');
