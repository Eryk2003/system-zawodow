-- IKA Poland — System Zawodów: wspólny stan między komputerem, laptopem i telefonem.
-- Uruchom TEN PLIK w Supabase -> SQL Editor -> New query -> Run.

create table if not exists public.app_shared_state (
  state_key text primary key,
  state_value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_shared_state enable row level security;

drop policy if exists "shared state public read" on public.app_shared_state;
create policy "shared state public read"
on public.app_shared_state
for select
to anon, authenticated
using (true);

drop policy if exists "shared state public insert" on public.app_shared_state;
create policy "shared state public insert"
on public.app_shared_state
for insert
to anon, authenticated
with check (true);

drop policy if exists "shared state public update" on public.app_shared_state;
create policy "shared state public update"
on public.app_shared_state
for update
to anon, authenticated
using (true)
with check (true);

-- Realtime. Blok DO zapobiega błędowi, jeśli tabela była już dodana do publikacji.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_shared_state'
  ) then
    alter publication supabase_realtime add table public.app_shared_state;
  end if;
end $$;
