CREATE TABLE sales (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID          NOT NULL REFERENCES tenants(id),
    branch_id       UUID          NOT NULL REFERENCES branches(id),
    register_id     UUID          NOT NULL REFERENCES registers(id),
    cash_shift_id   UUID          NOT NULL REFERENCES cash_shifts(id),
    customer_id     UUID          REFERENCES customers(id),
    user_id         UUID          NOT NULL REFERENCES users(id),
    status          VARCHAR(20)   NOT NULL,
    subtotal        NUMERIC(14,2) NOT NULL,
    tax_total       NUMERIC(14,2) NOT NULL,
    discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    total           NUMERIC(14,2) NOT NULL,
    voided_at       TIMESTAMP,
    voided_by       UUID REFERENCES users(id),
    void_reason     TEXT,
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255)
);

CREATE INDEX idx_sales_tenant_id ON sales(tenant_id);
CREATE INDEX idx_sales_register_id ON sales(register_id);
CREATE INDEX idx_sales_cash_shift_id ON sales(cash_shift_id);

CREATE TABLE sale_items (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID          NOT NULL REFERENCES tenants(id),
    sale_id     UUID          NOT NULL REFERENCES sales(id),
    product_id  UUID          NOT NULL REFERENCES products(id),
    quantity    INT           NOT NULL,
    unit_price  NUMERIC(12,2) NOT NULL,
    tax_rate    NUMERIC(5,2)  NOT NULL,
    line_total  NUMERIC(14,2) NOT NULL,
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255)
);

CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_tenant_id ON sale_items(tenant_id);

CREATE TABLE payments (
    id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID          NOT NULL REFERENCES tenants(id),
    sale_id    UUID          NOT NULL REFERENCES sales(id),
    method     VARCHAR(20)   NOT NULL,
    amount     NUMERIC(14,2) NOT NULL,
    created_at TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE INDEX idx_payments_sale_id ON payments(sale_id);
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);

CREATE TABLE transfer_payment_details (
    id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID          NOT NULL REFERENCES tenants(id),
    payment_id UUID          NOT NULL REFERENCES payments(id),
    bank       VARCHAR(100)  NOT NULL,
    reference  VARCHAR(100)  NOT NULL,
    amount     NUMERIC(14,2) NOT NULL,
    created_at TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE UNIQUE INDEX idx_tpd_tenant_bank_reference ON transfer_payment_details(tenant_id, bank, reference);
CREATE INDEX idx_tpd_payment_id ON transfer_payment_details(payment_id);

ALTER TABLE cash_movements ADD COLUMN sale_id UUID REFERENCES sales(id);
CREATE INDEX idx_cash_movements_sale_id ON cash_movements(sale_id);
