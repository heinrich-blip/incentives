-- Migration: 009_seed_2025_historical_data
-- Description: Insert historical 2025 data to enable year-over-year comparison
-- This includes monthly budgets and driver performance data for all 12 months of 2025
-- Created: 2026-01-19

-- ============================================
-- MONTHLY BUDGETS FOR 2025
-- ============================================

INSERT INTO monthly_budgets
    (year, month, driver_type, budgeted_kilometers, truck_count, notes)
VALUES
    -- Local drivers 2025 (slightly lower budgets than 2026 to show growth)
    (2025, 1, 'local', 58500.00, 4, 'January 2025 target - Local'),
    (2025, 2, 'local', 52800.00, 4, 'February 2025 target - Local'),
    (2025, 3, 'local', 56200.00, 4, 'March 2025 target - Local'),
    (2025, 4, 'local', 61500.00, 4, 'April 2025 target - Local'),
    (2025, 5, 'local', 63200.00, 4, 'May 2025 target - Local'),
    (2025, 6, 'local', 72100.00, 4, 'June 2025 target - Local'),
    (2025, 7, 'local', 62500.00, 4, 'July 2025 target - Local'),
    (2025, 8, 'local', 64300.00, 4, 'August 2025 target - Local'),
    (2025, 9, 'local', 60800.00, 4, 'September 2025 target - Local'),
    (2025, 10, 'local', 68500.00, 4, 'October 2025 target - Local'),
    (2025, 11, 'local', 79800.00, 4, 'November 2025 target - Local'),
    (2025, 12, 'local', 64200.00, 4, 'December 2025 target - Local'),
    -- Export drivers 2025
    (2025, 1, 'export', 24200.00, 4, 'January 2025 target - Export'),
    (2025, 2, 'export', 19800.00, 4, 'February 2025 target - Export'),
    (2025, 3, 'export', 20900.00, 4, 'March 2025 target - Export'),
    (2025, 4, 'export', 23400.00, 4, 'April 2025 target - Export'),
    (2025, 5, 'export', 41500.00, 4, 'May 2025 target - Export'),
    (2025, 6, 'export', 22200.00, 4, 'June 2025 target - Export'),
    (2025, 7, 'export', 25800.00, 4, 'July 2025 target - Export'),
    (2025, 8, 'export', 30600.00, 4, 'August 2025 target - Export'),
    (2025, 9, 'export', 47800.00, 4, 'September 2025 target - Export'),
    (2025, 10, 'export', 50500.00, 4, 'October 2025 target - Export'),
    (2025, 11, 'export', 26200.00, 4, 'November 2025 target - Export'),
    (2025, 12, 'export', 30100.00, 4, 'December 2025 target - Export')
ON CONFLICT (year, month, driver_type) DO NOTHING;

-- ============================================
-- DRIVER PERFORMANCE DATA FOR 2025
-- Full year historical data for comparison
-- ============================================

-- January 2025
INSERT INTO driver_performance
    (driver_id, year, month, actual_kilometers, trips_completed, fuel_efficiency, on_time_delivery_rate, customer_rating, safety_score)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 1, 5200, 11, 8.3, 94.0, 4.6, 97.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 1, 5600, 12, 8.0, 92.0, 4.5, 96.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 1, 2900, 40, 7.6, 90.0, 4.4, 94.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 1, 4800, 10, 7.8, 95.0, 4.7, 98.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 1, 3400, 46, 7.4, 91.0, 4.5, 95.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 1, 2600, 35, 7.7, 87.0, 4.2, 93.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 1, 5300, 11, 8.1, 96.0, 4.7, 97.5)
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- February 2025
INSERT INTO driver_performance
    (driver_id, year, month, actual_kilometers, trips_completed, fuel_efficiency, on_time_delivery_rate, customer_rating, safety_score)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 2, 4900, 10, 8.2, 93.0, 4.5, 96.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 2, 5100, 11, 7.9, 91.0, 4.4, 95.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 2, 2700, 38, 7.5, 89.0, 4.3, 93.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 2, 4500, 9, 7.7, 94.0, 4.6, 97.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 2, 3200, 43, 7.3, 90.0, 4.4, 94.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 2, 2400, 32, 7.6, 86.0, 4.1, 92.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 2, 4800, 10, 8.0, 95.0, 4.6, 97.0)
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- March 2025
INSERT INTO driver_performance
    (driver_id, year, month, actual_kilometers, trips_completed, fuel_efficiency, on_time_delivery_rate, customer_rating, safety_score)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 3, 5400, 11, 8.4, 95.0, 4.7, 97.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 3, 5700, 12, 8.1, 93.0, 4.5, 96.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 3, 3000, 42, 7.7, 91.0, 4.5, 95.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 3, 5000, 10, 7.9, 96.0, 4.8, 98.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 3, 3500, 48, 7.5, 92.0, 4.5, 95.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 3, 2700, 37, 7.8, 88.0, 4.3, 94.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 3, 5500, 12, 8.2, 97.0, 4.8, 98.0)
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- April 2025
INSERT INTO driver_performance
    (driver_id, year, month, actual_kilometers, trips_completed, fuel_efficiency, on_time_delivery_rate, customer_rating, safety_score)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 4, 5600, 12, 8.5, 96.0, 4.8, 98.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 4, 5900, 13, 8.2, 94.0, 4.6, 97.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 4, 3100, 44, 7.8, 92.0, 4.5, 95.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 4, 5200, 11, 8.0, 97.0, 4.8, 99.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 4, 3600, 50, 7.6, 93.0, 4.6, 96.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 4, 2800, 38, 7.9, 89.0, 4.4, 94.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 4, 5700, 12, 8.3, 97.5, 4.8, 98.5)
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- May 2025
INSERT INTO driver_performance
    (driver_id, year, month, actual_kilometers, trips_completed, fuel_efficiency, on_time_delivery_rate, customer_rating, safety_score)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 5, 5800, 12, 8.6, 97.0, 4.8, 98.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 5, 6100, 14, 8.3, 95.0, 4.7, 97.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 5, 3200, 45, 7.9, 93.0, 4.6, 96.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 5, 5400, 11, 8.1, 98.0, 4.9, 99.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 5, 3700, 51, 7.7, 94.0, 4.7, 96.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 5, 2900, 40, 8.0, 90.0, 4.4, 95.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 5, 5900, 13, 8.4, 98.0, 4.9, 99.0)
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- June 2025
INSERT INTO driver_performance
    (driver_id, year, month, actual_kilometers, trips_completed, fuel_efficiency, on_time_delivery_rate, customer_rating, safety_score)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 6, 5500, 11, 8.4, 95.5, 4.7, 97.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 6, 5800, 12, 8.1, 93.5, 4.6, 96.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 6, 3000, 42, 7.7, 91.5, 4.5, 95.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 6, 5100, 10, 7.9, 96.5, 4.8, 98.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 6, 3500, 48, 7.5, 92.5, 4.6, 95.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 6, 2700, 36, 7.8, 88.5, 4.3, 94.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 6, 5600, 12, 8.2, 96.5, 4.8, 98.0)
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- July 2025
INSERT INTO driver_performance
    (driver_id, year, month, actual_kilometers, trips_completed, fuel_efficiency, on_time_delivery_rate, customer_rating, safety_score)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 7, 5700, 12, 8.5, 96.0, 4.8, 98.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 7, 6000, 13, 8.2, 94.0, 4.6, 97.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 7, 3100, 44, 7.8, 92.0, 4.5, 95.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 7, 5300, 11, 8.0, 97.0, 4.8, 99.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 7, 3600, 50, 7.6, 93.0, 4.6, 96.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 7, 2800, 38, 7.9, 89.0, 4.4, 94.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 7, 5800, 12, 8.3, 97.5, 4.8, 98.5)
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- August 2025
INSERT INTO driver_performance
    (driver_id, year, month, actual_kilometers, trips_completed, fuel_efficiency, on_time_delivery_rate, customer_rating, safety_score)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 8, 5900, 13, 8.6, 97.0, 4.8, 98.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 8, 6200, 14, 8.3, 95.0, 4.7, 97.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 8, 3300, 46, 7.9, 93.0, 4.6, 96.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 8, 5500, 12, 8.1, 98.0, 4.9, 99.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 8, 3800, 52, 7.7, 94.0, 4.7, 96.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 8, 3000, 40, 8.0, 90.0, 4.4, 95.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 8, 6000, 13, 8.4, 98.0, 4.9, 99.0)
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- September 2025
INSERT INTO driver_performance
    (driver_id, year, month, actual_kilometers, trips_completed, fuel_efficiency, on_time_delivery_rate, customer_rating, safety_score)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 9, 5600, 12, 8.4, 96.0, 4.7, 97.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 9, 5900, 13, 8.1, 94.0, 4.6, 96.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 9, 3100, 43, 7.8, 91.5, 4.5, 95.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 9, 5200, 11, 7.9, 97.0, 4.8, 98.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 9, 3600, 49, 7.5, 92.5, 4.6, 95.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 9, 2800, 37, 7.8, 88.5, 4.3, 94.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 9, 5700, 12, 8.2, 97.0, 4.8, 98.0)
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- October 2025
INSERT INTO driver_performance
    (driver_id, year, month, actual_kilometers, trips_completed, fuel_efficiency, on_time_delivery_rate, customer_rating, safety_score)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 10, 5800, 12, 8.5, 96.5, 4.8, 98.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 10, 6100, 14, 8.2, 94.5, 4.7, 97.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 10, 3200, 45, 7.8, 92.5, 4.6, 95.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 10, 5400, 11, 8.0, 97.5, 4.9, 99.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 10, 3700, 51, 7.6, 93.5, 4.7, 96.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 10, 2900, 39, 7.9, 89.5, 4.4, 94.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 10, 5900, 13, 8.3, 97.5, 4.9, 98.5)
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- November 2025
INSERT INTO driver_performance
    (driver_id, year, month, actual_kilometers, trips_completed, fuel_efficiency, on_time_delivery_rate, customer_rating, safety_score)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 11, 5700, 12, 8.4, 96.0, 4.7, 97.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 11, 6000, 13, 8.1, 93.5, 4.6, 96.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 11, 3100, 43, 7.7, 91.5, 4.5, 95.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 11, 5300, 11, 7.9, 97.0, 4.8, 98.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 11, 3600, 49, 7.5, 93.0, 4.6, 95.5),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 11, 2800, 37, 7.8, 88.5, 4.3, 94.0),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 11, 5800, 12, 8.2, 97.0, 4.8, 98.0)
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- Note: December 2025 data already exists in 002_seed_data.sql

-- ============================================
-- INCENTIVE CALCULATIONS FOR 2025
-- Adding historical incentive calculations for full year comparison
-- ============================================

-- January 2025
INSERT INTO incentive_calculations
    (driver_id, year, month, base_salary, km_incentive, performance_bonus, safety_bonus, deductions, total_incentive, total_earnings, calculation_details, status, approved_by, approved_date, paid_date)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 1, 18500.00, 11700.00, 1170.00, 925.00, 0, 13795.00, 32295.00, '{"km_driven": 5200, "rate": 2.25, "achievement_pct": 103.2}', 'paid', 'Finance Manager', '2025-02-05', '2025-02-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 1, 17500.00, 12600.00, 1260.00, 875.00, 0, 14735.00, 32235.00, '{"km_driven": 5600, "rate": 2.25, "achievement_pct": 111.1}', 'paid', 'Finance Manager', '2025-02-05', '2025-02-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 1, 14000.00, 4350.00, 435.00, 700.00, 0, 5485.00, 19485.00, '{"km_driven": 2900, "rate": 1.50, "achievement_pct": 99.1}', 'paid', 'Finance Manager', '2025-02-05', '2025-02-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 1, 16500.00, 10800.00, 1080.00, 825.00, 0, 12705.00, 29205.00, '{"km_driven": 4800, "rate": 2.25, "achievement_pct": 95.2}', 'paid', 'Finance Manager', '2025-02-05', '2025-02-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 1, 15500.00, 5100.00, 510.00, 775.00, 0, 6385.00, 21885.00, '{"km_driven": 3400, "rate": 1.50, "achievement_pct": 116.2}', 'paid', 'Finance Manager', '2025-02-05', '2025-02-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 1, 13000.00, 3900.00, 0, 650.00, 0, 4550.00, 17550.00, '{"km_driven": 2600, "rate": 1.50, "achievement_pct": 88.9}', 'paid', 'Finance Manager', '2025-02-05', '2025-02-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 1, 17000.00, 11925.00, 1192.50, 850.00, 0, 13967.50, 30967.50, '{"km_driven": 5300, "rate": 2.25, "achievement_pct": 105.2}', 'paid', 'Finance Manager', '2025-02-05', '2025-02-10')
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- February 2025
INSERT INTO incentive_calculations
    (driver_id, year, month, base_salary, km_incentive, performance_bonus, safety_bonus, deductions, total_incentive, total_earnings, calculation_details, status, approved_by, approved_date, paid_date)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 2, 18500.00, 11025.00, 1102.50, 925.00, 0, 13052.50, 31552.50, '{"km_driven": 4900, "rate": 2.25, "achievement_pct": 98.6}', 'paid', 'Finance Manager', '2025-03-05', '2025-03-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 2, 17500.00, 11475.00, 1147.50, 875.00, 0, 13497.50, 30997.50, '{"km_driven": 5100, "rate": 2.25, "achievement_pct": 102.6}', 'paid', 'Finance Manager', '2025-03-05', '2025-03-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 2, 14000.00, 4050.00, 405.00, 700.00, 0, 5155.00, 19155.00, '{"km_driven": 2700, "rate": 1.50, "achievement_pct": 102.3}', 'paid', 'Finance Manager', '2025-03-05', '2025-03-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 2, 16500.00, 10125.00, 1012.50, 825.00, 0, 11962.50, 28462.50, '{"km_driven": 4500, "rate": 2.25, "achievement_pct": 90.6}', 'paid', 'Finance Manager', '2025-03-05', '2025-03-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 2, 15500.00, 4800.00, 480.00, 775.00, 0, 6055.00, 21555.00, '{"km_driven": 3200, "rate": 1.50, "achievement_pct": 121.2}', 'paid', 'Finance Manager', '2025-03-05', '2025-03-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 2, 13000.00, 3600.00, 0, 650.00, 0, 4250.00, 17250.00, '{"km_driven": 2400, "rate": 1.50, "achievement_pct": 90.9}', 'paid', 'Finance Manager', '2025-03-05', '2025-03-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 2, 17000.00, 10800.00, 1080.00, 850.00, 0, 12730.00, 29730.00, '{"km_driven": 4800, "rate": 2.25, "achievement_pct": 96.6}', 'paid', 'Finance Manager', '2025-03-05', '2025-03-10')
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- March 2025
INSERT INTO incentive_calculations
    (driver_id, year, month, base_salary, km_incentive, performance_bonus, safety_bonus, deductions, total_incentive, total_earnings, calculation_details, status, approved_by, approved_date, paid_date)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 3, 18500.00, 12150.00, 1215.00, 925.00, 0, 14290.00, 32790.00, '{"km_driven": 5400, "rate": 2.25, "achievement_pct": 107.3}', 'paid', 'Finance Manager', '2025-04-05', '2025-04-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 3, 17500.00, 12825.00, 1282.50, 875.00, 0, 14982.50, 32482.50, '{"km_driven": 5700, "rate": 2.25, "achievement_pct": 113.3}', 'paid', 'Finance Manager', '2025-04-05', '2025-04-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 3, 14000.00, 4500.00, 450.00, 700.00, 0, 5650.00, 19650.00, '{"km_driven": 3000, "rate": 1.50, "achievement_pct": 106.8}', 'paid', 'Finance Manager', '2025-04-05', '2025-04-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 3, 16500.00, 11250.00, 1125.00, 825.00, 0, 13200.00, 29700.00, '{"km_driven": 5000, "rate": 2.25, "achievement_pct": 99.4}', 'paid', 'Finance Manager', '2025-04-05', '2025-04-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 3, 15500.00, 5250.00, 525.00, 775.00, 0, 6550.00, 22050.00, '{"km_driven": 3500, "rate": 1.50, "achievement_pct": 124.6}', 'paid', 'Finance Manager', '2025-04-05', '2025-04-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 3, 13000.00, 4050.00, 0, 650.00, 0, 4700.00, 17700.00, '{"km_driven": 2700, "rate": 1.50, "achievement_pct": 96.1}', 'paid', 'Finance Manager', '2025-04-05', '2025-04-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 3, 17000.00, 12375.00, 1237.50, 850.00, 0, 14462.50, 31462.50, '{"km_driven": 5500, "rate": 2.25, "achievement_pct": 109.3}', 'paid', 'Finance Manager', '2025-04-05', '2025-04-10')
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- April 2025
INSERT INTO incentive_calculations
    (driver_id, year, month, base_salary, km_incentive, performance_bonus, safety_bonus, deductions, total_incentive, total_earnings, calculation_details, status, approved_by, approved_date, paid_date)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 4, 18500.00, 12600.00, 1260.00, 925.00, 0, 14785.00, 33285.00, '{"km_driven": 5600, "rate": 2.25, "achievement_pct": 111.3}', 'paid', 'Finance Manager', '2025-05-05', '2025-05-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 4, 17500.00, 13275.00, 1327.50, 875.00, 0, 15477.50, 32977.50, '{"km_driven": 5900, "rate": 2.25, "achievement_pct": 117.3}', 'paid', 'Finance Manager', '2025-05-05', '2025-05-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 4, 14000.00, 4650.00, 465.00, 700.00, 0, 5815.00, 19815.00, '{"km_driven": 3100, "rate": 1.50, "achievement_pct": 100.9}', 'paid', 'Finance Manager', '2025-05-05', '2025-05-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 4, 16500.00, 11700.00, 1170.00, 825.00, 0, 13695.00, 30195.00, '{"km_driven": 5200, "rate": 2.25, "achievement_pct": 103.4}', 'paid', 'Finance Manager', '2025-05-05', '2025-05-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 4, 15500.00, 5400.00, 540.00, 775.00, 0, 6715.00, 22215.00, '{"km_driven": 3600, "rate": 1.50, "achievement_pct": 117.1}', 'paid', 'Finance Manager', '2025-05-05', '2025-05-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 4, 13000.00, 4200.00, 0, 650.00, 0, 4850.00, 17850.00, '{"km_driven": 2800, "rate": 1.50, "achievement_pct": 91.1}', 'paid', 'Finance Manager', '2025-05-05', '2025-05-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 4, 17000.00, 12825.00, 1282.50, 850.00, 0, 14957.50, 31957.50, '{"km_driven": 5700, "rate": 2.25, "achievement_pct": 113.3}', 'paid', 'Finance Manager', '2025-05-05', '2025-05-10')
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- May 2025
INSERT INTO incentive_calculations
    (driver_id, year, month, base_salary, km_incentive, performance_bonus, safety_bonus, deductions, total_incentive, total_earnings, calculation_details, status, approved_by, approved_date, paid_date)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 5, 18500.00, 13050.00, 1305.00, 925.00, 0, 15280.00, 33780.00, '{"km_driven": 5800, "rate": 2.25, "achievement_pct": 115.1}', 'paid', 'Finance Manager', '2025-06-05', '2025-06-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 5, 17500.00, 13725.00, 1372.50, 875.00, 0, 15972.50, 33472.50, '{"km_driven": 6100, "rate": 2.25, "achievement_pct": 121.1}', 'paid', 'Finance Manager', '2025-06-05', '2025-06-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 5, 14000.00, 4800.00, 480.00, 700.00, 0, 5980.00, 19980.00, '{"km_driven": 3200, "rate": 1.50, "achievement_pct": 101.3}', 'paid', 'Finance Manager', '2025-06-05', '2025-06-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 5, 16500.00, 12150.00, 1215.00, 825.00, 0, 14190.00, 30690.00, '{"km_driven": 5400, "rate": 2.25, "achievement_pct": 107.2}', 'paid', 'Finance Manager', '2025-06-05', '2025-06-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 5, 15500.00, 5550.00, 555.00, 775.00, 0, 6880.00, 22380.00, '{"km_driven": 3700, "rate": 1.50, "achievement_pct": 117.0}', 'paid', 'Finance Manager', '2025-06-05', '2025-06-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 5, 13000.00, 4350.00, 435.00, 650.00, 0, 5435.00, 18435.00, '{"km_driven": 2900, "rate": 1.50, "achievement_pct": 91.8}', 'paid', 'Finance Manager', '2025-06-05', '2025-06-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 5, 17000.00, 13275.00, 1327.50, 850.00, 0, 15452.50, 32452.50, '{"km_driven": 5900, "rate": 2.25, "achievement_pct": 117.3}', 'paid', 'Finance Manager', '2025-06-05', '2025-06-10')
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- June 2025
INSERT INTO incentive_calculations
    (driver_id, year, month, base_salary, km_incentive, performance_bonus, safety_bonus, deductions, total_incentive, total_earnings, calculation_details, status, approved_by, approved_date, paid_date)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 6, 18500.00, 12375.00, 1237.50, 925.00, 0, 14537.50, 33037.50, '{"km_driven": 5500, "rate": 2.25, "achievement_pct": 109.3}', 'paid', 'Finance Manager', '2025-07-05', '2025-07-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 6, 17500.00, 13050.00, 1305.00, 875.00, 0, 15230.00, 32730.00, '{"km_driven": 5800, "rate": 2.25, "achievement_pct": 115.2}', 'paid', 'Finance Manager', '2025-07-05', '2025-07-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 6, 14000.00, 4500.00, 450.00, 700.00, 0, 5650.00, 19650.00, '{"km_driven": 3000, "rate": 1.50, "achievement_pct": 83.2}', 'paid', 'Finance Manager', '2025-07-05', '2025-07-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 6, 16500.00, 11475.00, 1147.50, 825.00, 0, 13447.50, 29947.50, '{"km_driven": 5100, "rate": 2.25, "achievement_pct": 101.3}', 'paid', 'Finance Manager', '2025-07-05', '2025-07-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 6, 15500.00, 5250.00, 525.00, 775.00, 0, 6550.00, 22050.00, '{"km_driven": 3500, "rate": 1.50, "achievement_pct": 97.1}', 'paid', 'Finance Manager', '2025-07-05', '2025-07-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 6, 13000.00, 4050.00, 0, 650.00, 0, 4700.00, 17700.00, '{"km_driven": 2700, "rate": 1.50, "achievement_pct": 74.9}', 'paid', 'Finance Manager', '2025-07-05', '2025-07-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 6, 17000.00, 12600.00, 1260.00, 850.00, 0, 14710.00, 31710.00, '{"km_driven": 5600, "rate": 2.25, "achievement_pct": 111.3}', 'paid', 'Finance Manager', '2025-07-05', '2025-07-10')
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- July 2025
INSERT INTO incentive_calculations
    (driver_id, year, month, base_salary, km_incentive, performance_bonus, safety_bonus, deductions, total_incentive, total_earnings, calculation_details, status, approved_by, approved_date, paid_date)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 7, 18500.00, 12825.00, 1282.50, 925.00, 0, 15032.50, 33532.50, '{"km_driven": 5700, "rate": 2.25, "achievement_pct": 113.2}', 'paid', 'Finance Manager', '2025-08-05', '2025-08-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 7, 17500.00, 13500.00, 1350.00, 875.00, 0, 15725.00, 33225.00, '{"km_driven": 6000, "rate": 2.25, "achievement_pct": 119.2}', 'paid', 'Finance Manager', '2025-08-05', '2025-08-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 7, 14000.00, 4650.00, 465.00, 700.00, 0, 5815.00, 19815.00, '{"km_driven": 3100, "rate": 1.50, "achievement_pct": 99.2}', 'paid', 'Finance Manager', '2025-08-05', '2025-08-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 7, 16500.00, 11925.00, 1192.50, 825.00, 0, 13942.50, 30442.50, '{"km_driven": 5300, "rate": 2.25, "achievement_pct": 105.3}', 'paid', 'Finance Manager', '2025-08-05', '2025-08-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 7, 15500.00, 5400.00, 540.00, 775.00, 0, 6715.00, 22215.00, '{"km_driven": 3600, "rate": 1.50, "achievement_pct": 115.2}', 'paid', 'Finance Manager', '2025-08-05', '2025-08-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 7, 13000.00, 4200.00, 0, 650.00, 0, 4850.00, 17850.00, '{"km_driven": 2800, "rate": 1.50, "achievement_pct": 89.6}', 'paid', 'Finance Manager', '2025-08-05', '2025-08-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 7, 17000.00, 13050.00, 1305.00, 850.00, 0, 15205.00, 32205.00, '{"km_driven": 5800, "rate": 2.25, "achievement_pct": 115.2}', 'paid', 'Finance Manager', '2025-08-05', '2025-08-10')
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- August 2025
INSERT INTO incentive_calculations
    (driver_id, year, month, base_salary, km_incentive, performance_bonus, safety_bonus, deductions, total_incentive, total_earnings, calculation_details, status, approved_by, approved_date, paid_date)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 8, 18500.00, 13275.00, 1327.50, 925.00, 0, 15527.50, 34027.50, '{"km_driven": 5900, "rate": 2.25, "achievement_pct": 117.0}', 'paid', 'Finance Manager', '2025-09-05', '2025-09-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 8, 17500.00, 13950.00, 1395.00, 875.00, 0, 16220.00, 33720.00, '{"km_driven": 6200, "rate": 2.25, "achievement_pct": 123.0}', 'paid', 'Finance Manager', '2025-09-05', '2025-09-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 8, 14000.00, 4950.00, 495.00, 700.00, 0, 6145.00, 20145.00, '{"km_driven": 3300, "rate": 1.50, "achievement_pct": 102.6}', 'paid', 'Finance Manager', '2025-09-05', '2025-09-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 8, 16500.00, 12375.00, 1237.50, 825.00, 0, 14437.50, 30937.50, '{"km_driven": 5500, "rate": 2.25, "achievement_pct": 109.1}', 'paid', 'Finance Manager', '2025-09-05', '2025-09-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 8, 15500.00, 5700.00, 570.00, 775.00, 0, 7045.00, 22545.00, '{"km_driven": 3800, "rate": 1.50, "achievement_pct": 118.1}', 'paid', 'Finance Manager', '2025-09-05', '2025-09-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 8, 13000.00, 4500.00, 450.00, 650.00, 0, 5600.00, 18600.00, '{"km_driven": 3000, "rate": 1.50, "achievement_pct": 93.3}', 'paid', 'Finance Manager', '2025-09-05', '2025-09-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 8, 17000.00, 13500.00, 1350.00, 850.00, 0, 15700.00, 32700.00, '{"km_driven": 6000, "rate": 2.25, "achievement_pct": 119.0}', 'paid', 'Finance Manager', '2025-09-05', '2025-09-10')
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- September 2025
INSERT INTO incentive_calculations
    (driver_id, year, month, base_salary, km_incentive, performance_bonus, safety_bonus, deductions, total_incentive, total_earnings, calculation_details, status, approved_by, approved_date, paid_date)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 9, 18500.00, 12600.00, 1260.00, 925.00, 0, 14785.00, 33285.00, '{"km_driven": 5600, "rate": 2.25, "achievement_pct": 111.2}', 'paid', 'Finance Manager', '2025-10-05', '2025-10-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 9, 17500.00, 13275.00, 1327.50, 875.00, 0, 15477.50, 32977.50, '{"km_driven": 5900, "rate": 2.25, "achievement_pct": 117.1}', 'paid', 'Finance Manager', '2025-10-05', '2025-10-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 9, 14000.00, 4650.00, 465.00, 700.00, 0, 5815.00, 19815.00, '{"km_driven": 3100, "rate": 1.50, "achievement_pct": 101.8}', 'paid', 'Finance Manager', '2025-10-05', '2025-10-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 9, 16500.00, 11700.00, 1170.00, 825.00, 0, 13695.00, 30195.00, '{"km_driven": 5200, "rate": 2.25, "achievement_pct": 103.3}', 'paid', 'Finance Manager', '2025-10-05', '2025-10-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 9, 15500.00, 5400.00, 540.00, 775.00, 0, 6715.00, 22215.00, '{"km_driven": 3600, "rate": 1.50, "achievement_pct": 118.3}', 'paid', 'Finance Manager', '2025-10-05', '2025-10-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 9, 13000.00, 4200.00, 0, 650.00, 0, 4850.00, 17850.00, '{"km_driven": 2800, "rate": 1.50, "achievement_pct": 92.0}', 'paid', 'Finance Manager', '2025-10-05', '2025-10-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 9, 17000.00, 12825.00, 1282.50, 850.00, 0, 14957.50, 31957.50, '{"km_driven": 5700, "rate": 2.25, "achievement_pct": 113.2}', 'paid', 'Finance Manager', '2025-10-05', '2025-10-10')
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- October 2025
INSERT INTO incentive_calculations
    (driver_id, year, month, base_salary, km_incentive, performance_bonus, safety_bonus, deductions, total_incentive, total_earnings, calculation_details, status, approved_by, approved_date, paid_date)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 10, 18500.00, 13050.00, 1305.00, 925.00, 0, 15280.00, 33780.00, '{"km_driven": 5800, "rate": 2.25, "achievement_pct": 114.9}', 'paid', 'Finance Manager', '2025-11-05', '2025-11-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 10, 17500.00, 13725.00, 1372.50, 875.00, 0, 15972.50, 33472.50, '{"km_driven": 6100, "rate": 2.25, "achievement_pct": 120.8}', 'paid', 'Finance Manager', '2025-11-05', '2025-11-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 10, 14000.00, 4800.00, 480.00, 700.00, 0, 5980.00, 19980.00, '{"km_driven": 3200, "rate": 1.50, "achievement_pct": 93.5}', 'paid', 'Finance Manager', '2025-11-05', '2025-11-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 10, 16500.00, 12150.00, 1215.00, 825.00, 0, 14190.00, 30690.00, '{"km_driven": 5400, "rate": 2.25, "achievement_pct": 106.9}', 'paid', 'Finance Manager', '2025-11-05', '2025-11-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 10, 15500.00, 5550.00, 555.00, 775.00, 0, 6880.00, 22380.00, '{"km_driven": 3700, "rate": 1.50, "achievement_pct": 108.0}', 'paid', 'Finance Manager', '2025-11-05', '2025-11-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 10, 13000.00, 4350.00, 435.00, 650.00, 0, 5435.00, 18435.00, '{"km_driven": 2900, "rate": 1.50, "achievement_pct": 84.7}', 'paid', 'Finance Manager', '2025-11-05', '2025-11-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 10, 17000.00, 13275.00, 1327.50, 850.00, 0, 15452.50, 32452.50, '{"km_driven": 5900, "rate": 2.25, "achievement_pct": 116.8}', 'paid', 'Finance Manager', '2025-11-05', '2025-11-10')
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- November 2025
INSERT INTO incentive_calculations
    (driver_id, year, month, base_salary, km_incentive, performance_bonus, safety_bonus, deductions, total_incentive, total_earnings, calculation_details, status, approved_by, approved_date, paid_date)
VALUES
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-001'), 2025, 11, 18500.00, 12825.00, 1282.50, 925.00, 0, 15032.50, 33532.50, '{"km_driven": 5700, "rate": 2.25, "achievement_pct": 113.0}', 'paid', 'Finance Manager', '2025-12-05', '2025-12-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-002'), 2025, 11, 17500.00, 13500.00, 1350.00, 875.00, 0, 15725.00, 33225.00, '{"km_driven": 6000, "rate": 2.25, "achievement_pct": 118.9}', 'paid', 'Finance Manager', '2025-12-05', '2025-12-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-003'), 2025, 11, 14000.00, 4650.00, 465.00, 700.00, 0, 5815.00, 19815.00, '{"km_driven": 3100, "rate": 1.50, "achievement_pct": 77.7}', 'paid', 'Finance Manager', '2025-12-05', '2025-12-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-004'), 2025, 11, 16500.00, 11925.00, 1192.50, 825.00, 0, 13942.50, 30442.50, '{"km_driven": 5300, "rate": 2.25, "achievement_pct": 105.0}', 'paid', 'Finance Manager', '2025-12-05', '2025-12-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-005'), 2025, 11, 15500.00, 5400.00, 540.00, 775.00, 0, 6715.00, 22215.00, '{"km_driven": 3600, "rate": 1.50, "achievement_pct": 90.2}', 'paid', 'Finance Manager', '2025-12-05', '2025-12-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-006'), 2025, 11, 13000.00, 4200.00, 0, 650.00, 0, 4850.00, 17850.00, '{"km_driven": 2800, "rate": 1.50, "achievement_pct": 70.2}', 'paid', 'Finance Manager', '2025-12-05', '2025-12-10'),
    ((SELECT id FROM drivers WHERE employee_id = 'DRV-007'), 2025, 11, 17000.00, 13050.00, 1305.00, 850.00, 0, 15205.00, 32205.00, '{"km_driven": 5800, "rate": 2.25, "achievement_pct": 114.9}', 'paid', 'Finance Manager', '2025-12-05', '2025-12-10')
ON CONFLICT (driver_id, year, month) DO NOTHING;

-- Note: December 2025 incentive calculations already exist in 002_seed_data.sql
