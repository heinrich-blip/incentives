-- Migration: Bulk insert 2024 driver utilization/performance data
-- Description: Insert actual kilometers data for drivers from January to November 2024

-- First, create a temporary table with driver names and their monthly km data
WITH driver_km_data AS (
  SELECT * FROM (VALUES
    ('Canaan', 'Chipfurutse', 10649, 5869, 9633, 12531, 12690, 6109, 7715, 11096, 12962, 14781, 4701),
    ('Enock', 'Mukonyerwa', 5554, 11012, 1365, 11745, 9955, 8389, 6449, 10054, 1521, 709, 9239),
    ('Farai', 'Mlambo', 5879, 9043, 9333, 3398, 4939, 13382, 11693, 10143, 14463, 7224, 6382),
    ('Jonathan', 'Bepete', 7829, 8142, 10023, 9136, 5129, 7840, 9218, 10721, 9018, 11471, 6366),
    ('Lovemore', 'Qochiwe', 2297, 1994, 5653, 1826, 6318, 9230, 2360, 4254, 5843, 831, 2596),
    ('Peter', 'Farai', 9960, 4680, 12054, 7304, 13104, 7422, 15209, 14409, 12619, 13732, 7976),
    ('Phillimon', 'Kwarire', 7215, 4010, 8763, 8269, 10695, 7873, 8503, 10397, 8970, 6154, 7687),
    ('Silvanosi', 'Ramwi', 9087, 5341, 6510, 7871, 8584, 5609, 10403, 0, 6441, 6903, 8151),
    ('Vengayi', 'Makozhombwe', 4757, 1470, 3880, 8838, 5848, 9089, 5406, 11137, 4156, 10403, 729)
  ) AS t(first_name, last_name, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov)
),
-- Unpivot the data to get one row per driver per month
monthly_data AS (
  SELECT 
    d.id as driver_id,
    2024 as year,
    m.month,
    CASE m.month
      WHEN 1 THEN dkm.jan
      WHEN 2 THEN dkm.feb
      WHEN 3 THEN dkm.mar
      WHEN 4 THEN dkm.apr
      WHEN 5 THEN dkm.may
      WHEN 6 THEN dkm.jun
      WHEN 7 THEN dkm.jul
      WHEN 8 THEN dkm.aug
      WHEN 9 THEN dkm.sep
      WHEN 10 THEN dkm.oct
      WHEN 11 THEN dkm.nov
    END as actual_kilometers
  FROM driver_km_data dkm
  CROSS JOIN (SELECT generate_series(1, 11) as month) m
  JOIN drivers d ON LOWER(d.first_name) = LOWER(dkm.first_name) 
                AND LOWER(d.last_name) = LOWER(dkm.last_name)
)
-- Insert the performance data
INSERT INTO driver_performance (driver_id, year, month, actual_kilometers, trips_completed)
SELECT 
  driver_id,
  year,
  month,
  actual_kilometers,
  0 as trips_completed
FROM monthly_data
WHERE actual_kilometers IS NOT NULL AND actual_kilometers > 0
ON CONFLICT (driver_id, year, month) 
DO UPDATE SET 
  actual_kilometers = EXCLUDED.actual_kilometers,
  updated_at = NOW();

-- Note: The following drivers had no data and were skipped:
-- - Doctor Kondwan
-- - Adrian Moyo
-- - Taurayi Vherenaisi
