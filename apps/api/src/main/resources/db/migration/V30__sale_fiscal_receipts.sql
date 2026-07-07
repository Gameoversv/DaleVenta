ALTER TABLE sales
    ADD COLUMN fiscal_receipt_type VARCHAR(40),
    ADD COLUMN fiscal_ncf VARCHAR(20),
    ADD COLUMN fiscal_sequence_id UUID REFERENCES fiscal_receipt_sequences(id);

CREATE UNIQUE INDEX idx_sales_tenant_fiscal_ncf
    ON sales (tenant_id, fiscal_ncf)
    WHERE fiscal_ncf IS NOT NULL;
