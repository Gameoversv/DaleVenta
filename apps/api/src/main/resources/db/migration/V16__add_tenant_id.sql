-- Add tenant_id to all tenant-scoped tables
-- Strategy: add nullable, backfill with dev tenant, then constrain

-- ── users ─────────────────────────────────────────────────────────────────────
-- Nullable: SUPER_ADMIN has no tenant
ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id);
UPDATE users SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;
-- email stays globally unique; one user belongs to one tenant only

-- ── customers ─────────────────────────────────────────────────────────────────
ALTER TABLE customers ADD COLUMN tenant_id UUID REFERENCES tenants(id);
UPDATE customers SET tenant_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE customers ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_customers_tenant ON customers(tenant_id);

-- ── vehicles ──────────────────────────────────────────────────────────────────
ALTER TABLE vehicles ADD COLUMN tenant_id UUID REFERENCES tenants(id);
UPDATE vehicles SET tenant_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE vehicles ALTER COLUMN tenant_id SET NOT NULL;
-- VIN and plate uniqueness must be per-tenant now
DROP INDEX IF EXISTS idx_vehicles_vin;
DROP INDEX IF EXISTS idx_vehicles_license_plate;
CREATE UNIQUE INDEX idx_vehicles_vin
    ON vehicles(tenant_id, vin) WHERE vin IS NOT NULL AND active = TRUE;
CREATE UNIQUE INDEX idx_vehicles_license_plate
    ON vehicles(tenant_id, license_plate) WHERE license_plate IS NOT NULL AND active = TRUE;
CREATE INDEX idx_vehicles_tenant ON vehicles(tenant_id);

-- ── receptions ────────────────────────────────────────────────────────────────
ALTER TABLE receptions ADD COLUMN tenant_id UUID REFERENCES tenants(id);
UPDATE receptions SET tenant_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE receptions ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_receptions_tenant ON receptions(tenant_id);

-- ── work_orders ───────────────────────────────────────────────────────────────
ALTER TABLE work_orders ADD COLUMN tenant_id UUID REFERENCES tenants(id);
UPDATE work_orders SET tenant_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE work_orders ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_work_orders_tenant ON work_orders(tenant_id);

-- ── products ──────────────────────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN tenant_id UUID REFERENCES tenants(id);
UPDATE products SET tenant_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;
-- internal_code uniqueness is per-tenant
DROP INDEX IF EXISTS idx_products_internal_code;
CREATE UNIQUE INDEX idx_products_internal_code
    ON products(tenant_id, internal_code) WHERE active = TRUE;
CREATE INDEX idx_products_tenant ON products(tenant_id);

-- ── suppliers ─────────────────────────────────────────────────────────────────
ALTER TABLE suppliers ADD COLUMN tenant_id UUID REFERENCES tenants(id);
UPDATE suppliers SET tenant_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE suppliers ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id);

-- ── purchases ─────────────────────────────────────────────────────────────────
ALTER TABLE purchases ADD COLUMN tenant_id UUID REFERENCES tenants(id);
UPDATE purchases SET tenant_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE purchases ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_purchases_tenant ON purchases(tenant_id);

-- ── quotes ────────────────────────────────────────────────────────────────────
ALTER TABLE quotes ADD COLUMN tenant_id UUID REFERENCES tenants(id);
UPDATE quotes SET tenant_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE quotes ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_quotes_tenant ON quotes(tenant_id);

-- ── invoices ──────────────────────────────────────────────────────────────────
ALTER TABLE invoices ADD COLUMN tenant_id UUID REFERENCES tenants(id);
UPDATE invoices SET tenant_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE invoices ALTER COLUMN tenant_id SET NOT NULL;
-- invoice_number uniqueness is per-tenant
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;
CREATE UNIQUE INDEX idx_invoices_number_tenant ON invoices(tenant_id, invoice_number);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);

-- ── payments ──────────────────────────────────────────────────────────────────
ALTER TABLE payments ADD COLUMN tenant_id UUID REFERENCES tenants(id);
UPDATE payments SET tenant_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE payments ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_payments_tenant ON payments(tenant_id);

-- ── cash_transactions ─────────────────────────────────────────────────────────
ALTER TABLE cash_transactions ADD COLUMN tenant_id UUID REFERENCES tenants(id);
UPDATE cash_transactions SET tenant_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE cash_transactions ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_cash_transactions_tenant ON cash_transactions(tenant_id);

-- ── employees ─────────────────────────────────────────────────────────────────
ALTER TABLE employees ADD COLUMN tenant_id UUID REFERENCES tenants(id);
UPDATE employees SET tenant_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE employees ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_employees_tenant ON employees(tenant_id);
