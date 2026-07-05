-- Reset existing checklist JSONB to string-based severity values
-- (previous schema stored booleans; new schema stores OK/LEVE/GRAVE/NA strings)
UPDATE receptions
SET checklist = jsonb_build_object(
    'exterior', jsonb_build_object('scratches', 'NA', 'dents', 'NA', 'lights', 'NA'),
    'interior', jsonb_build_object('radio', 'NA', 'screen', 'NA', 'mats', 'NA'),
    'mechanical', jsonb_build_object('oil_level', 'NA', 'coolant', 'NA', 'battery', 'NA')
)
WHERE checklist IS NOT NULL;
