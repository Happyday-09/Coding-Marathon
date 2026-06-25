-- Remove Korea-only coordinate constraints to allow testing from any location
ALTER TABLE public.run_points
  DROP CONSTRAINT IF EXISTS run_points_lng_check,
  DROP CONSTRAINT IF EXISTS run_points_lat_check;

ALTER TABLE public.run_points
  ADD CONSTRAINT run_points_lng_check CHECK (lng BETWEEN -180 AND 180),
  ADD CONSTRAINT run_points_lat_check CHECK (lat BETWEEN -90 AND 90);
