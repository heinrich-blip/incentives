-- Add default_target column to scorecard_kpis table
-- Run this if you already have the scorecard tables but are missing the default_target column

ALTER TABLE scorecard_kpis 
ADD COLUMN
IF NOT EXISTS default_target DECIMAL
(15,2);

COMMENT ON COLUMN scorecard_kpis.default_target IS 'Default target value for this KPI';
