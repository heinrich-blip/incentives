-- Migration: Update 2024 driver fuel efficiency (diesel consumption) data
-- Description: Update fuel_efficiency (km/L) for drivers from January to November 2024

-- Update fuel efficiency data using driver names
WITH
    driver_fuel_data
    AS
    (
        SELECT *
        FROM (VALUES
                ('Canaan', 'Chipfurutse', 1.74, 1.82, 1.65, 1.69, 1.69, 1.74, 1.76, 1.70, 1.71, 1.79, 1.86),
                ('Enock', 'Mukonyerwa', 1.83, 1.80, 1.79, 1.81, 1.81, 1.86, 1.78, 2.09, 1.89, 1.20, 1.94),
                ('Farai', 'Mlambo', 1.67, 1.66, 1.82, 1.73, 1.48, 1.77, 1.76, 1.89, 1.81, 1.87, 1.81),
                ('Jonathan', 'Bepete', 2.04, 1.94, 2.07, 1.98, 1.95, 2.00, 2.00, 1.79, 1.86, 1.81, 1.91),
                ('Lovemore', 'Qochiwe', 1.61, 2.00, 1.76, 1.53, 1.74, 1.75, 1.73, 1.81, 2.03, 1.61, 1.68),
                ('Peter', 'Farai', 1.81, 1.60, 1.89, 1.76, 1.76, 1.69, 1.83, 1.82, 1.87, 1.91, 1.71),
                ('Phillimon', 'Kwarire', 2.11, 2.29, 2.10, 2.03, 2.10, 1.82, 1.98, 1.96, 2.02, 2.08, 2.13),
                ('Silvanosi', 'Ramwi', 1.63, 1.75, 1.80, 2.09, 2.10, 1.77, 2.15, NULL, 2.15, 1.99, 2.10),
                ('Vengayi', 'Makozhombwe', 1.71, 1.39, 3.09, 1.73, 1.82, 1.71, 2.17, 1.92, 1.75, 1.87, 1.97)
  ) AS t(first_name, last_name, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov)
    ),
    -- Unpivot the data to get one row per driver per month
    monthly_fuel_data
    AS
    (
        SELECT
            d.id as driver_id,
            2024 as year,
            m.month,
            CASE m.month
      WHEN 1 THEN dfd.jan
      WHEN 2 THEN dfd.feb
      WHEN 3 THEN dfd.mar
      WHEN 4 THEN dfd.apr
      WHEN 5 THEN dfd.may
      WHEN 6 THEN dfd.jun
      WHEN 7 THEN dfd.jul
      WHEN 8 THEN dfd.aug
      WHEN 9 THEN dfd.sep
      WHEN 10 THEN dfd.oct
      WHEN 11 THEN dfd.nov
    END as fuel_efficiency
        FROM driver_fuel_data dfd
  CROSS JOIN (SELECT generate_series(1, 11) as month) m
            JOIN drivers d ON LOWER(d.first_name) = LOWER(dfd.first_name)
                AND LOWER(d.last_name) = LOWER(dfd.last_name)
    )
-- Update existing performance records with fuel efficiency data
UPDATE driver_performance dp
SET 
  fuel_efficiency
= mfd.fuel_efficiency,
  updated_at = NOW
()
FROM monthly_fuel_data mfd
WHERE dp.driver_id = mfd.driver_id
  AND dp.year = mfd.year
  AND dp.month = mfd.month
  AND mfd.fuel_efficiency IS NOT NULL;

-- Note: The following drivers had no fuel data and were skipped:
-- - Doctor Kondwan
-- - Adrian Moyo
-- - Taurayi Vherenaisi
-- Note: Silvanosi Ramwi's August data was NULL (no data for that month)
