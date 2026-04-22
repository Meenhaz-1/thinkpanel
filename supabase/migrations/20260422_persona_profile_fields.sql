alter table public.personas
  add column if not exists company_size text;

alter table public.personas
  add column if not exists company_type text;

alter table public.personas
  add column if not exists seniority text;

alter table public.personas
  add column if not exists quote text;

alter table public.personas
  add column if not exists generation_prompt text;

alter table public.personas
  add column if not exists source_type text not null default 'generated';

alter table public.personas
  add column if not exists updated_at timestamptz not null default now();

alter table public.personas
  alter column updated_at set default now();
