CREATE TABLE suppliers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(150)  NOT NULL,
    phone       VARCHAR(20),
    email       VARCHAR(255),
    active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255)
);

CREATE INDEX idx_suppliers_name ON suppliers(lower(name));

CREATE TABLE purchases (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id  UUID          NOT NULL REFERENCES suppliers(id),
    purchase_date DATE         NOT NULL,
    total        DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes        TEXT,
    created_at   TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by   VARCHAR(255),
    updated_by   VARCHAR(255)
);

CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchases_date     ON purchases(purchase_date DESC);

CREATE TABLE purchase_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id  UUID           NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id   UUID           NOT NULL REFERENCES products(id),
    quantity     INT            NOT NULL,
    unit_cost    DECIMAL(12,2)  NOT NULL,
    subtotal     DECIMAL(12,2)  NOT NULL
);

CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);
