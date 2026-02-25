-- Migration: Update 2025 driver fuel efficiency (diesel consumption) data
-- Description: Update fuel_efficiency (km/L) for drivers from January to April 2025

-- Update fuel efficiency data using driver names
WITH
    driver_fuel_data
    AS
    (
        SELECT *
        FROM (VALUES
                ('Canaan', 'Chipfurutse', 1.55::DECIMAL, 2.05::DECIMAL, 2.89::DECIMAL, 2.54::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL),
                ('Enock', 'Mukonyerwa', 2.17::DECIMAL, 1.82::DECIMAL, 1.78::DECIMAL, 1.84::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL),
                ('Farai', 'Mlambo', NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL),
                ('Jonathan', 'Bepete', 1.72::DECIMAL, 2.38::DECIMAL, 3.11::DECIMAL, 2.14::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL),
                ('Lovemore', 'Qochiwe', 1.72::DECIMAL, 1.54::DECIMAL, 1.69::DECIMAL, 1.64::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL),
                ('Peter', 'Farai', 1.68::DECIMAL, 1.36::DECIMAL, 1.64::DECIMAL, 1.69::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL),
                ('Phillimon', 'Kwarire', 2.00::DECIMAL, 1.84::DECIMAL, 1.95::DECIMAL, 1.92::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL),
                ('Doctor', 'Kondwan', 1.76::DECIMAL, 1.87::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL),
                ('Adrian', 'Moyo', NULL::DECIMAL, NULL::DECIMAL, 1.65::DECIMAL, 1.78::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL),
                ('Silvanosi', 'Ramwi', NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL),
                ('Taurayi', 'Vherenaisi', NULL::DECIMAL, NULL::DECIMAL, 2.07::DECIMAL, 1.83::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL),
                ('Vengayi', 'Makozhombwe', 1.88::DECIMAL, 1.75::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL)
  ) AS t(first_name, last_name, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec)
    ),
    -- Unpivot the data to get one row per driver per month
    monthly_fuel_data
    AS
    (
        SELECT
            d.id as driver_id,
            2025 as year,
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
      WHEN 12 THEN dfd.dec
    END as fuel_efficiency
        FROM driver_fuel_data dfd
  CROSS JOIN (SELECT generate_series(1, 12) as month) m
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

-- Summary of 2025 fuel efficiency data:
-- Data available: January to April only
-- Farai Mlambo: No data
-- Silvanosi Ramwi: No data
-- Doctor Kondwan: Jan-Feb only
-- Adrian Moyo: Mar-Apr only
-- Taurayi Vherenaisi: Mar-Apr only
-- Vengayi Makozhombwe: Jan-Feb only
