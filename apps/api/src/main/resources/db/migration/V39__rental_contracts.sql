CREATE TABLE rental_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    contract_number VARCHAR(30) NOT NULL,
    sale_id UUID NOT NULL REFERENCES sales(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL,
    expected_return_at TIMESTAMP NOT NULL,
    returned_at TIMESTAMP,
    deposit_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    CONSTRAINT ux_rental_contracts_tenant_number UNIQUE (tenant_id, contract_number),
    CONSTRAINT ux_rental_contracts_sale UNIQUE (sale_id)
);

CREATE INDEX idx_rental_contracts_tenant_id ON rental_contracts(tenant_id);
CREATE INDEX idx_rental_contracts_customer_id ON rental_contracts(customer_id);

CREATE TABLE rental_contract_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    rental_contract_id UUID NOT NULL REFERENCES rental_contracts(id),
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE INDEX idx_rental_contract_items_contract_id ON rental_contract_items(rental_contract_id);
