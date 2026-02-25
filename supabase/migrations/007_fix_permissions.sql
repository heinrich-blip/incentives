-- Migration: 007_fix_permissions
-- Description: Fix schema permissions for anon and authenticated roles
-- This is required for the app to work!
-- Created: 2026-01-18

-- Grant schema access to roles
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant table access to anon (for unauthenticated access)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;

-- Grant table access to authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- For future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

-- Disable RLS on all tables for development
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE kilometer_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE driver_performance DISABLE ROW LEVEL SECURITY;
ALTER TABLE incentive_calculations DISABLE ROW LEVEL SECURITY;
ALTER TABLE accidents DISABLE ROW LEVEL SECURITY;
ALTER TABLE incidents DISABLE ROW LEVEL SECURITY;
ALTER TABLE disciplinary_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE incentive_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE custom_formulas DISABLE ROW LEVEL SECURITY;
