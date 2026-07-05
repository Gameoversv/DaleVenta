-- Global platform announcement (single logical banner shown to all talleres).
CREATE TABLE platform_announcement (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    message    TEXT         NOT NULL,
    level      VARCHAR(20)  NOT NULL DEFAULT 'INFO',
    active     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);
