-- Los negocios dominicanos publican dos telefonos en la factura y los cargan
-- en un solo campo ("809-555-0100 / 829-555-0200" son 27 caracteres). Con
-- VARCHAR(20) Postgres rechazaba el UPDATE y salia como error del servidor.
ALTER TABLE tenants   ALTER COLUMN phone    TYPE VARCHAR(50);
ALTER TABLE customers ALTER COLUMN phone    TYPE VARCHAR(50);
ALTER TABLE customers ALTER COLUMN whatsapp TYPE VARCHAR(50);
