CREATE SEQUENCE invoice_seq START 1;

CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number  VARCHAR(20)   NOT NULL UNIQUE,
    work_order_id   UUID          NOT NULL REFERENCES work_orders(id),
    issue_date      DATE          NOT NULL,
    status          VARCHAR(20)   NOT NULL DEFAULT 'PENDIENTE',
    apply_itbis     BOOLEAN       NOT NULL DEFAULT FALSE,
    itbis_rate      DECIMAL(5,4)  NOT NULL DEFAULT 0.18,
    subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
    itbis_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,
    total           DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255)
);

CREATE INDEX idx_invoices_work_order ON invoices(work_order_id);
CREATE INDEX idx_invoices_status ON invoices(status);

CREATE TABLE invoice_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id  UUID           NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_type   VARCHAR(20)    NOT NULL,
    description TEXT           NOT NULL,
    quantity    INT            NOT NULL DEFAULT 1,
    unit_price  DECIMAL(12,2)  NOT NULL,
    subtotal    DECIMAL(12,2)  NOT NULL
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
