alter table public.evaluations
  add column if not exists workspace_id text;

alter table public.evaluations
  add column if not exists title text;

alter table public.evaluations
  add column if not exists feature_description text;

alter table public.evaluations
  add column if not exists decision text;

alter table public.evaluations
  add column if not exists decision_summary text;

alter table public.evaluations
  add column if not exists why jsonb not null default '[]'::jsonb;

alter table public.evaluations
  add column if not exists top_fixes jsonb not null default '[]'::jsonb;

alter table public.evaluations
  add column if not exists confidence integer not null default 0;

alter table public.evaluations
  add column if not exists status text not null default 'completed';

alter table public.evaluations
  add column if not exists stage text;

alter table public.evaluations
  add column if not exists selected_persona_ids jsonb not null default '[]'::jsonb;

alter table public.evaluations
  add column if not exists image_inputs jsonb not null default '[]'::jsonb;

alter table public.evaluations
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

alter table public.evaluations
  add column if not exists error_message text;

alter table public.evaluations
  add column if not exists started_at timestamptz;

alter table public.evaluations
  add column if not exists completed_at timestamptz;

alter table public.evaluation_persona_responses
  add column if not exists evaluation_id uuid;

alter table public.evaluation_persona_responses
  add column if not exists persona_id text;

alter table public.evaluation_persona_responses
  add column if not exists verdict text;

alter table public.evaluation_persona_responses
  add column if not exists score integer;

alter table public.evaluation_persona_responses
  add column if not exists reaction text;

alter table public.evaluation_persona_responses
  add column if not exists top_concern text;

alter table public.evaluation_persona_responses
  add column if not exists suggestion text;

alter table public.evaluation_persona_responses
  add column if not exists status text not null default 'completed';

alter table public.evaluation_persona_responses
  add column if not exists error_message text;

alter table public.evaluation_persona_responses
  add column if not exists details jsonb not null default '{}'::jsonb;

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
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

alter table public.personas
  alter column updated_at set default now();
