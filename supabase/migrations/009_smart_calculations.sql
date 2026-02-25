-- ============================================
-- MIGRATION: Add Smart Calculation Features
-- Phase 2.1: Automated Calculation Engine
-- ============================================

-- ============================================
-- CALCULATION SNAPSHOTS TABLE (for undo/rollback)
-- ============================================
CREATE TABLE IF NOT EXISTS calculation_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calculation_id UUID NOT NULL REFERENCES incentive_calculations(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(200),
    reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_snapshots_calculation ON calculation_snapshots(calculation_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_driver ON calculation_snapshots(driver_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_period ON calculation_snapshots(year, month);

-- ============================================
-- BATCH CALCULATION JOBS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS batch_calculation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_drivers INTEGER NOT NULL DEFAULT 0,
    processed_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    total_incentives DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_by VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_log JSONB
);

CREATE INDEX IF NOT EXISTS idx_batch_jobs_period ON batch_calculation_jobs(year, month);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_calculation_jobs(status);

-- ============================================
-- UPDATE AUDIT LOG TABLE
-- Add new action types for calculation operations
-- ============================================
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check 
    CHECK (action IN ('insert', 'update', 'delete', 'batch_calculate', 'approve', 'rollback'));

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE calculation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_calculation_jobs ENABLE ROW LEVEL SECURITY;

-- Policies for calculation_snapshots
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON calculation_snapshots;
CREATE POLICY "Enable all access for authenticated users" ON calculation_snapshots 
    FOR ALL USING (true);

-- Policies for batch_calculation_jobs
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON batch_calculation_jobs;
CREATE POLICY "Enable all access for authenticated users" ON batch_calculation_jobs 
    FOR ALL USING (true);

-- ============================================
-- FUNCTION: Auto-create audit log on incentive_calculations changes
-- ============================================
CREATE OR REPLACE FUNCTION log_incentive_calculation_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, new_values, changed_by)
        VALUES ('incentive_calculations', NEW.id, 'insert', row_to_json(NEW), 'system');
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('incentive_calculations', NEW.id, 'update', row_to_json(OLD), row_to_json(NEW), 'system');
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, changed_by)
        VALUES ('incentive_calculations', OLD.id, 'delete', row_to_json(OLD), 'system');
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for incentive_calculations
DROP TRIGGER IF EXISTS trigger_log_incentive_calculations ON incentive_calculations;
CREATE TRIGGER trigger_log_incentive_calculations
    AFTER INSERT OR UPDATE OR DELETE ON incentive_calculations
    FOR EACH ROW EXECUTE FUNCTION log_incentive_calculation_changes();

-- ============================================
-- FUNCTION: Auto-create snapshot before status changes
-- ============================================
CREATE OR REPLACE FUNCTION create_calculation_snapshot()
RETURNS TRIGGER AS $$
BEGIN
    -- Create snapshot only when status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO calculation_snapshots (calculation_id, driver_id, year, month, snapshot_data, created_by, reason)
        VALUES (
            OLD.id, 
            OLD.driver_id, 
            OLD.year, 
            OLD.month, 
            row_to_json(OLD), 
            'system', 
            'Status changed from ' || OLD.status || ' to ' || NEW.status
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-snapshot
DROP TRIGGER IF EXISTS trigger_create_snapshot ON incentive_calculations;
CREATE TRIGGER trigger_create_snapshot
    BEFORE UPDATE ON incentive_calculations
    FOR EACH ROW EXECUTE FUNCTION create_calculation_snapshot();
