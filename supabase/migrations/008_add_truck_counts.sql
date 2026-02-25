-- Migration: 008_add_truck_counts
-- Description: Add truck_count column to monthly_budgets for calculating target KM per truck
-- Created: 2026-01-18

-- Add truck_count column to monthly_budgets table
ALTER TABLE monthly_budgets 
ADD COLUMN
IF NOT EXISTS truck_count INTEGER DEFAULT 1;

-- Add comment explaining the column
COMMENT ON COLUMN monthly_budgets.truck_count IS 'Number of trucks operating for this driver type in this month. Used to calculate target KM per truck (budgeted_kilometers / truck_count)';

-- Update existing records with default truck counts (can be adjusted later)
UPDATE monthly_budgets SET truck_count = 4 WHERE driver_type = 'local' AND truck_count IS NULL;
UPDATE monthly_budgets SET truck_count = 4 WHERE driver_type = 'export' AND truck_count IS NULL;
