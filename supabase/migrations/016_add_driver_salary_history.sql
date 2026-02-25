-- Migration: Add driver salary history for month-to-month salary tracking
-- Description: Create a table to track driver salaries over time (both USD and ZIG components)
-- This allows for historical accuracy when salaries change and exchange rates fluctuate

-- ============================================
-- DRIVER SALARY HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS driver_salary_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    usd_base_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
    zig_base_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
    effective_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_driver_salary_period UNIQUE (driver_id, year, month)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_driver_salary_history_driver ON driver_salary_history(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_salary_history_period ON driver_salary_history(year, month);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_driver_salary_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS driver_salary_history_updated_at ON driver_salary_history;
CREATE TRIGGER driver_salary_history_updated_at
  BEFORE UPDATE ON driver_salary_history
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_salary_history_updated_at();

-- ============================================
-- FUNCTION: Get driver salary for a specific period
-- Returns USD and ZIG salary for a driver in a given month
-- Falls back to most recent salary if no exact match
-- ============================================
CREATE OR REPLACE FUNCTION get_driver_salary_for_period(
    p_driver_id UUID,
    p_year INTEGER,
    p_month INTEGER
) RETURNS TABLE (
    usd_base_salary DECIMAL,
    zig_base_salary DECIMAL,
    source_year INTEGER,
    source_month INTEGER
) AS $$
BEGIN
    -- First try exact match for the period
    RETURN QUERY
    SELECT 
        dsh.usd_base_salary,
        dsh.zig_base_salary,
        dsh.year as source_year,
        dsh.month as source_month
    FROM driver_salary_history dsh
    WHERE dsh.driver_id = p_driver_id
      AND dsh.year = p_year
      AND dsh.month = p_month
    LIMIT 1;
    
    -- If no rows returned, get the most recent salary before this period
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            dsh.usd_base_salary,
            dsh.zig_base_salary,
            dsh.year as source_year,
            dsh.month as source_month
        FROM driver_salary_history dsh
        WHERE dsh.driver_id = p_driver_id
          AND (dsh.year < p_year OR (dsh.year = p_year AND dsh.month < p_month))
        ORDER BY dsh.year DESC, dsh.month DESC
        LIMIT 1;
    END IF;
    
    -- If still no rows, fall back to driver table values
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            d.usd_base_salary,
            d.zig_base_salary,
            NULL::INTEGER as source_year,
            NULL::INTEGER as source_month
        FROM drivers d
        WHERE d.id = p_driver_id
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Calculate total base salary in USD for a period
-- Combines USD salary + ZIG salary converted using that month's rate
-- ============================================
CREATE OR REPLACE FUNCTION calculate_period_base_salary_usd(
    p_driver_id UUID,
    p_year INTEGER,
    p_month INTEGER
) RETURNS DECIMAL AS $$
DECLARE
    v_usd_salary DECIMAL;
    v_zig_salary DECIMAL;
    v_conversion_rate DECIMAL;
    v_zig_in_usd DECIMAL;
BEGIN
    -- Get salary for the period
    SELECT usd_base_salary, zig_base_salary 
    INTO v_usd_salary, v_zig_salary
    FROM get_driver_salary_for_period(p_driver_id, p_year, p_month);
    
    -- Get conversion rate for the period
    SELECT rate INTO v_conversion_rate
    FROM zig_usd_conversion_rates
    WHERE year = p_year AND month = p_month;
    
    -- Default rate if not found
    IF v_conversion_rate IS NULL OR v_conversion_rate = 0 THEN
        v_conversion_rate := 1;
    END IF;
    
    -- Calculate ZIG to USD
    v_zig_in_usd := COALESCE(v_zig_salary, 0) / v_conversion_rate;
    
    -- Return total
    RETURN COALESCE(v_usd_salary, 0) + v_zig_in_usd;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEW: Driver salaries with current month calculation
-- ============================================
CREATE OR REPLACE VIEW v_driver_current_salaries AS
SELECT 
    d.id as driver_id,
    d.employee_id,
    d.first_name,
    d.last_name,
    d.driver_type,
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER as current_year,
    EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER as current_month,
    salary_info.usd_base_salary,
    salary_info.zig_base_salary,
    salary_info.source_year,
    salary_info.source_month,
    COALESCE(rate.rate, 1) as conversion_rate,
    calculate_period_base_salary_usd(
        d.id, 
        EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 
        EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
    ) as total_usd_salary
FROM drivers d
LEFT JOIN LATERAL get_driver_salary_for_period(
    d.id,
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
) salary_info ON true
LEFT JOIN zig_usd_conversion_rates rate 
    ON rate.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER 
    AND rate.month = EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
WHERE d.status = 'active';

-- Add comments for documentation
COMMENT ON TABLE driver_salary_history IS 'Historical record of driver salaries by month, supporting both USD and ZIG components';
COMMENT ON COLUMN driver_salary_history.usd_base_salary IS 'Base salary component in US Dollars for this period';
COMMENT ON COLUMN driver_salary_history.zig_base_salary IS 'Base salary component in ZIG for this period (converted using monthly rate)';
COMMENT ON FUNCTION get_driver_salary_for_period IS 'Returns driver salary for a specific period, with fallback to most recent or default';
COMMENT ON FUNCTION calculate_period_base_salary_usd IS 'Calculates total USD equivalent salary for a driver in a specific period';
