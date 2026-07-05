CREATE TABLE employees (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name  VARCHAR(100) NOT NULL,
    phone      VARCHAR(20),
    email      VARCHAR(150),
    role       VARCHAR(20) NOT NULL DEFAULT 'MECHANIC',
    position   VARCHAR(100),
    hire_date  DATE,
    salary     DECIMAL(12, 2),
    active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);
