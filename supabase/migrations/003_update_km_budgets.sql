-- Migration: 003_update_km_budgets
-- Description: Update EXPORT and LOCAL Km Budgets for 2026
-- EXPORT Total Budget: 387,047.75 km
-- LOCAL Total Budget: 824,036.67 km
-- GRAND TOTAL: 1,211,084.42 km
-- Created: 2026-01-18

-- ============================================
-- UPDATE EXPORT DRIVER BUDGETS FOR 2026
-- ============================================

INSERT INTO monthly_budgets (year, month, driver_type, budgeted_kilometers, notes)
VALUES
    (2026, 1, 'export', 26499.20, 'January target - Export'),
    (2026, 2, 'export', 21494.89, 'February target - Export'),
    (2026, 3, 'export', 22618.06, 'March target - Export'),
    (2026, 4, 'export', 25328.80, 'April target - Export'),
    (2026, 5, 'export', 44955.05, 'May target - Export'),
    (2026, 6, 'export', 24053.17, 'June target - Export'),
    (2026, 7, 'export', 27899.04, 'July target - Export'),
    (2026, 8, 'export', 33082.18, 'August target - Export'),
    (2026, 9, 'export', 51642.68, 'September target - Export'),
    (2026, 10, 'export', 54633.95, 'October target - Export'),
    (2026, 11, 'export', 28342.38, 'November target - Export'),
    (2026, 12, 'export', 32497.35, 'December target - Export')
ON CONFLICT (year, month, driver_type) 
DO UPDATE SET 
    budgeted_kilometers = EXCLUDED.budgeted_kilometers,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- ============================================
-- UPDATE LOCAL DRIVER BUDGETS FOR 2026
-- ============================================

INSERT INTO monthly_budgets (year, month, driver_type, budgeted_kilometers, notes)
VALUES
    (2026, 1, 'local', 63681.86, 'January target - Local'),
    (2026, 2, 'local', 57940.32, 'February target - Local'),
    (2026, 3, 'local', 60806.98, 'March target - Local'),
    (2026, 4, 'local', 66524.83, 'April target - Local'),
    (2026, 5, 'local', 68345.16, 'May target - Local'),
    (2026, 6, 'local', 78268.24, 'June target - Local'),
    (2026, 7, 'local', 67271.05, 'July target - Local'),
    (2026, 8, 'local', 69206.72, 'August target - Local'),
    (2026, 9, 'local', 65463.26, 'September target - Local'),
    (2026, 10, 'local', 74080.96, 'October target - Local'),
    (2026, 11, 'local', 86115.21, 'November target - Local'),
    (2026, 12, 'local', 69431.98, 'December target - Local')
ON CONFLICT (year, month, driver_type) 
DO UPDATE SET 
    budgeted_kilometers = EXCLUDED.budgeted_kilometers,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- ============================================
-- VERIFY THE UPDATES
-- ============================================

-- Show all 2026 budgets
SELECT 
    year,
    month,
    driver_type,
    budgeted_kilometers,
    notes
FROM monthly_budgets 
WHERE year = 2026
ORDER BY driver_type, month;

-- Show totals by driver type
SELECT 
    driver_type,
    SUM(budgeted_kilometers) as total_budget_km
FROM monthly_budgets 
WHERE year = 2026
GROUP BY driver_type
ORDER BY driver_type;

-- Show grand total
SELECT 
    '2026 Total Km Budget' as budget_name,
    SUM(budgeted_kilometers) as grand_total_km
FROM monthly_budgets 
WHERE year = 2026;
