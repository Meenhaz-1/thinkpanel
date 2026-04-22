alter table public.personas
  add column if not exists updated_at timestamptz not null default now();

alter table public.personas
  alter column updated_at set default now();
