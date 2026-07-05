-- V22 stored oil_level (snake_case) but Hibernate JSONB serializer uses oilLevel (camelCase).
-- Reset all checklists with correct camelCase keys.
UPDATE receptions
SET checklist = jsonb_build_object(
    'exterior', jsonb_build_object('scratches', 'NA', 'dents', 'NA', 'lights', 'NA'),
    'interior', jsonb_build_object('radio', 'NA', 'screen', 'NA', 'mats', 'NA'),
    'mechanical', jsonb_build_object('oilLevel', 'NA', 'coolant', 'NA', 'battery', 'NA')
)
WHERE checklist IS NOT NULL;
