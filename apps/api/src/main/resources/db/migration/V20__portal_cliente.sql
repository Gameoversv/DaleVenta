-- MOD-19: Portal del Cliente
-- Add customer_id FK to users (portal users linked to a customer record)
ALTER TABLE users ADD COLUMN customer_id UUID REFERENCES customers(id);
CREATE INDEX idx_users_customer_id ON users(customer_id);

-- Add lookup index for portal login by documentId within tenant
CREATE INDEX idx_customers_document_tenant ON customers(tenant_id, document_id) WHERE document_id IS NOT NULL;
