CREATE TABLE fiscal_profiles (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    business_name  VARCHAR(150) NOT NULL,
    trade_name     VARCHAR(150),
    rnc            VARCHAR(20) NOT NULL,
    fiscal_address TEXT,
    phone          VARCHAR(20),
    email          VARCHAR(255),
    tax_regime     VARCHAR(80),
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by     VARCHAR(255),
    updated_by     VARCHAR(255),
    UNIQUE (tenant_id)
);

CREATE TABLE fiscal_receipt_sequences (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    receipt_type  VARCHAR(40) NOT NULL,
    prefix        VARCHAR(5) NOT NULL,
    start_number  INTEGER NOT NULL,
    next_number   INTEGER NOT NULL,
    end_number    INTEGER NOT NULL,
    expires_at    DATE NOT NULL,
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by    VARCHAR(255),
    updated_by    VARCHAR(255),
    CONSTRAINT chk_fiscal_sequence_numbers CHECK (
        start_number > 0 AND next_number >= start_number AND end_number >= next_number
    )
);

CREATE UNIQUE INDEX idx_fiscal_sequences_active_type
    ON fiscal_receipt_sequences (tenant_id, receipt_type)
    WHERE active = TRUE;

CREATE INDEX idx_fiscal_sequences_tenant_id ON fiscal_receipt_sequences (tenant_id);
