-- Migration: 010_fix_audit_log_rls
-- Description: Disable RLS on audit_log and calculation_snapshots tables
-- Created: 2026-01-19

-- Disable RLS on audit_log table
ALTER TABLE
IF EXISTS audit_log DISABLE ROW LEVEL SECURITY;

-- Disable RLS on calculation_snapshots table (if exists)
ALTER TABLE
IF EXISTS calculation_snapshots DISABLE ROW LEVEL SECURITY;

-- Disable RLS on batch_calculation_jobs table (if exists)  
ALTER TABLE
IF EXISTS batch_calculation_jobs DISABLE ROW LEVEL SECURITY;

-- Grant public access to these tables
GRANT ALL ON audit_log TO anon;
GRANT ALL ON audit_log TO authenticated;

-- Grant on calculation tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT
    FROM information_schema.tables
    WHERE table_name = 'calculation_snapshots') THEN
    EXECUTE 'GRANT ALL ON calculation_snapshots TO anon';
    EXECUTE 'GRANT ALL ON calculation_snapshots TO authenticated';
END
IF;
    
    IF EXISTS (SELECT
FROM information_schema.tables
WHERE table_name = 'batch_calculation_jobs') THEN
EXECUTE 'GRANT ALL ON batch_calculation_jobs TO anon';
EXECUTE 'GRANT ALL ON batch_calculation_jobs TO authenticated';
END
IF;
END $$;

-- Also create permissive policies as a fallback
DROP POLICY
IF EXISTS "Allow all access to audit_log" ON audit_log;
CREATE POLICY "Allow all access to audit_log"
  ON audit_log FOR ALL
  TO anon, authenticated
  USING
(true)
  WITH CHECK
(true);
