alter table public.evaluations
  add column if not exists image_inputs jsonb not null default '[]'::jsonb;
