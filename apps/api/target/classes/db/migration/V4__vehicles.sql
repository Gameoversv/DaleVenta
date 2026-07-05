CREATE TABLE vehicles (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    brand         VARCHAR(100) NOT NULL,
    model         VARCHAR(100) NOT NULL,
    year          INTEGER      NOT NULL,
    engine        VARCHAR(100),
    vin           VARCHAR(17),
    license_plate VARCHAR(20),
    color         VARCHAR(50),
    mileage       INTEGER,
    transmission  VARCHAR(20),
    modifications JSONB,
    customer_id   UUID         NOT NULL REFERENCES customers(id),
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_by    VARCHAR(255),
    updated_by    VARCHAR(255)
);

CREATE UNIQUE INDEX idx_vehicles_vin
    ON vehicles(vin) WHERE vin IS NOT NULL AND active = TRUE;

CREATE UNIQUE INDEX idx_vehicles_license_plate
    ON vehicles(license_plate) WHERE license_plate IS NOT NULL AND active = TRUE;

CREATE INDEX idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX idx_vehicles_license_plate_search ON vehicles(lower(license_plate));
CREATE INDEX idx_vehicles_vin_search ON vehicles(lower(vin));
