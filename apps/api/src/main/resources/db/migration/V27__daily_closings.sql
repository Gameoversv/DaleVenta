CREATE TABLE daily_closings (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    close_number VARCHAR(30) NOT NULL,
    close_sequence BIGINT NOT NULL,
    close_date DATE NOT NULL,
    register_id UUID NOT NULL REFERENCES registers(id),
    closed_by UUID NOT NULL REFERENCES users(id),
    closed_at TIMESTAMP NOT NULL,
    completed_sales BIGINT NOT NULL,
    voided_sales BIGINT NOT NULL,
    gross_revenue NUMERIC(19, 2) NOT NULL,
    tax_total NUMERIC(19, 2) NOT NULL,
    discount_total NUMERIC(19, 2) NOT NULL,
    cash_expected NUMERIC(19, 2) NOT NULL,
    cash_counted NUMERIC(19, 2) NOT NULL,
    cash_difference NUMERIC(19, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT ux_daily_closings_tenant_number UNIQUE (tenant_id, close_number),
    CONSTRAINT ux_daily_closings_tenant_date_register UNIQUE (tenant_id, close_date, register_id)
);

CREATE INDEX idx_daily_closings_tenant_date ON daily_closings(tenant_id, close_date DESC);
