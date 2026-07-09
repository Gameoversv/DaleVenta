CREATE TABLE quotations (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID          NOT NULL REFERENCES tenants(id),
    quotation_number VARCHAR(30)  NOT NULL,
    customer_id     UUID          REFERENCES customers(id),
    user_id         UUID          NOT NULL REFERENCES users(id),
    status          VARCHAR(20)   NOT NULL,
    valid_until     DATE,
    subtotal        NUMERIC(14,2) NOT NULL,
    tax_total       NUMERIC(14,2) NOT NULL,
    discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    total           NUMERIC(14,2) NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255),
    CONSTRAINT ux_quotations_tenant_number UNIQUE (tenant_id, quotation_number)
);

CREATE INDEX idx_quotations_tenant_id ON quotations(tenant_id);
CREATE INDEX idx_quotations_customer_id ON quotations(customer_id);

CREATE TABLE quotation_items (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID          NOT NULL REFERENCES tenants(id),
    quotation_id  UUID          NOT NULL REFERENCES quotations(id),
    product_id    UUID          NOT NULL REFERENCES products(id),
    quantity      INT           NOT NULL,
    unit_price    NUMERIC(12,2) NOT NULL,
    tax_rate      NUMERIC(5,2)  NOT NULL,
    line_total    NUMERIC(14,2) NOT NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by    VARCHAR(255),
    updated_by    VARCHAR(255)
);

CREATE INDEX idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX idx_quotation_items_tenant_id ON quotation_items(tenant_id);
