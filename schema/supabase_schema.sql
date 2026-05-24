-- ============================================================
-- SINDH SMART CROP MONITORING SYSTEM — SUPABASE DATABASE SCHEMA
-- Government of Sindh — Agriculture Department
-- Version: 2.0 | Production-Ready
-- ============================================================

-- Enable PostGIS extension for geospatial queries on farm polygons
create extension if not exists postgis;
-- Enable pg_vector for future AI embedding search (disease similarity)
create extension if not exists vector;

-- ============================================================
-- 1. USER PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  phone text unique,
  cnic text unique,                          -- Pakistan CNIC 13 digits
  role text not null default 'farmer'
    check (role in ('farmer','field_agent','district_officer','minister','admin')),
  district text,                             -- e.g. 'Sukkur', 'Larkana', 'Hyderabad'
  tehsil text,
  preferred_language text default 'sd'
    check (preferred_language in ('en','ur','sd')),
  literacy_level text default 'basic'
    check (literacy_level in ('none','basic','literate')),
  photo_url text,
  is_active boolean default true,
  fcm_token text,                            -- Firebase push notification token
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);
create policy "Admins/officers can view all profiles"
  on profiles for select using (
    exists (select 1 from profiles p where p.id = auth.uid()
    and p.role in ('admin','district_officer','minister'))
  );

-- ============================================================
-- 2. FARMS (Geospatial land parcels)
-- ============================================================
create table public.farms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade not null,
  farm_name text not null,
  district text not null,
  tehsil text,
  village text,
  total_acres numeric(10,2) not null check (total_acres > 0),
  -- GeoJSON polygon stored as PostGIS geometry for GEE queries
  boundary geometry(Polygon, 4326),
  -- Centroid for quick map display
  centroid geometry(Point, 4326),
  soil_type text check (soil_type in ('sandy_loam','clay_loam','silt_loam','clay','loamy_sand')),
  soil_pH numeric(3,1),
  water_source text check (water_source in ('canal','tube_well','drip','rainwater','combined')),
  active_crops text[] default '{}',          -- ['wheat','cotton']
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on farms using gist(boundary);
create index on farms using gist(centroid);
create index on farms(owner_id);
create index on farms(district);

alter table public.farms enable row level security;
create policy "Farmers manage own farms"
  on farms for all using (owner_id = auth.uid());
create policy "Officers view district farms"
  on farms for select using (
    exists (select 1 from profiles p where p.id = auth.uid()
    and p.role in ('district_officer','admin','minister','field_agent')
    and (p.district = farms.district or p.role in ('admin','minister')))
  );

-- ============================================================
-- 3. CROP SEASONS (plantings per farm)
-- ============================================================
create table public.crop_seasons (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references farms(id) on delete cascade not null,
  crop_type text not null
    check (crop_type in ('wheat','cotton','sugarcane','rice','maize','chilli')),
  variety text,
  acres_planted numeric(8,2) not null,
  sowing_date date not null,
  expected_harvest_date date,
  actual_harvest_date date,
  status text default 'active'
    check (status in ('active','harvested','failed','abandoned')),
  actual_yield_maunds numeric(10,2),
  predicted_yield_maunds numeric(10,2),
  notes text,
  created_at timestamptz default now()
);

create index on crop_seasons(farm_id);
create index on crop_seasons(crop_type);
create index on crop_seasons(status);

alter table public.crop_seasons enable row level security;
create policy "Farm owner manages crop seasons"
  on crop_seasons for all using (
    exists (select 1 from farms f where f.id = farm_id and f.owner_id = auth.uid())
  );

-- ============================================================
-- 4. DISEASE SCANS (AI computer vision results)
-- ============================================================
create table public.disease_scans (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references farms(id) on delete set null,
  crop_season_id uuid references crop_seasons(id) on delete set null,
  scanned_by uuid references profiles(id) on delete set null,
  crop_type text not null,
  -- Image storage (Supabase Storage bucket: 'scan-images')
  image_url text not null,
  image_thumbnail_url text,
  -- AI Model output
  model_version text default 'v2.0',
  disease_id text,                           -- matches agronomy_parameters.json id
  disease_name_en text,
  disease_name_ur text,
  disease_name_sd text,
  confidence_score numeric(5,2) check (confidence_score between 0 and 100),
  severity text check (severity in ('none','low','medium','high','critical')),
  ai_raw_response jsonb,                     -- full model output stored for audit
  -- Location where scan was taken
  scan_location geometry(Point, 4326),
  scan_location_text text,
  -- Recommended treatment
  treatment_recommendation jsonb,            -- populated from agronomy_parameters.json
  advisory_ur text,                          -- auto-generated Urdu advisory
  advisory_sd text,                          -- auto-generated Sindhi advisory
  -- Follow-up
  farmer_applied_treatment boolean default false,
  treatment_applied_date date,
  followup_scan_id uuid references disease_scans(id),
  recovery_confirmed boolean default false,
  scanned_at timestamptz default now()
);

create index on disease_scans(farm_id);
create index on disease_scans(scanned_by);
create index on disease_scans(crop_type);
create index on disease_scans(severity);
create index on disease_scans(scanned_at);
-- Spatial index for heatmap queries
create index on disease_scans using gist(scan_location);

alter table public.disease_scans enable row level security;
create policy "Farmers see own scans"
  on disease_scans for all using (scanned_by = auth.uid() or
    exists (select 1 from farms f where f.id = farm_id and f.owner_id = auth.uid()));
create policy "Officers see district scans"
  on disease_scans for select using (
    exists (select 1 from profiles p where p.id = auth.uid()
    and p.role in ('district_officer','admin','minister','field_agent'))
  );

-- ============================================================
-- 5. SATELLITE ANALYSIS (GEE-based NDVI / moisture snapshots)
-- ============================================================
create table public.satellite_analyses (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references farms(id) on delete cascade not null,
  requested_by uuid references profiles(id),
  analysis_date date not null default current_date,
  satellite_source text default 'Sentinel-2'
    check (satellite_source in ('Sentinel-2','Landsat-8','MODIS','combined')),
  -- NDVI stats for the farm polygon
  ndvi_mean numeric(5,3),
  ndvi_min numeric(5,3),
  ndvi_max numeric(5,3),
  ndvi_std numeric(5,3),
  ndvi_healthy_pct numeric(5,2),             -- % pixels NDVI > 0.6
  ndvi_stressed_pct numeric(5,2),            -- % pixels NDVI 0.3-0.6
  ndvi_barren_pct numeric(5,2),              -- % pixels NDVI < 0.3
  -- Soil moisture index (from MODIS or Sentinel-1 SAR)
  soil_moisture_index numeric(5,3),
  -- Land Surface Temperature
  lst_celsius numeric(5,2),
  -- Cloud cover % at time of image
  cloud_cover_pct numeric(5,2),
  -- Image URLs (generated heatmaps stored in Supabase Storage)
  ndvi_image_url text,
  rgb_image_url text,
  -- AI-generated advisory from NDVI data
  ai_advisory_en text,
  ai_advisory_ur text,
  ai_advisory_sd text,
  -- Raw GEE API response for debugging
  gee_raw_response jsonb,
  created_at timestamptz default now()
);

create index on satellite_analyses(farm_id);
create index on satellite_analyses(analysis_date);

alter table public.satellite_analyses enable row level security;
create policy "Farm owner views own satellite data"
  on satellite_analyses for all using (
    exists (select 1 from farms f where f.id = farm_id and f.owner_id = auth.uid())
  );

-- ============================================================
-- 6. ALERTS & NOTIFICATIONS
-- ============================================================
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references farms(id) on delete cascade,
  recipient_id uuid references profiles(id) on delete cascade not null,
  alert_type text not null
    check (alert_type in ('disease_detected','irrigation_needed','fertilizer_due',
                          'weather_warning','yield_risk','pest_outbreak','govt_advisory')),
  severity text not null
    check (severity in ('info','warning','critical')),
  title_en text not null,
  title_ur text,
  title_sd text,
  body_en text not null,
  body_ur text,
  body_sd text,
  source_scan_id uuid references disease_scans(id),
  source_analysis_id uuid references satellite_analyses(id),
  action_required text,
  is_read boolean default false,
  is_dismissed boolean default false,
  push_sent boolean default false,
  push_sent_at timestamptz,
  sms_sent boolean default false,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create index on alerts(recipient_id, is_read);
create index on alerts(farm_id);
create index on alerts(alert_type);

alter table public.alerts enable row level security;
create policy "Users see own alerts"
  on alerts for all using (recipient_id = auth.uid());

-- ============================================================
-- 7. VOICE BOT SESSIONS (AI conversation logs)
-- ============================================================
create table public.voice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  farm_id uuid references farms(id) on delete set null,
  language text default 'sd' check (language in ('en','ur','sd')),
  -- Each session is an array of turns
  transcript jsonb default '[]',             -- [{role,text,audio_url,timestamp}]
  intent_detected text,                      -- e.g. 'disease_query','irrigation_schedule'
  resolved boolean default false,
  escalated_to_agent boolean default false,
  feedback_rating int check (feedback_rating between 1 and 5),
  session_start timestamptz default now(),
  session_end timestamptz
);

create index on voice_sessions(user_id);
alter table public.voice_sessions enable row level security;
create policy "Users see own voice sessions"
  on voice_sessions for all using (user_id = auth.uid());

-- ============================================================
-- 8. GOVERNMENT ADVISORIES (broadcast messages from Dept)
-- ============================================================
create table public.govt_advisories (
  id uuid primary key default gen_random_uuid(),
  issued_by uuid references profiles(id),
  district text,                             -- null = all Sindh
  crop_type text,                            -- null = all crops
  title_en text not null,
  title_ur text,
  title_sd text,
  body_en text not null,
  body_ur text,
  body_sd text,
  advisory_type text check (advisory_type in ('pest_warning','water_advisory','price_update','scheme','weather')),
  severity text default 'info' check (severity in ('info','warning','critical')),
  effective_from date not null default current_date,
  effective_until date,
  is_published boolean default false,
  created_at timestamptz default now()
);

alter table public.govt_advisories enable row level security;
create policy "Published advisories visible to all"
  on govt_advisories for select using (is_published = true);
create policy "Admins manage advisories"
  on govt_advisories for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
    and p.role in ('admin','district_officer','minister'))
  );

-- ============================================================
-- 9. YIELD PREDICTIONS LOG
-- ============================================================
create table public.yield_predictions (
  id uuid primary key default gen_random_uuid(),
  crop_season_id uuid references crop_seasons(id) on delete cascade,
  farm_id uuid references farms(id),
  predicted_at timestamptz default now(),
  model_version text,
  input_params jsonb not null,              -- all ML inputs stored
  predicted_yield_maunds numeric(10,2),
  confidence_pct numeric(5,2),
  risk_factors jsonb,                       -- [{factor, impact, recommendation}]
  compared_to_district_avg numeric(5,2)     -- % above/below district average
);

alter table public.yield_predictions enable row level security;
create policy "Farm owner views yield predictions"
  on yield_predictions for all using (
    exists (select 1 from farms f where f.id = farm_id and f.owner_id = auth.uid())
  );

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update timestamps
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();
create trigger farms_updated_at before update on farms
  for each row execute function update_updated_at();

-- Function: Get farm dashboard stats for a user
create or replace function get_farm_dashboard(p_user_id uuid)
returns jsonb as $$
declare result jsonb;
begin
  select jsonb_build_object(
    'total_farms', count(distinct f.id),
    'total_acres', sum(f.total_acres),
    'active_crops', count(distinct cs.id),
    'critical_alerts', (
      select count(*) from alerts a
      where a.recipient_id = p_user_id and a.severity = 'critical' and not a.is_dismissed
    ),
    'scans_last_30_days', (
      select count(*) from disease_scans ds
      join farms ff on ds.farm_id = ff.id
      where ff.owner_id = p_user_id
      and ds.scanned_at > now() - interval '30 days'
    )
  ) into result
  from farms f
  left join crop_seasons cs on cs.farm_id = f.id and cs.status = 'active'
  where f.owner_id = p_user_id;
  return result;
end;
$$ language plpgsql security definer;

-- ============================================================
-- STORAGE BUCKETS (run via Supabase Dashboard or CLI)
-- ============================================================
-- supabase storage create-bucket scan-images --public
-- supabase storage create-bucket ndvi-images --public
-- supabase storage create-bucket profile-photos --public
