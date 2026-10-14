create extension if not exists pgcrypto;

create table if not exists source_imports (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  imported_at timestamptz not null default now(),
  row_count integer not null default 0,
  file_name text
);

create table if not exists canonical_products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists inventory_records (
  id uuid primary key default gen_random_uuid(),
  source_import_id uuid not null references source_imports(id) on delete cascade,
  canonical_product_id uuid not null references canonical_products(id) on delete cascade,
  source_system text not null,
  source_sku text not null,
  source_name text not null,
  quantity integer not null,
  location text not null default 'Default',
  source_updated_at timestamptz not null,
  unit_cost numeric(12,2),
  imported_at timestamptz not null default now()
);

create index if not exists inventory_records_product_location_idx
  on inventory_records(canonical_product_id, location);

create index if not exists inventory_records_source_idx
  on inventory_records(source_system);

create table if not exists discrepancies (
  id uuid primary key default gen_random_uuid(),
  canonical_product_id uuid not null references canonical_products(id) on delete cascade,
  location text not null default 'Default',
  discrepancy_type text not null check (discrepancy_type in ('quantity_mismatch','stale_record','insufficient_sources')),
  severity text not null check (severity in ('low','medium','high')),
  confidence_score integer not null check (confidence_score between 0 and 100),
  value_at_risk numeric(12,2),
  status text not null default 'open' check (status in ('open','resolved')),
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists discrepancies_status_severity_idx
  on discrepancies(status, severity);

create table if not exists resolutions (
  id uuid primary key default gen_random_uuid(),
  discrepancy_id uuid not null references discrepancies(id) on delete cascade,
  verified_quantity integer not null,
  method text not null,
  notes text,
  resolved_by text,
  created_at timestamptz not null default now()
);

-- Server-only PoC: the app uses SUPABASE_SERVICE_ROLE_KEY in Route Handlers / Server Components.
-- Keep RLS enabled so browser clients cannot query these tables directly.
alter table source_imports enable row level security;
alter table canonical_products enable row level security;
alter table inventory_records enable row level security;
alter table discrepancies enable row level security;
alter table resolutions enable row level security;
