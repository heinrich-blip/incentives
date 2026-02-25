-- Migration: Seed 2025 driver salary history
-- Description: Insert monthly salary records for all drivers from January to December 2025
-- USD Base Salary: 175
-- ZIG Base Salary: 4,727.03

-- Insert salary records for all drivers for each month of 2025
INSERT INTO driver_salary_history (driver_id, year, month, usd_base_salary, zig_base_salary, effective_date, notes)
SELECT 
    d.id as driver_id,
    2025 as year,
    m.month as month,
    175.00 as usd_base_salary,
    4727.03 as zig_base_salary,
    ('2025-' || LPAD(m.month::TEXT, 2, '0') || '-01')::DATE as effective_date,
    'Initial 2025 salary setup' as notes
FROM drivers d
CROSS JOIN (
    SELECT generate_series(1, 12) as month
) m
ON CONFLICT ON CONSTRAINT unique_driver_salary_period 
DO UPDATE SET 
    usd_base_salary = EXCLUDED.usd_base_salary,
    zig_base_salary = EXCLUDED.zig_base_salary,
    updated_at = NOW();
