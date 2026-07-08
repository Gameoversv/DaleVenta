ALTER TABLE branch_inventory
    ALTER COLUMN min_stock DROP NOT NULL,
    ALTER COLUMN min_stock DROP DEFAULT;

UPDATE branch_inventory
SET min_stock = NULL
WHERE min_stock = 0;
