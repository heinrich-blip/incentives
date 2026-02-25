-- Migration: 002_seed_data
-- Description: Insert sample/default data for testing and initial setup
-- Created: 2026-01-18

-- ============================================
-- DEFAULT INCENTIVE SETTINGS
-- ============================================

INSERT INTO incentive_settings
    (setting_key, setting_value, description)
VALUES
    ('km_threshold_local', '{"value": 3000, "unit": "km"}', 'Minimum monthly kilometers for local drivers to qualify for incentive'),
    ('km_threshold_export', '{"value": 5000, "unit": "km"}', 'Minimum monthly kilometers for export drivers to qualify for incentive'),
    ('safety_bonus_percentage', '{"value": 5, "unit": "percent"}', 'Safety bonus as percentage of base salary for accident-free month'),
    ('performance_multiplier', '{"tiers": [{"min": 100, "max": 110, "multiplier": 1.1}, {"min": 110, "max": 120, "multiplier": 1.2}, {"min": 120, "max": 999, "multiplier": 1.3}]}', 'Performance multiplier tiers based on percentage of target achieved'),
    ('deduction_per_incident', '{"value": 500, "unit": "USD"}', 'Standard deduction per incident'),
    ('max_leave_days_annual', '{"value": 21, "unit": "days"}', 'Maximum annual leave days per year'),
    ('incentive_divisor_local', '1000', 'Divisor for Local drivers - used to calculate rate per kilometer (Budget KM / Divisor = Rate per KM)'),
    ('incentive_divisor_export', '1500', 'Divisor for Export drivers - used to calculate rate per kilometer (Budget KM / Divisor = Rate per KM)')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- DEFAULT KILOMETER RATES
-- ============================================

INSERT INTO kilometer_rates
    (driver_type, rate_per_km, effective_from, is_active, notes)
VALUES
    ('local', 1.50, '2026-01-01', true, 'Standard rate for local drivers'),
    ('export', 2.25, '2026-01-01', true, 'Standard rate for export/long-haul drivers')
ON CONFLICT (driver_type, effective_from) DO NOTHING;

-- ============================================
-- MONTHLY BUDGETS FOR 2026
-- ============================================

INSERT INTO monthly_budgets
    (year, month, driver_type, budgeted_kilometers, truck_count, notes)
VALUES
    -- Local drivers (Total Budget: 824,036.67 km)
    (2026, 1, 'local', 63681.86, 4, 'January target - Local'),
    (2026, 2, 'local', 57940.32, 4, 'February target - Local'),
    (2026, 3, 'local', 60806.98, 4, 'March target - Local'),
    (2026, 4, 'local', 66524.83, 4, 'April target - Local'),
    (2026, 5, 'local', 68345.16, 4, 'May target - Local'),
    (2026, 6, 'local', 78268.24, 4, 'June target - Local'),
    (2026, 7, 'local', 67271.05, 4, 'July target - Local'),
    (2026, 8, 'local', 69206.72, 4, 'August target - Local'),
    (2026, 9, 'local', 65463.26, 4, 'September target - Local'),
    (2026, 10, 'local', 74080.96, 4, 'October target - Local'),
    (2026, 11, 'local', 86115.21, 4, 'November target - Local'),
    (2026, 12, 'local', 69431.98, 4, 'December target - Local'),
    -- Export drivers (Total Budget: 387,047.75 km)
    (2026, 1, 'export', 26499.20, 4, 'January target - Export'),
    (2026, 2, 'export', 21494.89, 4, 'February target - Export'),
    (2026, 3, 'export', 22618.06, 4, 'March target - Export'),
    (2026, 4, 'export', 25328.80, 4, 'April target - Export'),
    (2026, 5, 'export', 44955.05, 4, 'May target - Export'),
    (2026, 6, 'export', 24053.17, 4, 'June target - Export'),
    (2026, 7, 'export', 27899.04, 4, 'July target - Export'),
    (2026, 8, 'export', 33082.18, 4, 'August target - Export'),
    (2026, 9, 'export', 51642.68, 4, 'September target - Export'),
    (2026, 10, 'export', 54633.95, 4, 'October target - Export'),
    (2026, 11, 'export', 28342.38, 4, 'November target - Export'),
    (2026, 12, 'export', 32497.35, 4, 'December target - Export')
ON CONFLICT (year, month, driver_type) DO NOTHING;

-- ============================================
-- DEFAULT CUSTOM FORMULAS
-- ============================================

INSERT INTO custom_formulas
    (formula_name, formula_key, formula_expression, description, applies_to, is_active, priority, variables)
VALUES
    ('Base Kilometer Incentive', 'base_km_incentive', 'actual_km * rate_per_km', 'Basic incentive calculated as actual kilometers multiplied by per-km rate', 'all', true, 1, '{"actual_km": "Actual kilometers driven", "rate_per_km": "Rate per kilometer based on driver type"}'),
    ('Target Achievement Bonus', 'target_bonus', 'CASE WHEN (actual_km / target_km * 100) >= 120 THEN base_incentive * 0.3 WHEN (actual_km / target_km * 100) >= 110 THEN base_incentive * 0.2 WHEN (actual_km / target_km * 100) >= 100 THEN base_incentive * 0.1 ELSE 0 END', 'Additional bonus for exceeding monthly target', 'all', true, 2, '{"actual_km": "Actual kilometers", "target_km": "Monthly target kilometers", "base_incentive": "Base km incentive"}'),
    ('Safety Bonus', 'safety_bonus', 'CASE WHEN accident_count = 0 AND incident_count = 0 THEN base_salary * 0.05 ELSE 0 END', 'Safety bonus for accident and incident-free month', 'all', true, 3, '{"accident_count": "Number of accidents in month", "incident_count": "Number of incidents in month", "base_salary": "Driver base salary"}'),
    ('Incident Deduction', 'incident_deduction', 'incident_count * deduction_rate', 'Deduction for incidents during the month', 'all', true, 4, '{"incident_count": "Number of incidents", "deduction_rate": "Deduction per incident"}')
ON CONFLICT (formula_key) DO NOTHING;

-- ============================================
-- SAMPLE DRIVERS
-- ============================================

INSERT INTO drivers
    (employee_id, first_name, last_name, email, phone, date_of_birth, hire_date, license_number, license_expiry, license_class, passport_number, passport_expiry, driver_type, status, base_salary, address, emergency_contact_name, emergency_contact_phone, notes)
VALUES
    ('DRV-001', 'John', 'Mitchell', 'john.mitchell@fleet.com', '+27 82 123 4567', '1985-03-15', '2020-06-01', 'LIC-SA-123456', '2028-03-15', 'EC', 'A12345678', '2030-05-20', 'export', 'active', 18500.00, '123 Main Street, Johannesburg', 'Sarah Mitchell', '+27 82 987 6543', 'Experienced long-haul driver'),
    ('DRV-002', 'Peter', 'van der Berg', 'peter.vdberg@fleet.com', '+27 83 234 5678', '1990-07-22', '2021-03-15', 'LIC-SA-234567', '2027-07-22', 'EC', 'B23456789', '2029-08-10', 'export', 'active', 17500.00, '456 Oak Avenue, Pretoria', 'Anna van der Berg', '+27 83 876 5432', 'Cross-border specialist'),
    ('DRV-003', 'Michael', 'Nkosi', 'michael.nkosi@fleet.com', '+27 84 345 6789', '1988-11-08', '2019-01-10', 'LIC-SA-345678', '2026-11-08', 'C1', 'C34567890', '2028-12-15', 'local', 'active', 14000.00, '789 Church Street, Durban', 'Grace Nkosi', '+27 84 765 4321', 'City deliveries expert'),
    ('DRV-004', 'David', 'Botha', 'david.botha@fleet.com', '+27 85 456 7890', '1992-04-30', '2022-08-20', 'LIC-SA-456789', '2029-04-30', 'EC', 'D45678901', '2031-02-28', 'export', 'active', 16500.00, '321 Park Lane, Cape Town', 'Lisa Botha', '+27 85 654 3210', 'New but promising driver'),
    ('DRV-005', 'Thomas', 'Williams', 'thomas.williams@fleet.com', '+27 86 567 8901', '1983-09-12', '2018-04-05', 'LIC-SA-567890', '2026-09-12', 'C1', 'E56789012', '2027-06-30', 'local', 'active', 15500.00, '654 Beach Road, Port Elizabeth', 'Mary Williams', '+27 86 543 2109', 'Senior local driver'),
    ('DRV-006', 'James', 'Mbeki', 'james.mbeki@fleet.com', '+27 87 678 9012', '1995-01-25', '2023-02-01', 'LIC-SA-678901', '2030-01-25', 'C1', 'F67890123', '2032-04-15', 'local', 'active', 13000.00, '987 Valley Drive, Bloemfontein', 'Thandi Mbeki', '+27 87 432 1098', 'Young talented driver'),
    ('DRV-007', 'Robert', 'Pretorius', 'robert.pretorius@fleet.com', '+27 88 789 0123', '1987-06-18', '2020-11-15', 'LIC-SA-789012', '2027-06-18', 'EC', 'G78901234', '2029-09-20', 'export', 'active', 17000.00, '147 Hill Street, Nelspruit', 'Karen Pretorius', '+27 88 321 0987', 'Reliable cross-border driver'),
    ('DRV-008', 'William', 'Dlamini', 'william.dlamini@fleet.com', '+27 89 890 1234', '1991-12-03', '2021-07-10', 'LIC-SA-890123', '2028-12-03', 'C1', 'H89012345', '2030-11-25', 'local', 'suspended', 14500.00, '258 River Road, Polokwane', 'Nomsa Dlamini', '+27 89 210 9876', 'Currently suspended - review pending')
ON CONFLICT (employee_id) DO NOTHING;

-- ============================================
-- SAMPLE ACCIDENTS
-- ============================================

INSERT INTO accidents
    (driver_id, incident_date, incident_type, description, location, vehicle_damage_cost, third_party_cost, insurance_claim_number, insurance_status, at_fault, police_report_number, resolution, resolved_date)
VALUES
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-003'), '2025-08-15', 'minor', 'Minor fender bender in parking lot while reversing', 'Durban CBD Parking', 2500.00, 0, 'INS-2025-001', 'settled', true, NULL, 'Damage repaired, driver counseled', '2025-08-30'),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-008'), '2025-11-20', 'moderate', 'Side collision at intersection due to failure to yield', 'N1 Highway Interchange', 15000.00, 8000.00, 'INS-2025-002', 'approved', true, 'POL-2025-4521', 'Vehicle repaired, driver suspended pending investigation', '2025-12-15')
ON CONFLICT DO NOTHING;

-- ============================================
-- SAMPLE INCIDENTS
-- ============================================

INSERT INTO incidents
    (driver_id, incident_date, incident_type, severity, description, action_taken, fine_amount, resolved, resolved_date)
VALUES
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-004'), '2025-09-10', 'traffic_violation', 'medium', 'Speeding ticket - 20km/h over limit', 'Verbal warning issued, fine paid by driver', 1500.00, true, '2025-09-15'),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-006'), '2025-10-05', 'customer_complaint', 'low', 'Customer reported late delivery', 'Reviewed route, traffic was cause, no action required', 0, true, '2025-10-07'),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-008'), '2025-11-18', 'safety_violation', 'high', 'Failed to complete pre-trip inspection', 'Written warning issued', 0, true, '2025-11-19')
ON CONFLICT DO NOTHING;

-- ============================================
-- SAMPLE DISCIPLINARY RECORDS
-- ============================================

INSERT INTO disciplinary_records
    (driver_id, record_date, record_type, reason, description, issued_by, duration_days, start_date, end_date, appeal_status)
VALUES
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-008'), '2025-11-19', 'written_warning', 'Safety violation', 'Failed to complete required pre-trip vehicle inspection', 'Fleet Manager', NULL, NULL, NULL, 'none'),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-008'), '2025-11-25', 'suspension', 'Accident - At fault collision', 'Suspended pending investigation of at-fault accident', 'Fleet Manager', 30, '2025-11-25', '2025-12-25', 'pending')
ON CONFLICT DO NOTHING;

-- ============================================
-- SAMPLE LEAVE RECORDS
-- ============================================

INSERT INTO leave_records
    (driver_id, leave_type, start_date, end_date, total_days, status, reason, approved_by, approved_date)
VALUES
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-001'), 'annual', '2025-12-20', '2026-01-05', 12, 'approved', 'Annual family holiday', 'HR Manager', '2025-11-15'),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-003'), 'sick', '2025-10-10', '2025-10-12', 3, 'approved', 'Flu', 'HR Manager', '2025-10-10'),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-005'), 'annual', '2026-02-15', '2026-02-22', 6, 'pending', 'Personal time off', NULL, NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- SAMPLE PERFORMANCE DATA
-- ============================================

INSERT INTO driver_performance
    (driver_id, year, month, actual_kilometers, trips_completed, fuel_efficiency, on_time_delivery_rate, customer_rating, safety_score)
VALUES
    -- December 2025 data
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-001'), 2025, 12, 5800, 12, 8.5, 96.5, 4.8, 98.0),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-002'), 2025, 12, 6200, 14, 8.2, 94.0, 4.6, 97.5),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-003'), 2025, 12, 3200, 45, 7.8, 92.0, 4.5, 95.0),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-004'), 2025, 12, 5500, 11, 8.0, 98.0, 4.9, 99.0),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-005'), 2025, 12, 3800, 52, 7.5, 95.0, 4.7, 96.0),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-006'), 2025, 12, 2900, 38, 7.9, 88.0, 4.3, 94.0),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-007'), 2025, 12, 5900, 13, 8.3, 97.0, 4.8, 98.5),
    -- January 2026 data (partial)
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-001'), 2026, 1, 3100, 7, 8.4, 95.0, 4.7, 99.0),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-002'), 2026, 1, 3400, 8, 8.1, 96.0, 4.8, 98.0),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-003'), 2026, 1, 1800, 25, 7.7, 93.0, 4.6, 97.0),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-004'), 2026, 1, 2900, 6, 8.2, 100.0, 5.0, 100.0),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-005'), 2026, 1, 2100, 28, 7.6, 94.0, 4.5, 95.0),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-006'), 2026, 1, 1600, 22, 7.8, 91.0, 4.4, 96.0),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-007'), 2026, 1, 3200, 7, 8.5, 98.0, 4.9, 99.0)
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- ============================================
-- SAMPLE INCENTIVE CALCULATIONS (December 2025)
-- ============================================

INSERT INTO incentive_calculations
    (driver_id, year, month, base_salary, km_incentive, performance_bonus, safety_bonus, deductions, deduction_reason, total_incentive, total_earnings, calculation_details, status, approved_by, approved_date, paid_date)
VALUES
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-001'), 2025, 12, 18500.00, 13050.00, 1305.00, 925.00, 0, NULL, 15280.00, 33780.00, '{"km_driven": 5800, "rate": 2.25, "target": 5500, "achievement_pct": 105.5}', 'paid', 'Finance Manager', '2026-01-05', '2026-01-10'),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-002'), 2025, 12, 17500.00, 13950.00, 2790.00, 875.00, 0, NULL, 17615.00, 35115.00, '{"km_driven": 6200, "rate": 2.25, "target": 5500, "achievement_pct": 112.7}', 'paid', 'Finance Manager', '2026-01-05', '2026-01-10'),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-003'), 2025, 12, 14000.00, 4800.00, 480.00, 700.00, 0, NULL, 5980.00, 19980.00, '{"km_driven": 3200, "rate": 1.50, "target": 3000, "achievement_pct": 106.7}', 'paid', 'Finance Manager', '2026-01-05', '2026-01-10'),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-004'), 2025, 12, 16500.00, 12375.00, 1237.50, 825.00, 500.00, 'Traffic violation fine', 13937.50, 30437.50, '{"km_driven": 5500, "rate": 2.25, "target": 5500, "achievement_pct": 100.0}', 'paid', 'Finance Manager', '2026-01-05', '2026-01-10'),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-005'), 2025, 12, 15500.00, 5700.00, 1140.00, 775.00, 0, NULL, 7615.00, 23115.00, '{"km_driven": 3800, "rate": 1.50, "target": 3000, "achievement_pct": 126.7}', 'paid', 'Finance Manager', '2026-01-05', '2026-01-10'),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-006'), 2025, 12, 13000.00, 4350.00, 0, 650.00, 0, NULL, 5000.00, 18000.00, '{"km_driven": 2900, "rate": 1.50, "target": 3000, "achievement_pct": 96.7}', 'paid', 'Finance Manager', '2026-01-05', '2026-01-10'),
    ((SELECT id
        FROM drivers
        WHERE employee_id = 'DRV-007'), 2025, 12, 17000.00, 13275.00, 1327.50, 850.00, 0, NULL, 15452.50, 32452.50, '{"km_driven": 5900, "rate": 2.25, "target": 5500, "achievement_pct": 107.3}', 'paid', 'Finance Manager', '2026-01-05', '2026-01-10')
ON CONFLICT (driver_id, year, month) DO NOTHING;
