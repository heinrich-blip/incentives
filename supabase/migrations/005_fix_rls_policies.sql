-- Migration: 005_fix_rls_policies
-- Description: Fix RLS policies to allow authenticated users to access data
-- Run this AFTER creating a user account in Supabase Auth
-- Created: 2026-01-18

-- The issue is that policies need to explicitly allow authenticated role
-- Let's recreate them properly

-- Drivers table
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON drivers;
CREATE POLICY "Authenticated users can read drivers" ON drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert drivers" ON drivers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update drivers" ON drivers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete drivers" ON drivers FOR DELETE TO authenticated USING (true);

-- Accidents table
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON accidents;
CREATE POLICY "Authenticated users can read accidents" ON accidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert accidents" ON accidents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update accidents" ON accidents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete accidents" ON accidents FOR DELETE TO authenticated USING (true);

-- Incidents table
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON incidents;
CREATE POLICY "Authenticated users can read incidents" ON incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert incidents" ON incidents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update incidents" ON incidents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete incidents" ON incidents FOR DELETE TO authenticated USING (true);

-- Disciplinary records table
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON disciplinary_records;
CREATE POLICY "Authenticated users can read disciplinary_records" ON disciplinary_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert disciplinary_records" ON disciplinary_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update disciplinary_records" ON disciplinary_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete disciplinary_records" ON disciplinary_records FOR DELETE TO authenticated USING (true);

-- Leave records table
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON leave_records;
CREATE POLICY "Authenticated users can read leave_records" ON leave_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert leave_records" ON leave_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update leave_records" ON leave_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete leave_records" ON leave_records FOR DELETE TO authenticated USING (true);

-- Incentive settings table
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON incentive_settings;
CREATE POLICY "Authenticated users can read incentive_settings" ON incentive_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert incentive_settings" ON incentive_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update incentive_settings" ON incentive_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete incentive_settings" ON incentive_settings FOR DELETE TO authenticated USING (true);

-- Kilometer rates table
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON kilometer_rates;
CREATE POLICY "Authenticated users can read kilometer_rates" ON kilometer_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert kilometer_rates" ON kilometer_rates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update kilometer_rates" ON kilometer_rates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete kilometer_rates" ON kilometer_rates FOR DELETE TO authenticated USING (true);

-- Monthly budgets table
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON monthly_budgets;
CREATE POLICY "Authenticated users can read monthly_budgets" ON monthly_budgets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert monthly_budgets" ON monthly_budgets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update monthly_budgets" ON monthly_budgets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete monthly_budgets" ON monthly_budgets FOR DELETE TO authenticated USING (true);

-- Driver performance table
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON driver_performance;
CREATE POLICY "Authenticated users can read driver_performance" ON driver_performance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert driver_performance" ON driver_performance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update driver_performance" ON driver_performance FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete driver_performance" ON driver_performance FOR DELETE TO authenticated USING (true);

-- Incentive calculations table
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON incentive_calculations;
CREATE POLICY "Authenticated users can read incentive_calculations" ON incentive_calculations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert incentive_calculations" ON incentive_calculations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update incentive_calculations" ON incentive_calculations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete incentive_calculations" ON incentive_calculations FOR DELETE TO authenticated USING (true);

-- Custom formulas table
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON custom_formulas;
CREATE POLICY "Authenticated users can read custom_formulas" ON custom_formulas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert custom_formulas" ON custom_formulas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update custom_formulas" ON custom_formulas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete custom_formulas" ON custom_formulas FOR DELETE TO authenticated USING (true);

-- Audit log table (read only)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON audit_log;
CREATE POLICY "Authenticated users can read audit_log" ON audit_log FOR SELECT TO authenticated USING (true);

-- Verify policies were created
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, cmd;
