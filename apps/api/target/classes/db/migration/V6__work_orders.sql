CREATE TABLE work_orders (
    id             UUID            NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    reception_id   UUID            NOT NULL UNIQUE REFERENCES receptions(id),
    status         VARCHAR(20)     NOT NULL DEFAULT 'PENDIENTE',
    diagnosis      TEXT,
    assigned_to    VARCHAR(100),
    estimated_cost NUMERIC(10, 2),
    actual_cost    NUMERIC(10, 2),
    started_at     TIMESTAMP,
    completed_at   TIMESTAMP,
    created_at     TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP       NOT NULL DEFAULT NOW(),
    created_by     VARCHAR(255),
    updated_by     VARCHAR(255)
);

CREATE TABLE work_order_items (
    id              UUID            NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id   UUID            NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    description     VARCHAR(255)    NOT NULL,
    type            VARCHAR(10)     NOT NULL,
    quantity        NUMERIC(10, 2)  NOT NULL DEFAULT 1,
    unit_price      NUMERIC(10, 2)  NOT NULL,
    total           NUMERIC(10, 2)  NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255)
);

CREATE INDEX idx_work_orders_status        ON work_orders(status);
CREATE INDEX idx_work_orders_reception_id  ON work_orders(reception_id);
CREATE INDEX idx_work_orders_created_at    ON work_orders(created_at DESC);
CREATE INDEX idx_work_order_items_order_id ON work_order_items(work_order_id);
