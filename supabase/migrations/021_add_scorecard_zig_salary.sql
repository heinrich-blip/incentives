-- Migration: Add ZIG salary component to scorecard summaries
-- Description: Allows storing employee ZIG basic salary per scorecard month and converting to USD via monthly conversion rate

ALTER TABLE scorecard_summaries
ADD COLUMN IF NOT EXISTS zig_base_salary DECIMAL(15, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_scorecard_summaries_zig_base_salary
ON scorecard_summaries(zig_base_salary);
