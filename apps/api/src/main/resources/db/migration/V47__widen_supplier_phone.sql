-- Mismo caso que V46 para tenants y customers: dos telefonos en un campo.
-- "(809) 555-0100 / (829) 555-0200" son 31 caracteres y la columna tenia 30.
ALTER TABLE suppliers ALTER COLUMN phone TYPE VARCHAR(50);
