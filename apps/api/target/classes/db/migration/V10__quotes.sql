CREATE TABLE quotes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id),
    status       VARCHAR(20)   NOT NULL DEFAULT 'PENDIENTE',
    apply_itbis  BOOLEAN       NOT NULL DEFAULT FALSE,
    itbis_rate   DECIMAL(5,4)  NOT NULL DEFAULT 0.18,
    subtotal     DECIMAL(12,2) NOT NULL DEFAULT 0,
    itbis_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total        DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes        TEXT,
    created_at   TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by   VARCHAR(255),
    updated_by   VARCHAR(255)
);

CREATE INDEX idx_quotes_work_order ON quotes(work_order_id);

CREATE TABLE quote_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id    UUID           NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    item_type   VARCHAR(20)    NOT NULL,
    description TEXT           NOT NULL,
    quantity    INT            NOT NULL DEFAULT 1,
    unit_price  DECIMAL(12,2)  NOT NULL,
    subtotal    DECIMAL(12,2)  NOT NULL
);

CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);
