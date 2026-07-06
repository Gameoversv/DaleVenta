ALTER TABLE sales
    ADD COLUMN invoice_sequence BIGINT,
    ADD COLUMN invoice_number VARCHAR(30);

WITH numbered AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at, id) AS seq
    FROM sales
)
UPDATE sales s
SET invoice_sequence = numbered.seq,
    invoice_number = 'FV-' || LPAD(numbered.seq::TEXT, 6, '0')
FROM numbered
WHERE s.id = numbered.id;

ALTER TABLE sales
    ALTER COLUMN invoice_sequence SET NOT NULL,
    ALTER COLUMN invoice_number SET NOT NULL;

CREATE UNIQUE INDEX ux_sales_tenant_invoice_sequence ON sales(tenant_id, invoice_sequence);
CREATE UNIQUE INDEX ux_sales_tenant_invoice_number ON sales(tenant_id, invoice_number);
