-- Optional, additive migration for real product photographs.
-- Run once in the Supabase SQL editor when product image URLs are available.
alter table public.canonical_products
  add column if not exists image_url text;

comment on column public.canonical_products.image_url is
  'HTTPS URL or site-local path to a verified photograph of this SKU. Null if unavailable.';
