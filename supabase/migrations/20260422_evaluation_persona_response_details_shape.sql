alter table public.evaluation_persona_responses
  add column if not exists details jsonb not null default '{}'::jsonb;

alter table public.evaluation_persona_responses
  alter column details set default '{}'::jsonb;

comment on column public.evaluation_persona_responses.details is
  'Structured persona evaluation payload: metadata, what_lands, why_i_push_back, this_fails_if, hidden_assumption, questions_for_pm, what_would_change_my_mind.';
