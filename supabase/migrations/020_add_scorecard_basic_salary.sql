-- Migration: Add basic_salary to scorecard_summaries
-- Description: Store monthly basic salary for employees in the scorecard summary table
-- This allows tracking salary alongside performance score and bonus

ALTER TABLE scorecard_summaries 
ADD COLUMN IF NOT EXISTS basic_salary DECIMAL(15, 2) DEFAULT 0;

-- Optional: Add total_salary for easier calculations (basic + bonus)
-- Usually computed on the fly, but storing might be useful for history. 
-- However, given bonus is calculated, maybe keep it computed.

-- Create index for faster salary queries
CREATE INDEX IF NOT EXISTS idx_scorecard_summaries_salary ON scorecard_summaries(basic_salary);
