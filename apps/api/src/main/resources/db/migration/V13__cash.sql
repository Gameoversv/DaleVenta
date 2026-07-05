CREATE TABLE cash_transactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type             VARCHAR(10) NOT NULL,
    amount           DECIMAL(12, 2) NOT NULL,
    description      TEXT NOT NULL,
    category         VARCHAR(100),
    transaction_date DATE NOT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by       VARCHAR(100),
    updated_by       VARCHAR(100)
);
