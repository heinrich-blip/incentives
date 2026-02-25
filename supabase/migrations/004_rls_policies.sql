-- Migration: 004_rls_policies
-- Description: Add Row Level Security policies for data access
-- Created: 2026-01-18

-- ============================================
-- RLS POLICIES FOR READING DATA
-- These policies allow authenticated users to read all data
-- and allow specific write operations
-- ============================================

-- Drivers table policies
DROP POLICY IF EXISTS "Allow authenticated read access to drivers" ON drivers;
CREATE POLICY "Allow authenticated read access to drivers"
  ON drivers FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert to drivers" ON drivers;
CREATE POLICY "Allow authenticated insert to drivers"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update to drivers" ON drivers;
CREATE POLICY "Allow authenticated update to drivers"
  ON drivers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete from drivers" ON drivers;
CREATE POLICY "Allow authenticated delete from drivers"
  ON drivers FOR DELETE
  TO authenticated
  USING (true);

-- Kilometer rates table policies
DROP POLICY IF EXISTS "Allow authenticated read access to kilometer_rates" ON kilometer_rates;
CREATE POLICY "Allow authenticated read access to kilometer_rates"
  ON kilometer_rates FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated write to kilometer_rates" ON kilometer_rates;
CREATE POLICY "Allow authenticated write to kilometer_rates"
  ON kilometer_rates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Monthly budgets table policies
DROP POLICY IF EXISTS "Allow authenticated read access to monthly_budgets" ON monthly_budgets;
CREATE POLICY "Allow authenticated read access to monthly_budgets"
  ON monthly_budgets FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated write to monthly_budgets" ON monthly_budgets;
CREATE POLICY "Allow authenticated write to monthly_budgets"
  ON monthly_budgets FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Incentive settings table policies
DROP POLICY IF EXISTS "Allow authenticated read access to incentive_settings" ON incentive_settings;
CREATE POLICY "Allow authenticated read access to incentive_settings"
  ON incentive_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated write to incentive_settings" ON incentive_settings;
CREATE POLICY "Allow authenticated write to incentive_settings"
  ON incentive_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Custom formulas table policies
DROP POLICY IF EXISTS "Allow authenticated read access to custom_formulas" ON custom_formulas;
CREATE POLICY "Allow authenticated read access to custom_formulas"
  ON custom_formulas FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated write to custom_formulas" ON custom_formulas;
CREATE POLICY "Allow authenticated write to custom_formulas"
  ON custom_formulas FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Driver performance table policies
DROP POLICY IF EXISTS "Allow authenticated read access to driver_performance" ON driver_performance;
CREATE POLICY "Allow authenticated read access to driver_performance"
  ON driver_performance FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated write to driver_performance" ON driver_performance;
CREATE POLICY "Allow authenticated write to driver_performance"
  ON driver_performance FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Incentive calculations table policies
DROP POLICY IF EXISTS "Allow authenticated read access to incentive_calculations" ON incentive_calculations;
CREATE POLICY "Allow authenticated read access to incentive_calculations"
  ON incentive_calculations FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated write to incentive_calculations" ON incentive_calculations;
CREATE POLICY "Allow authenticated write to incentive_calculations"
  ON incentive_calculations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Accidents table policies
DROP POLICY IF EXISTS "Allow authenticated read access to accidents" ON accidents;
CREATE POLICY "Allow authenticated read access to accidents"
  ON accidents FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated write to accidents" ON accidents;
CREATE POLICY "Allow authenticated write to accidents"
  ON accidents FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Incidents table policies
DROP POLICY IF EXISTS "Allow authenticated read access to incidents" ON incidents;
CREATE POLICY "Allow authenticated read access to incidents"
  ON incidents FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated write to incidents" ON incidents;
CREATE POLICY "Allow authenticated write to incidents"
  ON incidents FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Disciplinary records table policies
DROP POLICY IF EXISTS "Allow authenticated read access to disciplinary_records" ON disciplinary_records;
CREATE POLICY "Allow authenticated read access to disciplinary_records"
  ON disciplinary_records FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated write to disciplinary_records" ON disciplinary_records;
CREATE POLICY "Allow authenticated write to disciplinary_records"
  ON disciplinary_records FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Leave records table policies
DROP POLICY IF EXISTS "Allow authenticated read access to leave_records" ON leave_records;
CREATE POLICY "Allow authenticated read access to leave_records"
  ON leave_records FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated write to leave_records" ON leave_records;
CREATE POLICY "Allow authenticated write to leave_records"
  ON leave_records FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Audit log table policies (read-only for authenticated users)
DROP POLICY IF EXISTS "Allow authenticated read access to audit_log" ON audit_log;
CREATE POLICY "Allow authenticated read access to audit_log"
  ON audit_log FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- VERIFY POLICIES
-- ============================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
