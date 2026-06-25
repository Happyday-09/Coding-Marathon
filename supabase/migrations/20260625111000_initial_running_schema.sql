-- Initial Supabase schema for the running course MVP.
-- Run this in Supabase SQL editor or through the Supabase CLI.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;

do $$
begin
  create type public.course_source_type as enum ('beagle', 'public_standard', 'user_recorded');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.course_difficulty as enum ('flat', 'hill', 'trail', 'mixed', 'unknown');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.course_quality_status as enum ('pending', 'valid', 'needs_review', 'rejected');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.visibility_level as enum ('private', 'friends', 'public');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  running_level text check (running_level in ('beginner', 'intermediate', 'advanced') or running_level is null),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default extensions.gen_random_uuid(),

  source_type public.course_source_type not null,
  source_course_id text,
  source_track_id text,
  source_properties jsonb not null default '{}',
  owner_id uuid references public.profiles(id) on delete set null,

  name text not null,
  short_name text,
  description text,
  province text,
  city text,
  area_name text,
  start_name text,
  end_name text,
  source_url text,

  distance_m integer not null check (distance_m > 0),
  source_distance_m integer,
  distance_delta_m integer,
  estimated_time_sec integer check (estimated_time_sec is null or estimated_time_sec >= 0),

  elevation_gain_m numeric(8, 2) default 0,
  elevation_loss_m numeric(8, 2) default 0,
  min_elevation_m numeric(8, 2),
  max_elevation_m numeric(8, 2),
  avg_slope_percent numeric(6, 2),

  difficulty public.course_difficulty not null default 'unknown',
  quality_status public.course_quality_status not null default 'pending',
  quality_flags text[] not null default '{}',
  tags text[] not null default '{}',

  route extensions.geography(LineString, 4326) not null,
  start_point extensions.geography(Point, 4326) not null,
  end_point extensions.geography(Point, 4326) not null,

  is_public boolean not null default true,
  visibility public.visibility_level not null default 'public',
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint courses_owner_required_for_user_recorded check (
    source_type <> 'user_recorded' or owner_id is not null
  )
);

create table if not exists public.course_points (
  id bigint generated always as identity primary key,
  course_id uuid not null references public.courses(id) on delete cascade,
  seq integer not null check (seq >= 0),
  lng double precision not null check (lng between 124 and 132),
  lat double precision not null check (lat between 33 and 39),
  elevation_m numeric(8, 2),
  recorded_at timestamptz,
  source_point_id text,
  point extensions.geography(Point, 4326) generated always as (
    extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography
  ) stored,
  created_at timestamptz not null default now(),

  constraint course_points_course_seq_unique unique (course_id, seq)
);

create table if not exists public.course_waypoints (
  id uuid primary key default extensions.gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  source_waypoint_id text,
  seq integer not null default 0,
  name text,
  description text,
  photo_path text,
  point extensions.geography(Point, 4326) not null,
  elevation_m numeric(8, 2),
  recorded_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.course_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table if not exists public.course_quality_issues (
  id bigint generated always as identity primary key,
  course_id uuid references public.courses(id) on delete cascade,
  source_type public.course_source_type not null,
  source_course_id text,
  source_track_id text,
  issue_code text not null,
  issue_message text,
  severity text not null check (severity in ('info', 'warning', 'error')),
  source_payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.runs (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,

  title text,
  distance_m integer not null check (distance_m >= 0),
  duration_sec integer not null check (duration_sec >= 0),
  avg_pace_sec_per_km integer,
  elevation_gain_m numeric(8, 2) default 0,
  elevation_loss_m numeric(8, 2) default 0,

  route extensions.geography(LineString, 4326),
  started_at timestamptz not null,
  ended_at timestamptz,
  visibility public.visibility_level not null default 'private',
  created_course_id uuid references public.courses(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.run_points (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.runs(id) on delete cascade,
  seq integer not null check (seq >= 0),
  lng double precision not null check (lng between 124 and 132),
  lat double precision not null check (lat between 33 and 39),
  elevation_m numeric(8, 2),
  recorded_at timestamptz,
  point extensions.geography(Point, 4326) generated always as (
    extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography
  ) stored,

  constraint run_points_run_seq_unique unique (run_id, seq)
);

create index if not exists courses_route_gix on public.courses using gist (route);
create index if not exists courses_start_point_gix on public.courses using gist (start_point);
create index if not exists courses_end_point_gix on public.courses using gist (end_point);
create index if not exists courses_filter_idx on public.courses (quality_status, is_public, difficulty, distance_m);
create index if not exists courses_source_idx on public.courses (source_type, source_course_id, source_track_id);
create unique index if not exists courses_source_unique_idx
on public.courses (
  source_type,
  coalesce(source_course_id, ''),
  coalesce(source_track_id, '')
)
where source_type <> 'user_recorded';

create index if not exists course_points_course_seq_idx on public.course_points (course_id, seq);
create index if not exists course_points_point_gix on public.course_points using gist (point);

create index if not exists course_waypoints_course_seq_idx on public.course_waypoints (course_id, seq);
create index if not exists course_waypoints_point_gix on public.course_waypoints using gist (point);

create index if not exists course_favorites_user_idx on public.course_favorites (user_id, created_at desc);
create index if not exists course_quality_issues_course_idx on public.course_quality_issues (course_id, severity);
create index if not exists course_quality_issues_source_idx on public.course_quality_issues (source_type, source_course_id, source_track_id);
create index if not exists runs_user_started_idx on public.runs (user_id, started_at desc);
create index if not exists runs_route_gix on public.runs using gist (route);
create index if not exists run_points_run_seq_idx on public.run_points (run_id, seq);
create index if not exists run_points_point_gix on public.run_points using gist (point);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists set_runs_updated_at on public.runs;
create trigger set_runs_updated_at
before update on public.runs
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace view public.course_cards
with (security_invoker = true)
as
select
  c.id,
  c.name,
  c.description,
  c.province,
  c.city,
  c.area_name,
  c.distance_m,
  round(c.distance_m / 1000.0, 2) as distance_km,
  c.estimated_time_sec,
  c.difficulty,
  c.min_elevation_m,
  c.max_elevation_m,
  c.elevation_gain_m,
  c.quality_status,
  c.start_name,
  c.end_name,
  extensions.ST_Y(c.start_point::extensions.geometry) as start_lat,
  extensions.ST_X(c.start_point::extensions.geometry) as start_lng,
  extensions.ST_AsGeoJSON(c.route::extensions.geometry)::jsonb as route_geojson
from public.courses c
where c.is_public = true
  and c.quality_status = 'valid';

create or replace function public.nearby_courses(
  user_lat double precision,
  user_lng double precision,
  radius_m integer default 3000,
  min_distance_m integer default null,
  max_distance_m integer default null,
  difficulty_filter public.course_difficulty default null,
  limit_count integer default 30
)
returns table (
  id uuid,
  name text,
  description text,
  province text,
  city text,
  area_name text,
  distance_m integer,
  distance_km numeric,
  estimated_time_sec integer,
  difficulty public.course_difficulty,
  min_elevation_m numeric,
  max_elevation_m numeric,
  elevation_gain_m numeric,
  start_lat double precision,
  start_lng double precision,
  user_to_start_m double precision,
  route_geojson jsonb
)
language sql
stable
as $$
  with user_location as (
    select extensions.ST_SetSRID(extensions.ST_MakePoint(user_lng, user_lat), 4326)::extensions.geography as point
  )
  select
    c.id,
    c.name,
    c.description,
    c.province,
    c.city,
    c.area_name,
    c.distance_m,
    round(c.distance_m / 1000.0, 2) as distance_km,
    c.estimated_time_sec,
    c.difficulty,
    c.min_elevation_m,
    c.max_elevation_m,
    c.elevation_gain_m,
    extensions.ST_Y(c.start_point::extensions.geometry) as start_lat,
    extensions.ST_X(c.start_point::extensions.geometry) as start_lng,
    extensions.ST_Distance(c.start_point, ul.point) as user_to_start_m,
    extensions.ST_AsGeoJSON(c.route::extensions.geometry)::jsonb as route_geojson
  from public.courses c
  cross join user_location ul
  where c.is_public = true
    and c.quality_status = 'valid'
    and extensions.ST_DWithin(c.start_point, ul.point, radius_m)
    and (min_distance_m is null or c.distance_m >= min_distance_m)
    and (max_distance_m is null or c.distance_m <= max_distance_m)
    and (difficulty_filter is null or c.difficulty = difficulty_filter)
  order by extensions.ST_Distance(c.start_point, ul.point), c.distance_m
  limit least(greatest(limit_count, 1), 100);
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_points enable row level security;
alter table public.course_waypoints enable row level security;
alter table public.course_favorites enable row level security;
alter table public.course_quality_issues enable row level security;
alter table public.runs enable row level security;
alter table public.run_points enable row level security;

drop policy if exists "Profiles are readable by everyone" on public.profiles;
create policy "Profiles are readable by everyone"
on public.profiles for select
using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Public valid courses are readable" on public.courses;
create policy "Public valid courses are readable"
on public.courses for select
using (
  is_public = true
  and quality_status = 'valid'
);

drop policy if exists "Users can read own courses" on public.courses;
create policy "Users can read own courses"
on public.courses for select
using (auth.uid() = owner_id);

drop policy if exists "Users can create own recorded courses" on public.courses;
create policy "Users can create own recorded courses"
on public.courses for insert
with check (
  auth.uid() = owner_id
  and source_type = 'user_recorded'
);

drop policy if exists "Users can update own recorded courses" on public.courses;
create policy "Users can update own recorded courses"
on public.courses for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Public valid course points are readable" on public.course_points;
create policy "Public valid course points are readable"
on public.course_points for select
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_points.course_id
      and c.is_public = true
      and c.quality_status = 'valid'
  )
);

drop policy if exists "Users can manage own course points" on public.course_points;
create policy "Users can manage own course points"
on public.course_points for all
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_points.course_id
      and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.courses c
    where c.id = course_points.course_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "Public valid waypoints are readable" on public.course_waypoints;
create policy "Public valid waypoints are readable"
on public.course_waypoints for select
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_waypoints.course_id
      and c.is_public = true
      and c.quality_status = 'valid'
  )
);

drop policy if exists "Users can manage own waypoints" on public.course_waypoints;
create policy "Users can manage own waypoints"
on public.course_waypoints for all
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_waypoints.course_id
      and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.courses c
    where c.id = course_waypoints.course_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "Users can read own favorites" on public.course_favorites;
create policy "Users can read own favorites"
on public.course_favorites for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own favorites" on public.course_favorites;
create policy "Users can create own favorites"
on public.course_favorites for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own favorites" on public.course_favorites;
create policy "Users can delete own favorites"
on public.course_favorites for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own course quality issues" on public.course_quality_issues;
create policy "Users can read own course quality issues"
on public.course_quality_issues for select
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_quality_issues.course_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "Users can read own runs" on public.runs;
create policy "Users can read own runs"
on public.runs for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own runs" on public.runs;
create policy "Users can create own runs"
on public.runs for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own runs" on public.runs;
create policy "Users can update own runs"
on public.runs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own runs" on public.runs;
create policy "Users can delete own runs"
on public.runs for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own run points" on public.run_points;
create policy "Users can read own run points"
on public.run_points for select
using (
  exists (
    select 1
    from public.runs r
    where r.id = run_points.run_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists "Users can manage own run points" on public.run_points;
create policy "Users can manage own run points"
on public.run_points for all
using (
  exists (
    select 1
    from public.runs r
    where r.id = run_points.run_id
      and r.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.runs r
    where r.id = run_points.run_id
      and r.user_id = auth.uid()
  )
);

-- Create Battles Table (Ghost Challenger Mode)
create table if not exists public.battles (
  id uuid primary key default extensions.gen_random_uuid(),
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'active', 'done')),
  target_distance numeric(8, 2) not null,   -- Challenger's run distance in km
  target_duration integer not null,          -- Challenger's run duration in seconds
  target_pace numeric(6, 2) not null,          -- Challenger's run pace in min/km
  opponent_progress numeric(8, 2) not null default 0, -- Opponent's distance in km
  opponent_duration integer,                  -- Opponent's final run duration in seconds
  winner_id uuid references public.profiles(id) on delete set null,
  challenger_run_id uuid not null references public.runs(id) on delete cascade,
  opponent_run_id uuid references public.runs(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Enable RLS for battles
alter table public.battles enable row level security;

-- Policies for battles
drop policy if exists "Users can read own battles" on public.battles;
create policy "Users can read own battles"
on public.battles for select
using (auth.uid() = challenger_id or auth.uid() = opponent_id);

drop policy if exists "Users can create own battles" on public.battles;
create policy "Users can create own battles"
on public.battles for insert
with check (auth.uid() = challenger_id);

drop policy if exists "Users can update own battles" on public.battles;
create policy "Users can update own battles"
on public.battles for update
using (auth.uid() = challenger_id or auth.uid() = opponent_id)
with check (auth.uid() = challenger_id or auth.uid() = opponent_id);

