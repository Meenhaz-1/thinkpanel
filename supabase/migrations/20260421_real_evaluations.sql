create extension if not exists pgcrypto;

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  title text,
  feature_description text not null default '',
  decision text not null default 'risky',
  decision_summary text not null default '',
  why jsonb not null default '[]'::jsonb,
  top_fixes jsonb not null default '[]'::jsonb,
  confidence integer not null default 0,
  created_at timestamptz not null default now()
);

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
  alter column feature_description set default '';

alter table public.evaluations
  alter column decision set default 'risky';

alter table public.evaluations
  alter column decision_summary set default '';

alter table public.evaluations
  alter column why set default '[]'::jsonb;

alter table public.evaluations
  alter column top_fixes set default '[]'::jsonb;

alter table public.evaluations
  alter column confidence set default 0;

create table if not exists public.evaluation_persona_responses (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null,
  persona_id text not null,
  verdict text not null,
  score integer not null,
  reaction text not null,
  top_concern text not null,
  suggestion text not null,
  created_at timestamptz not null default now()
);

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

create index if not exists evaluations_workspace_created_at_idx
  on public.evaluations (workspace_id, created_at desc);

create index if not exists evaluation_persona_responses_evaluation_idx
  on public.evaluation_persona_responses (evaluation_id);

create index if not exists evaluation_persona_responses_persona_idx
  on public.evaluation_persona_responses (persona_id);
