create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('admin', 'user')),
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_approval_status_idx
  on public.user_profiles (approval_status, created_at desc);

create index if not exists user_profiles_last_seen_at_idx
  on public.user_profiles (last_seen_at desc);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('persona_save', 'evaluation_generation')),
  entity_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_user_type_created_at_idx
  on public.usage_events (user_id, event_type, created_at desc);

create index if not exists usage_events_type_created_at_idx
  on public.usage_events (event_type, created_at desc);

alter table public.personas
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

alter table public.evaluations
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

create index if not exists personas_owner_updated_at_idx
  on public.personas (owner_id, updated_at desc);

create index if not exists evaluations_owner_created_at_idx
  on public.evaluations (owner_id, created_at desc);

alter table public.user_profiles enable row level security;
alter table public.usage_events enable row level security;
alter table public.personas enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_persona_responses enable row level security;

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
  on public.user_profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Users can read own usage events" on public.usage_events;
create policy "Users can read own usage events"
  on public.usage_events
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can read own personas" on public.personas;
create policy "Users can read own personas"
  on public.personas
  for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Users can insert own personas" on public.personas;
create policy "Users can insert own personas"
  on public.personas
  for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Users can update own personas" on public.personas;
create policy "Users can update own personas"
  on public.personas
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Users can read own evaluations" on public.evaluations;
create policy "Users can read own evaluations"
  on public.evaluations
  for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Users can insert own evaluations" on public.evaluations;
create policy "Users can insert own evaluations"
  on public.evaluations
  for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Users can update own evaluations" on public.evaluations;
create policy "Users can update own evaluations"
  on public.evaluations
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Users can read own evaluation responses" on public.evaluation_persona_responses;
create policy "Users can read own evaluation responses"
  on public.evaluation_persona_responses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.evaluations
      where evaluations.id = evaluation_persona_responses.evaluation_id
        and evaluations.owner_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';
