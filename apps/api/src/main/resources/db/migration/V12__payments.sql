CREATE TABLE payments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id    UUID NOT NULL REFERENCES invoices(id),
    amount        DECIMAL(12, 2) NOT NULL,
    payment_date  DATE NOT NULL,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'EFECTIVO',
    notes         TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by    VARCHAR(100),
    updated_by    VARCHAR(100)
);
