create table if not exists saved_views (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  is_morning_brief boolean not null default false,
  created_at timestamptz not null default now()
);

alter table saved_views enable row level security;
