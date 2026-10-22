-- ============================================================
-- IKA Poland - ETAP 66
-- Bezpieczne konta klubów + rozdzielenie danych prywatnych/publicznych.
-- Uruchom CAŁY plik w Supabase -> SQL Editor -> New query -> Run.
-- ============================================================

-- 1. Prywatny stan jednego klubu. Jeden użytkownik Supabase = jeden rekord.
create table if not exists public.club_private_state (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  club jsonb,
  athletes jsonb not null default '[]'::jsonb,
  entries jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.club_private_state enable row level security;

drop policy if exists "club private own read" on public.club_private_state;
create policy "club private own read"
on public.club_private_state for select to authenticated
using (owner_id = auth.uid() or public.is_organizer());

drop policy if exists "club private own insert" on public.club_private_state;
create policy "club private own insert"
on public.club_private_state for insert to authenticated
with check (owner_id = auth.uid() or public.is_organizer());

drop policy if exists "club private own update" on public.club_private_state;
create policy "club private own update"
on public.club_private_state for update to authenticated
using (owner_id = auth.uid() or public.is_organizer())
with check (owner_id = auth.uid() or public.is_organizer());

drop policy if exists "club private organizer delete" on public.club_private_state;
create policy "club private organizer delete"
on public.club_private_state for delete to authenticated
using (public.is_organizer());

-- 2. Sanitowany stan publiczny. Nie zawiera dat urodzenia, danych rodziców ani e-maili.
create table if not exists public.public_participant_state (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  club jsonb,
  athletes jsonb not null default '[]'::jsonb,
  entries jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.public_participant_state enable row level security;

drop policy if exists "public participants read" on public.public_participant_state;
create policy "public participants read"
on public.public_participant_state for select to anon, authenticated
using (true);

-- Brak polityk INSERT/UPDATE/DELETE dla klientów. Tę tabelę uzupełnia wyłącznie trigger.

create or replace function public.refresh_public_participant_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_club jsonb;
  safe_athletes jsonb;
  safe_entries jsonb;
begin
  if tg_op = 'DELETE' then
    delete from public.public_participant_state where owner_id = old.owner_id;
    return old;
  end if;

  safe_club := case
    when new.club is null then null
    else jsonb_strip_nulls(jsonb_build_object(
      'id', new.club->'id',
      'name', new.club->'name',
      'shortName', new.club->'shortName',
      'city', new.club->'city',
      'country', new.club->'country'
    ))
  end;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', athlete->'id',
    'clubId', athlete->'clubId',
    'firstName', athlete->'firstName',
    'lastName', athlete->'lastName',
    'gender', athlete->'gender',
    'grade', athlete->'grade',
    'photo', athlete->'photo'
  ))), '[]'::jsonb)
  into safe_athletes
  from jsonb_array_elements(coalesce(new.athletes, '[]'::jsonb)) athlete;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', entry->'id',
    'athleteId', entry->'athleteId',
    'competitionId', entry->'competitionId',
    'category', entry->'category',
    'categoryId', entry->'categoryId',
    'status', entry->'status',
    'mat', entry->'mat',
    'estimatedStart', entry->'estimatedStart',
    'createdAt', entry->'createdAt'
  ))), '[]'::jsonb)
  into safe_entries
  from jsonb_array_elements(coalesce(new.entries, '[]'::jsonb)) entry;

  insert into public.public_participant_state(owner_id, club, athletes, entries, updated_at)
  values (new.owner_id, safe_club, safe_athletes, safe_entries, now())
  on conflict (owner_id) do update set
    club = excluded.club,
    athletes = excluded.athletes,
    entries = excluded.entries,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists trg_refresh_public_participant_state on public.club_private_state;
create trigger trg_refresh_public_participant_state
after insert or update or delete on public.club_private_state
for each row execute function public.refresh_public_participant_state();

-- 3. Migracja istniejących danych klubów z dawnego wspólnego JSON-a.
-- Migracja obejmuje konta z prawidłowym UUID Supabase Auth.
with legacy_clubs as (
  select value as club
  from public.app_shared_state s,
       lateral jsonb_array_elements(coalesce(s.state_value, '[]'::jsonb)) value
  where s.state_key = 'ika_clubs_v1'
),
legacy_athletes as (
  select value as athlete
  from public.app_shared_state s,
       lateral jsonb_array_elements(coalesce(s.state_value, '[]'::jsonb)) value
  where s.state_key = 'ika_athletes_v1'
),
legacy_entries as (
  select value as entry
  from public.app_shared_state s,
       lateral jsonb_array_elements(coalesce(s.state_value, '[]'::jsonb)) value
  where s.state_key = 'ika_entries_v1'
),
prepared as (
  select
    (c.club->>'ownerId')::uuid as owner_id,
    c.club,
    coalesce((
      select jsonb_agg(a.athlete)
      from legacy_athletes a
      where a.athlete->>'clubId' = c.club->>'id'
    ), '[]'::jsonb) as athletes,
    coalesce((
      select jsonb_agg(e.entry)
      from legacy_entries e
      where e.entry->>'athleteId' in (
        select a2.athlete->>'id'
        from legacy_athletes a2
        where a2.athlete->>'clubId' = c.club->>'id'
      )
    ), '[]'::jsonb) as entries
  from legacy_clubs c
  where coalesce(c.club->>'ownerId','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
)
insert into public.club_private_state(owner_id, club, athletes, entries, updated_at)
select owner_id, club, athletes, entries, now() from prepared
on conflict (owner_id) do update set
  club = excluded.club,
  athletes = excluded.athletes,
  entries = excluded.entries,
  updated_at = now();

-- 4. app_shared_state od teraz zawiera WYŁĄCZNIE dane publiczne/organizacyjne zawodów.
alter table public.app_shared_state enable row level security;

drop policy if exists "shared state public read" on public.app_shared_state;
drop policy if exists "shared state public insert" on public.app_shared_state;
drop policy if exists "shared state public update" on public.app_shared_state;
drop policy if exists "shared state public delete" on public.app_shared_state;
drop policy if exists "shared state organizer insert" on public.app_shared_state;
drop policy if exists "shared state organizer update" on public.app_shared_state;
drop policy if exists "shared state organizer delete" on public.app_shared_state;

create policy "shared state public read"
on public.app_shared_state for select to anon, authenticated
using (state_key not in ('ika_clubs_v1','ika_athletes_v1','ika_entries_v1'));

create policy "shared state organizer insert"
on public.app_shared_state for insert to authenticated
with check (public.is_organizer() and state_key not in ('ika_clubs_v1','ika_athletes_v1','ika_entries_v1'));

create policy "shared state organizer update"
on public.app_shared_state for update to authenticated
using (public.is_organizer())
with check (public.is_organizer() and state_key not in ('ika_clubs_v1','ika_athletes_v1','ika_entries_v1'));

create policy "shared state organizer delete"
on public.app_shared_state for delete to authenticated
using (public.is_organizer());

-- Prywatne stare rekordy usuwamy dopiero po migracji.
delete from public.app_shared_state
where state_key in ('ika_clubs_v1','ika_athletes_v1','ika_entries_v1');

-- 5. Realtime.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='club_private_state'
  ) then
    alter publication supabase_realtime add table public.club_private_state;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='public_participant_state'
  ) then
    alter publication supabase_realtime add table public.public_participant_state;
  end if;
end $$;

-- ============================================================
-- WAŻNE: organizator musi być kontem Supabase Auth z rolą organizer.
-- Po utworzeniu jego konta wykonaj JEDEN RAZ (podmień e-mail):
--
-- update public.profiles
-- set role = 'organizer'
-- where id = (select id from auth.users where email = 'TWOJ_EMAIL_ORGANIZATORA');
-- ============================================================
