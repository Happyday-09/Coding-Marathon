-- ✅ Fix 1: Add calories_kcal column to runs table (was missing, causing all saves to fail)
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS calories_kcal integer;

-- ✅ Fix 2: Add INSERT policy for profiles (needed for safe upsert on signup)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- ✅ Fix 3: Add personal parameters columns (if not already run)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS height numeric(5,1),
  ADD COLUMN IF NOT EXISTS weight numeric(5,1),
  ADD COLUMN IF NOT EXISTS max_heart_rate integer,
  ADD COLUMN IF NOT EXISTS resting_heart_rate integer,
  ADD COLUMN IF NOT EXISTS weekly_goal_km numeric(5,1) DEFAULT 20,
  ADD COLUMN IF NOT EXISTS target_pace_min integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS target_pace_sec integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS race_goal text;
