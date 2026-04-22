alter table public.evaluations
  add column if not exists selected_persona_ids jsonb not null default '[]'::jsonb;
