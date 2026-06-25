-- Add personal running parameters to profiles table
alter table public.profiles
  add column if not exists age integer,
  add column if not exists height numeric(5,1),
  add column if not exists weight numeric(5,1),
  add column if not exists max_heart_rate integer,
  add column if not exists resting_heart_rate integer,
  add column if not exists weekly_goal_km numeric(5,1) default 20,
  add column if not exists target_pace_min integer default 5,
  add column if not exists target_pace_sec integer default 30,
  add column if not exists race_goal text;
