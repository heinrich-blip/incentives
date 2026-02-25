-- Scorecard System for Transport Officer, Data Analyst, Workshop Supervisor, Inventory Clerk
-- ============================================

-- Roles/Positions table
CREATE TABLE IF NOT EXISTS scorecard_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(100) NOT NULL UNIQUE,
    role_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Key Result Areas (KRA) table
CREATE TABLE IF NOT EXISTS scorecard_kras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES scorecard_roles(id) ON DELETE CASCADE,
    kra_name VARCHAR(100) NOT NULL,
    weighting DECIMAL(5,2) NOT NULL CHECK (weighting >= 0 AND weighting <= 100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- KPIs within each KRA
CREATE TABLE IF NOT EXISTS scorecard_kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kra_id UUID NOT NULL REFERENCES scorecard_kras(id) ON DELETE CASCADE,
    kpi_name VARCHAR(200) NOT NULL,
    description TEXT,
    measurement_type VARCHAR(50) NOT NULL CHECK (measurement_type IN ('percentage', 'number', 'currency', 'ratio', 'count', 'yes_no')),
    target_direction VARCHAR(20) DEFAULT 'higher_better' CHECK (target_direction IN ('higher_better', 'lower_better', 'exact')),
    weighting DECIMAL(5,2) NOT NULL CHECK (weighting >= 0 AND weighting <= 100),
    unit VARCHAR(50), -- e.g., '%', 'km/L', 'R', 'days'
    default_target DECIMAL(15,2), -- Default target value for this KPI
    min_value DECIMAL(15,2),
    max_value DECIMAL(15,2),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly targets for KPIs (can vary by month)
CREATE TABLE IF NOT EXISTS scorecard_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_id UUID NOT NULL REFERENCES scorecard_kpis(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    target_value DECIMAL(15,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(kpi_id, year, month)
);

-- Employee assignments to roles (for scorecard tracking)
CREATE TABLE IF NOT EXISTS scorecard_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_id UUID NOT NULL REFERENCES scorecard_roles(id),
    department VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    hire_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly scorecard entries (actual values)
CREATE TABLE IF NOT EXISTS scorecard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES scorecard_employees(id) ON DELETE CASCADE,
    kpi_id UUID NOT NULL REFERENCES scorecard_kpis(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    actual_value DECIMAL(15,2) NOT NULL,
    target_value DECIMAL(15,2), -- Snapshot of target at time of entry
    achievement_percentage DECIMAL(7,2), -- Calculated: (actual/target)*100 or inverse
    score DECIMAL(7,2), -- Based on scoring table
    weighted_score DECIMAL(7,2), -- score * weighting
    notes TEXT,
    entered_by UUID,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, kpi_id, year, month)
);

-- Monthly scorecard summary (aggregated per employee per month)
CREATE TABLE IF NOT EXISTS scorecard_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES scorecard_employees(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    total_weighted_score DECIMAL(7,2),
    final_rating VARCHAR(20), -- e.g., 'Excellent', 'Good', 'Satisfactory', 'Needs Improvement'
    safety_incidents INTEGER DEFAULT 0,
    bonus_eligible BOOLEAN DEFAULT true,
    bonus_amount DECIMAL(15,2),
    comments TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'finalized')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, year, month)
);

-- Scoring rules table (defines how achievement % maps to scores)
CREATE TABLE IF NOT EXISTS scorecard_scoring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES scorecard_roles(id) ON DELETE CASCADE, -- NULL means applies to all roles
    min_achievement DECIMAL(7,2) NOT NULL,
    max_achievement DECIMAL(7,2) NOT NULL,
    score DECIMAL(7,2) NOT NULL,
    label VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Insert default roles
-- ============================================
INSERT INTO scorecard_roles (role_name, role_code, description) VALUES
('Transport Officer', 'transport_officer', 'Manages transport operations, fleet coordination, and driver management'),
('Data Analyst', 'data_analyst', 'Handles data analysis, reporting, and business intelligence'),
('Workshop Supervisor', 'workshop_supervisor', 'Oversees vehicle maintenance, repairs, and workshop operations'),
('Inventory Clerk', 'inventory_clerk', 'Manages inventory, stock control, and procurement')
ON CONFLICT (role_code) DO NOTHING;

-- ============================================
-- Insert KRAs and KPIs for Transport Officer
-- ============================================
DO $$
DECLARE
    v_role_id UUID;
    v_kra_id UUID;
BEGIN
    SELECT id INTO v_role_id FROM scorecard_roles WHERE role_code = 'transport_officer';
    
    -- SAFETY KRA (10%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Safety', 10, 1)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'Accidents', 'Number of accidents - target is zero', 'count', 'lower_better', 33.3, 'count'),
    (v_kra_id, 'Breakdowns', 'Number of breakdowns - target is zero', 'count', 'lower_better', 33.3, 'count'),
    (v_kra_id, 'Incidents', 'Number of safety incidents - target is zero', 'count', 'lower_better', 33.4, 'count');
    
    -- FUEL EFFICIENCY KRA (20%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Fuel Efficiency', 20, 2)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'KM/Lt', 'Kilometers per liter - budget vs actual', 'ratio', 'higher_better', 100, 'km/L');
    
    -- SERVICE DELIVERY KRA (20%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Service Delivery', 20, 3)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'On-Time Delivery', 'Actual delay time vs planned - achieve 100%', 'percentage', 'higher_better', 100, '%');
    
    -- UTILIZATION KRA (20%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Utilization', 20, 4)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'KMs Per Month', 'Monthly kilometers budget vs actual utilization', 'number', 'higher_better', 100, 'km');
    
    -- COMPLIANCE KRA (15%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Compliance', 15, 5)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'COF & Licensing', 'On-time COF, road fitness, license renewal, permits', 'percentage', 'higher_better', 50, '%'),
    (v_kra_id, 'Operational Compliance', 'Driver forms and compliance documentation', 'percentage', 'higher_better', 50, '%');
    
    -- HUMAN CAPITAL KRA (15%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Human Capital', 15, 6)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'Drivecam Management', 'Drivecam events management score', 'percentage', 'lower_better', 50, 'events'),
    (v_kra_id, 'Leave Management', 'Leave planning and management compliance', 'percentage', 'higher_better', 50, '%');
END $$;

-- ============================================
-- Insert KRAs and KPIs for Data Analyst
-- ============================================
DO $$
DECLARE
    v_role_id UUID;
    v_kra_id UUID;
BEGIN
    SELECT id INTO v_role_id FROM scorecard_roles WHERE role_code = 'data_analyst';
    
    -- DATA QUALITY KRA (25%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Data Quality', 25, 1)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'Data Accuracy', 'Accuracy of data entries and reports', 'percentage', 'higher_better', 50, '%'),
    (v_kra_id, 'Data Completeness', 'Completeness of required data fields', 'percentage', 'higher_better', 50, '%');
    
    -- REPORTING KRA (25%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Reporting', 25, 2)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'Report Timeliness', 'On-time delivery of scheduled reports', 'percentage', 'higher_better', 50, '%'),
    (v_kra_id, 'Report Quality', 'Quality and accuracy of reports produced', 'percentage', 'higher_better', 50, '%');
    
    -- ANALYSIS KRA (25%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Analysis & Insights', 25, 3)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'Insights Delivered', 'Number of actionable insights provided', 'count', 'higher_better', 50, 'count'),
    (v_kra_id, 'Analysis Requests', 'Completion rate of analysis requests', 'percentage', 'higher_better', 50, '%');
    
    -- SYSTEMS KRA (15%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Systems & Tools', 15, 4)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'System Uptime', 'Dashboard and reporting system availability', 'percentage', 'higher_better', 50, '%'),
    (v_kra_id, 'Process Automation', 'Automation of manual processes', 'percentage', 'higher_better', 50, '%');
    
    -- COMPLIANCE KRA (10%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Compliance', 10, 5)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'Data Security', 'Compliance with data security protocols', 'percentage', 'higher_better', 100, '%');
END $$;

-- ============================================
-- Insert KRAs and KPIs for Workshop Supervisor
-- ============================================
DO $$
DECLARE
    v_role_id UUID;
    v_kra_id UUID;
BEGIN
    SELECT id INTO v_role_id FROM scorecard_roles WHERE role_code = 'workshop_supervisor';
    
    -- VEHICLE MAINTENANCE KRA (30%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Vehicle Maintenance', 30, 1)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'Scheduled Maintenance', 'On-time completion of scheduled maintenance', 'percentage', 'higher_better', 40, '%'),
    (v_kra_id, 'Breakdown Response', 'Average response time for breakdowns', 'number', 'lower_better', 30, 'hours'),
    (v_kra_id, 'First-Time Fix Rate', 'Repairs completed correctly first time', 'percentage', 'higher_better', 30, '%');
    
    -- FLEET AVAILABILITY KRA (25%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Fleet Availability', 25, 2)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'Vehicle Uptime', 'Percentage of fleet operational', 'percentage', 'higher_better', 60, '%'),
    (v_kra_id, 'Turnaround Time', 'Average repair turnaround time', 'number', 'lower_better', 40, 'days');
    
    -- COST MANAGEMENT KRA (20%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Cost Management', 20, 3)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'Repair Cost vs Budget', 'Actual repair costs against budget', 'percentage', 'lower_better', 50, '%'),
    (v_kra_id, 'Parts Cost Efficiency', 'Parts procurement cost efficiency', 'percentage', 'higher_better', 50, '%');
    
    -- SAFETY & COMPLIANCE KRA (15%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Safety & Compliance', 15, 4)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'Workshop Safety', 'Safety incidents in workshop - zero target', 'count', 'lower_better', 50, 'count'),
    (v_kra_id, 'COF Pass Rate', 'First-time COF pass rate', 'percentage', 'higher_better', 50, '%');
    
    -- TEAM MANAGEMENT KRA (10%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Team Management', 10, 5)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'Team Productivity', 'Technician productivity rate', 'percentage', 'higher_better', 50, '%'),
    (v_kra_id, 'Training Completion', 'Team training completion rate', 'percentage', 'higher_better', 50, '%');
END $$;

-- ============================================
-- Insert KRAs and KPIs for Inventory Clerk
-- ============================================
DO $$
DECLARE
    v_role_id UUID;
    v_kra_id UUID;
BEGIN
    SELECT id INTO v_role_id FROM scorecard_roles WHERE role_code = 'inventory_clerk';
    
    -- STOCK MANAGEMENT KRA (30%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Stock Management', 30, 1)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'Stock Accuracy', 'Physical vs system stock accuracy', 'percentage', 'higher_better', 40, '%'),
    (v_kra_id, 'Stock-Out Rate', 'Frequency of stock-outs for critical items', 'percentage', 'lower_better', 30, '%'),
    (v_kra_id, 'Dead Stock', 'Percentage of dead/obsolete stock', 'percentage', 'lower_better', 30, '%');
    
    -- PROCUREMENT KRA (25%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Procurement', 25, 2)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'Order Accuracy', 'Accuracy of purchase orders', 'percentage', 'higher_better', 40, '%'),
    (v_kra_id, 'Supplier Lead Time', 'Average supplier delivery time vs target', 'percentage', 'higher_better', 30, '%'),
    (v_kra_id, 'Cost Savings', 'Procurement cost savings achieved', 'percentage', 'higher_better', 30, '%');
    
    -- DOCUMENTATION KRA (20%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Documentation', 20, 3)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'GRN Processing', 'On-time goods received note processing', 'percentage', 'higher_better', 50, '%'),
    (v_kra_id, 'Record Keeping', 'Completeness and accuracy of records', 'percentage', 'higher_better', 50, '%');
    
    -- WAREHOUSE MANAGEMENT KRA (15%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Warehouse Management', 15, 4)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'Storage Organization', '5S compliance and organization', 'percentage', 'higher_better', 50, '%'),
    (v_kra_id, 'Issue Turnaround', 'Time to fulfill internal requests', 'number', 'lower_better', 50, 'hours');
    
    -- COMPLIANCE KRA (10%)
    INSERT INTO scorecard_kras (role_id, kra_name, weighting, sort_order)
    VALUES (v_role_id, 'Compliance', 10, 5)
    RETURNING id INTO v_kra_id;
    
    INSERT INTO scorecard_kpis (kra_id, kpi_name, description, measurement_type, target_direction, weighting, unit) VALUES
    (v_kra_id, 'Audit Compliance', 'Inventory audit compliance score', 'percentage', 'higher_better', 100, '%');
END $$;

-- ============================================
-- Insert default scoring rules (applies to all roles)
-- ============================================
INSERT INTO scorecard_scoring_rules (role_id, min_achievement, max_achievement, score, label) VALUES
(NULL, 0, 50, 50, 'Poor'),
(NULL, 50, 60, 60, 'Below Average'),
(NULL, 60, 70, 70, 'Satisfactory'),
(NULL, 70, 80, 80, 'Good'),
(NULL, 80, 90, 90, 'Very Good'),
(NULL, 90, 100, 100, 'Excellent'),
(NULL, 100, 150, 100, 'Exceeded'); -- For exceeding targets

-- ============================================
-- Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_scorecard_kras_role ON scorecard_kras(role_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_kpis_kra ON scorecard_kpis(kra_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_targets_kpi_period ON scorecard_targets(kpi_id, year, month);
CREATE INDEX IF NOT EXISTS idx_scorecard_employees_role ON scorecard_employees(role_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_entries_employee_period ON scorecard_entries(employee_id, year, month);
CREATE INDEX IF NOT EXISTS idx_scorecard_summaries_employee_period ON scorecard_summaries(employee_id, year, month);

-- ============================================
-- Create updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_scorecard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_scorecard_roles_updated_at ON scorecard_roles;
CREATE TRIGGER update_scorecard_roles_updated_at BEFORE UPDATE ON scorecard_roles FOR EACH ROW EXECUTE FUNCTION update_scorecard_updated_at();

DROP TRIGGER IF EXISTS update_scorecard_kras_updated_at ON scorecard_kras;
CREATE TRIGGER update_scorecard_kras_updated_at BEFORE UPDATE ON scorecard_kras FOR EACH ROW EXECUTE FUNCTION update_scorecard_updated_at();

DROP TRIGGER IF EXISTS update_scorecard_kpis_updated_at ON scorecard_kpis;
CREATE TRIGGER update_scorecard_kpis_updated_at BEFORE UPDATE ON scorecard_kpis FOR EACH ROW EXECUTE FUNCTION update_scorecard_updated_at();

DROP TRIGGER IF EXISTS update_scorecard_targets_updated_at ON scorecard_targets;
CREATE TRIGGER update_scorecard_targets_updated_at BEFORE UPDATE ON scorecard_targets FOR EACH ROW EXECUTE FUNCTION update_scorecard_updated_at();

DROP TRIGGER IF EXISTS update_scorecard_employees_updated_at ON scorecard_employees;
CREATE TRIGGER update_scorecard_employees_updated_at BEFORE UPDATE ON scorecard_employees FOR EACH ROW EXECUTE FUNCTION update_scorecard_updated_at();

DROP TRIGGER IF EXISTS update_scorecard_entries_updated_at ON scorecard_entries;
CREATE TRIGGER update_scorecard_entries_updated_at BEFORE UPDATE ON scorecard_entries FOR EACH ROW EXECUTE FUNCTION update_scorecard_updated_at();

DROP TRIGGER IF EXISTS update_scorecard_summaries_updated_at ON scorecard_summaries;
CREATE TRIGGER update_scorecard_summaries_updated_at BEFORE UPDATE ON scorecard_summaries FOR EACH ROW EXECUTE FUNCTION update_scorecard_updated_at();
