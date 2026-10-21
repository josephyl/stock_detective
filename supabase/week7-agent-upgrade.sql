alter table discrepancies drop constraint if exists discrepancies_discrepancy_type_check;
alter table discrepancies
  add constraint discrepancies_discrepancy_type_check
  check (discrepancy_type in ('quantity_mismatch','stale_record','insufficient_sources','fulfilment_mismatch'));

create table if not exists fulfilment_records (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  order_id text not null,
  canonical_product_id uuid not null references canonical_products(id) on delete cascade,
  source_sku text not null,
  source_name text not null,
  quantity integer not null,
  location text not null default 'Default',
  fulfilment_status text not null,
  shipped_at timestamptz,
  inventory_deducted boolean,
  source_updated_at timestamptz not null,
  imported_at timestamptz not null default now()
);

create index if not exists fulfilment_records_order_idx
  on fulfilment_records(order_id, canonical_product_id);

create table if not exists agent_cases (
  id uuid primary key default gen_random_uuid(),
  discrepancy_id uuid not null unique references discrepancies(id) on delete cascade,
  status text not null default 'awaiting_review'
    check (status in ('awaiting_review','approved','rejected','investigate','resolved')),
  finding text not null,
  likely_cause text not null,
  business_impact text not null,
  recommended_action text not null,
  agent_confidence integer not null check (agent_confidence between 0 and 100),
  requires_human_approval boolean not null default true,
  proposed_quantity integer,
  reasoning jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agent_events (
  id uuid primary key default gen_random_uuid(),
  agent_case_id uuid not null references agent_cases(id) on delete cascade,
  event_type text not null,
  actor text not null default 'Stock Brain',
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table fulfilment_records enable row level security;
alter table agent_cases enable row level security;
alter table agent_events enable row level security;
