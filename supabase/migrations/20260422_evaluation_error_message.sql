alter table public.evaluations
  add column if not exists error_message text;

alter table public.evaluations
  add column if not exists completed_at timestamptz;
