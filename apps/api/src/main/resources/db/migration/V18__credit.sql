CREATE TABLE customer_credit_profiles (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID          NOT NULL REFERENCES tenants(id),
    customer_id    UUID          NOT NULL REFERENCES customers(id),
    credit_enabled BOOLEAN       NOT NULL DEFAULT FALSE,
    credit_limit   NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by     VARCHAR(255),
    updated_by     VARCHAR(255)
);

CREATE UNIQUE INDEX idx_ccp_tenant_customer ON customer_credit_profiles(tenant_id, customer_id);

CREATE TABLE credit_accounts (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID          NOT NULL REFERENCES tenants(id),
    customer_id UUID          NOT NULL REFERENCES customers(id),
    balance     NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255)
);

CREATE UNIQUE INDEX idx_credit_accounts_tenant_customer ON credit_accounts(tenant_id, customer_id);

CREATE TABLE credit_transactions (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID          NOT NULL REFERENCES tenants(id),
    credit_account_id UUID          NOT NULL REFERENCES credit_accounts(id),
    type              VARCHAR(20)   NOT NULL,
    amount            NUMERIC(14,2) NOT NULL,
    sale_id           UUID          REFERENCES sales(id),
    user_id           UUID          NOT NULL REFERENCES users(id),
    note              TEXT,
    created_at        TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by        VARCHAR(255),
    updated_by        VARCHAR(255)
);

CREATE INDEX idx_credit_transactions_account_id ON credit_transactions(credit_account_id);
CREATE INDEX idx_credit_transactions_tenant_id ON credit_transactions(tenant_id);
