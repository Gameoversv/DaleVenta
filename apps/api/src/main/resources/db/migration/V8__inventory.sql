CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internal_code   VARCHAR(50)      NOT NULL,
    description     TEXT             NOT NULL,
    purchase_cost   DECIMAL(12,2)    NOT NULL,
    sale_price      DECIMAL(12,2)    NOT NULL,
    current_stock   INT              NOT NULL DEFAULT 0,
    min_stock       INT              NOT NULL DEFAULT 0,
    category        VARCHAR(30)      NOT NULL,
    active          BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP        NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP        NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255)
);

CREATE UNIQUE INDEX idx_products_internal_code ON products(internal_code) WHERE active = TRUE;
CREATE INDEX idx_products_category            ON products(category);
CREATE INDEX idx_products_low_stock           ON products(current_stock, min_stock) WHERE active = TRUE;
