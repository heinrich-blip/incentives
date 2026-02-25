-- Migration: Add USD and ZIG base salary fields to drivers
-- This allows for dual-currency salary tracking with month-on-month ZIG to USD conversion

-- Add new salary columns to drivers table
ALTER TABLE drivers 
  ADD COLUMN IF NOT EXISTS usd_base_salary DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS zig_base_salary DECIMAL(12, 2) DEFAULT 0;

-- Migrate existing base_salary to usd_base_salary
UPDATE drivers 
SET usd_base_salary = base_salary 
WHERE usd_base_salary = 0 OR usd_base_salary IS NULL;

-- Create ZIG to USD conversion rates table
CREATE TABLE IF NOT EXISTS zig_usd_conversion_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  rate DECIMAL(15, 4) NOT NULL CHECK (rate > 0), -- ZIG amount per 1 USD
  effective_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(year, month)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_zig_usd_rates_year_month ON zig_usd_conversion_rates(year, month);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_zig_usd_conversion_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS zig_usd_conversion_rates_updated_at ON zig_usd_conversion_rates;
CREATE TRIGGER zig_usd_conversion_rates_updated_at
  BEFORE UPDATE ON zig_usd_conversion_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_zig_usd_conversion_rates_updated_at();

-- Create function to calculate total base salary in USD
CREATE OR REPLACE FUNCTION calculate_total_base_salary(
  p_usd_base_salary DECIMAL,
  p_zig_base_salary DECIMAL,
  p_year INTEGER,
  p_month INTEGER
) RETURNS DECIMAL AS $$
DECLARE
  v_conversion_rate DECIMAL;
  v_zig_in_usd DECIMAL;
BEGIN
  -- Get the conversion rate for the specified month
  SELECT rate INTO v_conversion_rate
  FROM zig_usd_conversion_rates
  WHERE year = p_year AND month = p_month;
  
  -- If no rate found, use rate 1 (no conversion)
  IF v_conversion_rate IS NULL OR v_conversion_rate = 0 THEN
    v_conversion_rate := 1;
  END IF;
  
  -- Calculate ZIG to USD conversion
  v_zig_in_usd := COALESCE(p_zig_base_salary, 0) / v_conversion_rate;
  
  -- Return total USD salary
  RETURN COALESCE(p_usd_base_salary, 0) + v_zig_in_usd;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON COLUMN drivers.usd_base_salary IS 'Base salary in US Dollars';
COMMENT ON COLUMN drivers.zig_base_salary IS 'Base salary in ZIG (Zimbabwe Gold), converted to USD using monthly rates';
COMMENT ON COLUMN drivers.base_salary IS 'Total base salary in USD equivalent (usd_base_salary + zig_base_salary/conversion_rate)';
COMMENT ON TABLE zig_usd_conversion_rates IS 'Monthly ZIG to USD conversion rates';
COMMENT ON COLUMN zig_usd_conversion_rates.rate IS 'ZIG amount per 1 USD (e.g., 25 means 25 ZIG = 1 USD)';

-- Insert some sample conversion rates for 2025-2026
INSERT INTO zig_usd_conversion_rates (year, month, rate, effective_date, notes)
VALUES 
  (2025, 1, 25.00, '2025-01-01', 'January 2025 rate'),
  (2025, 2, 26.50, '2025-02-01', 'February 2025 rate'),
  (2025, 3, 27.00, '2025-03-01', 'March 2025 rate'),
  (2025, 4, 28.00, '2025-04-01', 'April 2025 rate'),
  (2025, 5, 28.50, '2025-05-01', 'May 2025 rate'),
  (2025, 6, 29.00, '2025-06-01', 'June 2025 rate'),
  (2025, 7, 30.00, '2025-07-01', 'July 2025 rate'),
  (2025, 8, 31.00, '2025-08-01', 'August 2025 rate'),
  (2025, 9, 32.00, '2025-09-01', 'September 2025 rate'),
  (2025, 10, 33.00, '2025-10-01', 'October 2025 rate'),
  (2025, 11, 34.00, '2025-11-01', 'November 2025 rate'),
  (2025, 12, 35.00, '2025-12-01', 'December 2025 rate'),
  (2026, 1, 36.00, '2026-01-01', 'January 2026 rate')
ON CONFLICT (year, month) DO UPDATE SET
  rate = EXCLUDED.rate,
  effective_date = EXCLUDED.effective_date,
  notes = EXCLUDED.notes;
