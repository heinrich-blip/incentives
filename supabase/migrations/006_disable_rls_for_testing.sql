-- Migration: 006_disable_rls_for_testing
-- Description: Temporarily disable RLS to allow all access for testing
-- WARNING: Only use this for development/testing, not production!
-- Created: 2026-01-18

-- Disable RLS on all tables
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE accidents DISABLE ROW LEVEL SECURITY;
ALTER TABLE incidents DISABLE ROW LEVEL SECURITY;
ALTER TABLE disciplinary_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE incentive_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE kilometer_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE driver_performance DISABLE ROW LEVEL SECURITY;
ALTER TABLE incentive_calculations DISABLE ROW LEVEL SECURITY;
ALTER TABLE custom_formulas DISABLE ROW LEVEL SECURITY;

-- Grant public access (anon role can now read/write)
GRANT ALL ON drivers TO anon;
GRANT ALL ON accidents TO anon;
GRANT ALL ON incidents TO anon;
GRANT ALL ON disciplinary_records TO anon;
GRANT ALL ON leave_records TO anon;
GRANT ALL ON incentive_settings TO anon;
GRANT ALL ON kilometer_rates TO anon;
GRANT ALL ON monthly_budgets TO anon;
GRANT ALL ON driver_performance TO anon;
GRANT ALL ON incentive_calculations TO anon;
GRANT ALL ON custom_formulas TO anon;
