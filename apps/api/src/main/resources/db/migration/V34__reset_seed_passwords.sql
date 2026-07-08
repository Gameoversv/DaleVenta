UPDATE users
SET password = '$2a$10$QYfOpwedHdhKyheGWr08Iud77pvtqWA81KorTm3J8qJFZ1Tl6XRhu',
    updated_at = NOW()
WHERE email IN ('admin@dalventa.rd', 'superadmin@dalventa.rd');
