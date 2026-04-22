alter table public.evaluations
  add column if not exists status text not null default 'completed';

alter table public.evaluations
  add column if not exists stage text;

alter table public.evaluations
  add column if not exists selected_persona_ids jsonb not null default '[]'::jsonb;

alter table public.evaluations
  add column if not exists error_message text;

alter table public.evaluations
  add column if not exists started_at timestamptz;

alter table public.evaluations
  add column if not exists completed_at timestamptz;

alter table public.evaluation_persona_responses
  add column if not exists status text not null default 'completed';

alter table public.evaluation_persona_responses
  add column if not exists error_message text;

alter table public.evaluation_persona_responses
  alter column status set default 'completed';
