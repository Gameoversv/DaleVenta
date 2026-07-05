CREATE TABLE products (
    id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID           NOT NULL REFERENCES tenants(id),
    category_id       UUID           NOT NULL REFERENCES categories(id),
    internal_code     VARCHAR(50)    NOT NULL,
    barcode           VARCHAR(50),
    description       TEXT           NOT NULL,
    unit              VARCHAR(30)    NOT NULL,
    cost              NUMERIC(12,2)  NOT NULL,
    sale_price        NUMERIC(12,2)  NOT NULL,
    wholesale_price   NUMERIC(12,2)  NOT NULL,
    tax_rate          NUMERIC(5,2)   NOT NULL DEFAULT 0,
    tracks_inventory  BOOLEAN        NOT NULL DEFAULT TRUE,
    active            BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP      NOT NULL DEFAULT NOW(),
    created_by        VARCHAR(255),
    updated_by        VARCHAR(255)
);

CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE UNIQUE INDEX idx_products_internal_code ON products(tenant_id, internal_code);
CREATE UNIQUE INDEX idx_products_barcode ON products(tenant_id, barcode) WHERE barcode IS NOT NULL;
