-- Migration: 001_initial_schema
-- Description: Create initial database schema for Fleet Driver Incentives application
-- Created: 2026-01-18

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DRIVERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    date_of_birth DATE,
    hire_date DATE NOT NULL,
    license_number VARCHAR(100) NOT NULL,
    license_expiry DATE,
    license_class VARCHAR(20),
    passport_number VARCHAR(100),
    passport_expiry DATE,
    driver_type VARCHAR(20) NOT NULL CHECK (driver_type IN ('local', 'export')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'terminated')),
    base_salary DECIMAL(12, 2) DEFAULT 0,
    profile_image_url TEXT,
    address TEXT,
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_drivers_employee_id ON drivers(employee_id);
CREATE INDEX IF NOT EXISTS idx_drivers_driver_type ON drivers(driver_type);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);

-- ============================================
-- ACCIDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS accidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    incident_date DATE NOT NULL,
    incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN ('minor', 'moderate', 'severe', 'fatal')),
    description TEXT NOT NULL,
    location VARCHAR(255),
    vehicle_damage_cost DECIMAL(12, 2) DEFAULT 0,
    third_party_cost DECIMAL(12, 2) DEFAULT 0,
    insurance_claim_number VARCHAR(100),
    insurance_status VARCHAR(50) DEFAULT 'pending' CHECK (insurance_status IN ('pending', 'approved', 'rejected', 'settled')),
    at_fault BOOLEAN DEFAULT false,
    police_report_number VARCHAR(100),
    witnesses TEXT,
    resolution TEXT,
    resolved_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accidents_driver_id ON accidents(driver_id);
CREATE INDEX IF NOT EXISTS idx_accidents_incident_date ON accidents(incident_date);

-- ============================================
-- INCIDENTS TABLE (Non-accident incidents)
-- ============================================
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    incident_date DATE NOT NULL,
    incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN ('traffic_violation', 'customer_complaint', 'vehicle_misuse', 'safety_violation', 'policy_violation', 'other')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    action_taken TEXT,
    fine_amount DECIMAL(12, 2) DEFAULT 0,
    resolved BOOLEAN DEFAULT false,
    resolved_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_driver_id ON incidents(driver_id);

-- ============================================
-- DISCIPLINARY RECORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS disciplinary_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    record_type VARCHAR(50) NOT NULL CHECK (record_type IN ('verbal_warning', 'written_warning', 'final_warning', 'suspension', 'termination', 'other')),
    reason TEXT NOT NULL,
    description TEXT,
    issued_by VARCHAR(200),
    duration_days INTEGER,
    start_date DATE,
    end_date DATE,
    appeal_status VARCHAR(50) CHECK (appeal_status IN ('none', 'pending', 'approved', 'rejected')),
    documents TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disciplinary_driver_id ON disciplinary_records(driver_id);

-- ============================================
-- LEAVE RECORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS leave_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('annual', 'sick', 'unpaid', 'maternity', 'paternity', 'compassionate', 'other')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    reason TEXT,
    approved_by VARCHAR(200),
    approved_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_driver_id ON leave_records(driver_id);
CREATE INDEX IF NOT EXISTS idx_leave_dates ON leave_records(start_date, end_date);

-- ============================================
-- INCENTIVE SETTINGS TABLE (Master Sheet)
-- ============================================
CREATE TABLE IF NOT EXISTS incentive_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- KILOMETER RATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS kilometer_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_type VARCHAR(20) NOT NULL CHECK (driver_type IN ('local', 'export')),
    rate_per_km DECIMAL(10, 4) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_active_rate UNIQUE (driver_type, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_km_rates_type ON kilometer_rates(driver_type);
CREATE INDEX IF NOT EXISTS idx_km_rates_active ON kilometer_rates(is_active);

-- ============================================
-- MONTHLY BUDGETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS monthly_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    driver_type VARCHAR(20) NOT NULL CHECK (driver_type IN ('local', 'export')),
    budgeted_kilometers DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_monthly_budget UNIQUE (year, month, driver_type)
);

CREATE INDEX IF NOT EXISTS idx_budgets_year_month ON monthly_budgets(year, month);

-- ============================================
-- DRIVER PERFORMANCE TABLE (Monthly records)
-- ============================================
CREATE TABLE IF NOT EXISTS driver_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    actual_kilometers DECIMAL(12, 2) DEFAULT 0,
    trips_completed INTEGER DEFAULT 0,
    fuel_efficiency DECIMAL(6, 2),
    on_time_delivery_rate DECIMAL(5, 2),
    customer_rating DECIMAL(3, 2),
    safety_score DECIMAL(5, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_driver_monthly_perf UNIQUE (driver_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_performance_driver ON driver_performance(driver_id);
CREATE INDEX IF NOT EXISTS idx_performance_period ON driver_performance(year, month);

-- ============================================
-- INCENTIVE CALCULATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS incentive_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    base_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
    km_incentive DECIMAL(12, 2) DEFAULT 0,
    performance_bonus DECIMAL(12, 2) DEFAULT 0,
    safety_bonus DECIMAL(12, 2) DEFAULT 0,
    deductions DECIMAL(12, 2) DEFAULT 0,
    deduction_reason TEXT,
    total_incentive DECIMAL(12, 2) DEFAULT 0,
    total_earnings DECIMAL(12, 2) DEFAULT 0,
    calculation_details JSONB,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'paid')),
    approved_by VARCHAR(200),
    approved_date DATE,
    paid_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_driver_monthly_calc UNIQUE (driver_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_incentive_calc_driver ON incentive_calculations(driver_id);
CREATE INDEX IF NOT EXISTS idx_incentive_calc_period ON incentive_calculations(year, month);
CREATE INDEX IF NOT EXISTS idx_incentive_calc_status ON incentive_calculations(status);

-- ============================================
-- CUSTOM FORMULAS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS custom_formulas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formula_name VARCHAR(200) NOT NULL,
    formula_key VARCHAR(100) UNIQUE NOT NULL,
    formula_expression TEXT NOT NULL,
    description TEXT,
    applies_to VARCHAR(20) CHECK (applies_to IN ('all', 'local', 'export')),
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    variables JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(200),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_record ON audit_log(record_id);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables (drop first if exists)
DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_accidents_updated_at ON accidents;
CREATE TRIGGER update_accidents_updated_at BEFORE UPDATE ON accidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_incidents_updated_at ON incidents;
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_disciplinary_updated_at ON disciplinary_records;
CREATE TRIGGER update_disciplinary_updated_at BEFORE UPDATE ON disciplinary_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_updated_at ON leave_records;
CREATE TRIGGER update_leave_updated_at BEFORE UPDATE ON leave_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_incentive_settings_updated_at ON incentive_settings;
CREATE TRIGGER update_incentive_settings_updated_at BEFORE UPDATE ON incentive_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_km_rates_updated_at ON kilometer_rates;
CREATE TRIGGER update_km_rates_updated_at BEFORE UPDATE ON kilometer_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_monthly_budgets_updated_at ON monthly_budgets;
CREATE TRIGGER update_monthly_budgets_updated_at BEFORE UPDATE ON monthly_budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_performance_updated_at ON driver_performance;
CREATE TRIGGER update_performance_updated_at BEFORE UPDATE ON driver_performance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_incentive_calc_updated_at ON incentive_calculations;
CREATE TRIGGER update_incentive_calc_updated_at BEFORE UPDATE ON incentive_calculations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_custom_formulas_updated_at ON custom_formulas;
CREATE TRIGGER update_custom_formulas_updated_at BEFORE UPDATE ON custom_formulas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE accidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplinary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE incentive_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kilometer_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE incentive_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (drop first if exists)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON drivers;
CREATE POLICY "Enable all access for authenticated users" ON drivers FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON accidents;
CREATE POLICY "Enable all access for authenticated users" ON accidents FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON incidents;
CREATE POLICY "Enable all access for authenticated users" ON incidents FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON disciplinary_records;
CREATE POLICY "Enable all access for authenticated users" ON disciplinary_records FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON leave_records;
CREATE POLICY "Enable all access for authenticated users" ON leave_records FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON incentive_settings;
CREATE POLICY "Enable all access for authenticated users" ON incentive_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON kilometer_rates;
CREATE POLICY "Enable all access for authenticated users" ON kilometer_rates FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON monthly_budgets;
CREATE POLICY "Enable all access for authenticated users" ON monthly_budgets FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON driver_performance;
CREATE POLICY "Enable all access for authenticated users" ON driver_performance FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON incentive_calculations;
CREATE POLICY "Enable all access for authenticated users" ON incentive_calculations FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON custom_formulas;
CREATE POLICY "Enable all access for authenticated users" ON custom_formulas FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON audit_log;
CREATE POLICY "Enable all access for authenticated users" ON audit_log FOR ALL USING (true);

-- ============================================
-- ENABLE REALTIME
-- ============================================

-- Enable realtime for all main tables (safe to run multiple times)
DO $$
BEGIN
    -- Add tables to realtime publication if not already members
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'drivers') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'accidents') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE accidents;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'incidents') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'disciplinary_records') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE disciplinary_records;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'leave_records') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE leave_records;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'incentive_settings') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE incentive_settings;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'kilometer_rates') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE kilometer_rates;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'monthly_budgets') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE monthly_budgets;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'driver_performance') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE driver_performance;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'incentive_calculations') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE incentive_calculations;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'custom_formulas') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE custom_formulas;
    END IF;
END $$;
