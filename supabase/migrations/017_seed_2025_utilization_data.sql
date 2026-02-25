-- Migration: Bulk insert 2025 driver utilization/performance data
-- Description: Insert actual kilometers data for drivers from January to December 2025

-- First, create a temporary table with driver names and their monthly km data
WITH driver_km_data AS (
  SELECT * FROM (VALUES
    ('Canaan', 'Chipfurutse', 5402::INTEGER, 6177::INTEGER, 5657::INTEGER, 11389::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 7398::INTEGER, 9440::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER),
    ('Enock', 'Mukonyerwa', 8769::INTEGER, 5105::INTEGER, 5989::INTEGER, 7608::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 8979::INTEGER, 5159::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER),
    ('Farai', 'Mlambo', NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER),
    ('Jonathan', 'Bepete', 9340::INTEGER, 8244::INTEGER, 9113::INTEGER, 11257::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 4351::INTEGER, 12529::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER),
    ('Lovemore', 'Qochiwe', 12042::INTEGER, 1451::INTEGER, 9023::INTEGER, 8281::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 1291::INTEGER, 761::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER),
    ('Peter', 'Farai', 11691::INTEGER, 7309::INTEGER, 12823::INTEGER, 9168::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 10145::INTEGER, 10625::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER),
    ('Phillimon', 'Kwarire', 12696::INTEGER, 12519::INTEGER, 10450::INTEGER, 9259::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 8904::INTEGER, 10626::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER),
    ('Doctor', 'Kondwan', NULL::INTEGER, NULL::INTEGER, 3779::INTEGER, 12080::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 8882::INTEGER, 10794::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER),
    ('Adrian', 'Moyo', NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 1691::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 10329::INTEGER, 13184::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER),
    ('Silvanosi', 'Ramwi', 11324::INTEGER, 5939::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER),
    ('Taurayi', 'Vherenaisi', NULL::INTEGER, NULL::INTEGER, 5677::INTEGER, 7162::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 5873::INTEGER, 11132::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER),
    ('Vengayi', 'Makozhombwe', 10280::INTEGER, 8378::INTEGER, 1184::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER)
  ) AS t(first_name, last_name, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec)
),
-- Unpivot the data to get one row per driver per month
monthly_data AS (
  SELECT 
    d.id as driver_id,
    2025 as year,
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
      WHEN 12 THEN dkm.dec
    END as actual_kilometers
  FROM driver_km_data dkm
  CROSS JOIN (SELECT generate_series(1, 12) as month) m
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

-- Summary of 2025 data:
-- Months with data: Jan-Apr and Aug-Sep (May-Jul and Oct-Dec appear to be missing data)
-- Farai Mlambo: No data for 2025
-- Drivers with partial data in early months only: Silvanosi Ramwi (Jan-Feb), Vengayi Makozhombwe (Jan-Mar)
