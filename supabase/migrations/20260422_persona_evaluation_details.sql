alter table public.evaluation_persona_responses
  add column if not exists details jsonb not null default '{}'::jsonb;

alter table public.evaluation_persona_responses
  alter column details set default '{}'::jsonb;
