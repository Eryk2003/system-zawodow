-- IKA Poland — System Zawodów, ETAP 2
-- Uruchom w Supabase SQL Editor przed podłączeniem produkcyjnej bazy.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'club' check (role in ('club','organizer')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'club')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_organizer()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'organizer');
$$;

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  short_name text,
  city text not null,
  country text not null default 'Polska',
  phone text,
  email text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.athletes (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  birth_date date not null,
  gender text,
  grade text,
  parent_name text,
  parent_email text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.competition_types (
  id text primary key,
  name text not null,
  group_name text not null,
  active boolean not null default true,
  sort_order integer not null default 100,
  max_age integer
);

alter table public.competition_types add column if not exists max_age integer;

insert into public.competition_types (id,name,group_name,active,sort_order,max_age) values
('kata','Kata indywidualne','Kata',true,10,null),
('kata-pairs','Kata w parach','Kata',true,20,null),
('kata-team','Kata drużynowe','Kata',true,30,null),
('fantom','Juruken / Fantom','Dzieci',true,40,null),
('sanbon','Kumite Sanbon Shobu','Kumite',true,50,null),
('ippon','Kumite Ippon Shobu','Kumite',true,60,null),
('nihon-u12','Kumite Shobu Nihon — do 12 lat','Kumite',true,65,12),
('kumite-team','Kumite drużynowe','Kumite',true,70,null),
('kodachi','Kodachi','Pozostałe',true,80,null),
('obstacle','Tor przeszkód','Dzieci',true,90,null),
('para','Para Karate / People with Disabilities','Para Karate',true,100,null)
on conflict (id) do update set name=excluded.name, group_name=excluded.group_name, max_age=excluded.max_age;

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date not null,
  venue text,
  status text not null default 'preparation' check (status in ('preparation','live','finished')),
  created_at timestamptz not null default now()
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  competition_id text not null references public.competition_types(id),
  category text,
  mat text,
  estimated_start time,
  status text not null default 'scheduled' check (status in ('scheduled','called','active','done')),
  created_at timestamptz not null default now()
);

create table if not exists public.live_display (
  id smallint primary key default 1 check (id = 1),
  entry_id uuid references public.entries(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.live_display(id,entry_id) values (1,null) on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.athletes enable row level security;
alter table public.competition_types enable row level security;
alter table public.tournaments enable row level security;
alter table public.entries enable row level security;
alter table public.live_display enable row level security;

-- Profiles
create policy "profile own read" on public.profiles for select using (id = auth.uid() or public.is_organizer());
create policy "profile own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Clubs
create policy "club owner read" on public.clubs for select using (owner_id = auth.uid() or public.is_organizer());
create policy "club owner insert" on public.clubs for insert with check (owner_id = auth.uid());
create policy "club owner update" on public.clubs for update using (owner_id = auth.uid() or public.is_organizer()) with check (owner_id = auth.uid() or public.is_organizer());
create policy "organizer delete clubs" on public.clubs for delete using (public.is_organizer());

-- Athletes
create policy "club athletes read" on public.athletes for select using (
  public.is_organizer() or exists(select 1 from public.clubs c where c.id = club_id and c.owner_id = auth.uid())
);
create policy "club athletes insert" on public.athletes for insert with check (
  exists(select 1 from public.clubs c where c.id = club_id and c.owner_id = auth.uid())
);
create policy "club athletes update" on public.athletes for update using (
  public.is_organizer() or exists(select 1 from public.clubs c where c.id = club_id and c.owner_id = auth.uid())
) with check (
  public.is_organizer() or exists(select 1 from public.clubs c where c.id = club_id and c.owner_id = auth.uid())
);
create policy "club athletes delete" on public.athletes for delete using (
  public.is_organizer() or exists(select 1 from public.clubs c where c.id = club_id and c.owner_id = auth.uid())
);

-- Competition catalog and tournaments
create policy "competition public read" on public.competition_types for select using (true);
create policy "competition organizer write" on public.competition_types for all using (public.is_organizer()) with check (public.is_organizer());
create policy "tournament public read" on public.tournaments for select using (true);
create policy "tournament organizer write" on public.tournaments for all using (public.is_organizer()) with check (public.is_organizer());

-- Entries: clubs can see entries of their own athletes; organizers control the schedule.
create policy "entries club read" on public.entries for select using (
  public.is_organizer() or exists(
    select 1 from public.athletes a join public.clubs c on c.id = a.club_id
    where a.id = athlete_id and c.owner_id = auth.uid()
  )
);
create policy "entries organizer write" on public.entries for all using (public.is_organizer()) with check (public.is_organizer());

create policy "live display organizer read" on public.live_display for select using (public.is_organizer());
create policy "live display organizer write" on public.live_display for all using (public.is_organizer()) with check (public.is_organizer());

-- Publiczna funkcja dla rodzica: dokładne imię+nazwisko, bez daty urodzenia, e-maili ani innych danych wrażliwych.
create or replace function public.parent_lookup(child_full_name text)
returns table(
  athlete_name text,
  club_name text,
  competition_name text,
  category text,
  mat text,
  estimated_start time,
  status text
)
language sql
security definer set search_path = public
as $$
  select
    trim(a.first_name || ' ' || a.last_name),
    c.name,
    ct.name,
    e.category,
    e.mat,
    e.estimated_start,
    e.status
  from public.athletes a
  join public.clubs c on c.id = a.club_id
  join public.entries e on e.athlete_id = a.id
  join public.competition_types ct on ct.id = e.competition_id
  where lower(trim(a.first_name || ' ' || a.last_name)) = lower(trim(child_full_name))
  order by e.estimated_start nulls last;
$$;

grant execute on function public.parent_lookup(text) to anon, authenticated;

-- Publiczny odczyt jednej aktualnej planszy telebimu.
create or replace function public.public_live_display()
returns table(
  athlete_name text,
  photo_url text,
  club_name text,
  tournament_name text,
  competition_name text,
  category text,
  mat text,
  estimated_start time
)
language sql
security definer set search_path = public
as $$
  select
    trim(a.first_name || ' ' || a.last_name),
    a.photo_url,
    c.name,
    t.name,
    ct.name,
    e.category,
    e.mat,
    e.estimated_start
  from public.live_display ld
  join public.entries e on e.id = ld.entry_id
  join public.athletes a on a.id = e.athlete_id
  join public.clubs c on c.id = a.club_id
  join public.tournaments t on t.id = e.tournament_id
  join public.competition_types ct on ct.id = e.competition_id
  where ld.id = 1;
$$;

grant execute on function public.public_live_display() to anon, authenticated;

-- Storage zdjęć zawodników. Nazwy plików powinny być UUID, bez danych osobowych w nazwie.
insert into storage.buckets (id, name, public)
values ('athlete-photos','athlete-photos',true)
on conflict (id) do update set public = true;

create policy "athlete photos public read" on storage.objects for select using (bucket_id = 'athlete-photos');
create policy "athlete photos authenticated upload" on storage.objects for insert to authenticated with check (bucket_id = 'athlete-photos');
create policy "athlete photos authenticated update" on storage.objects for update to authenticated using (bucket_id = 'athlete-photos') with check (bucket_id = 'athlete-photos');
create policy "athlete photos authenticated delete" on storage.objects for delete to authenticated using (bucket_id = 'athlete-photos');

-- Po utworzeniu konta organizatora ustaw jego rolę ręcznie raz:
-- update public.profiles set role='organizer' where id='<UUID użytkownika>';


-- ETAP 2: dane publicznej aplikacji oraz obsługa drabinek/tatami.
alter table public.tournaments add column if not exists avg_bout_minutes integer not null default 4;
alter table public.tournaments add column if not exists bout_seconds integer not null default 120;

create table if not exists public.training_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  days text not null,
  training_time text not null,
  venue text,
  instructor text,
  notes text,
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  publish_date date not null default current_date,
  important boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.kumite_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  competition_id text not null references public.competition_types(id),
  category text not null,
  mat text not null,
  round_index integer not null,
  round_name text not null,
  match_no integer not null,
  queue_order integer not null,
  red_athlete_id uuid references public.athletes(id) on delete set null,
  blue_athlete_id uuid references public.athletes(id) on delete set null,
  red_source_match_id uuid references public.kumite_matches(id) on delete set null,
  blue_source_match_id uuid references public.kumite_matches(id) on delete set null,
  winner_id uuid references public.athletes(id) on delete set null,
  red_score integer not null default 0,
  blue_score integer not null default 0,
  status text not null default 'scheduled' check (status in ('scheduled','active','done')),
  timer_remaining integer,
  timer_started_at timestamptz,
  timer_running boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.mat_states (
  mat text primary key,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  competition_id text references public.competition_types(id),
  category text,
  mode text not null default 'bracket' check (mode in ('bracket','scoreboard')),
  current_match_id uuid references public.kumite_matches(id) on delete set null,
  last_completed_match_id uuid references public.kumite_matches(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.training_groups enable row level security;
alter table public.news_items enable row level security;
alter table public.kumite_matches enable row level security;
alter table public.mat_states enable row level security;

create policy "training groups public read" on public.training_groups for select using (active = true or public.is_organizer());
create policy "training groups organizer write" on public.training_groups for all using (public.is_organizer()) with check (public.is_organizer());
create policy "news public read" on public.news_items for select using (active = true or public.is_organizer());
create policy "news organizer write" on public.news_items for all using (public.is_organizer()) with check (public.is_organizer());
create policy "kumite matches public read" on public.kumite_matches for select using (true);
create policy "kumite matches organizer write" on public.kumite_matches for all using (public.is_organizer()) with check (public.is_organizer());
create policy "mat states public read" on public.mat_states for select using (true);
create policy "mat states organizer write" on public.mat_states for all using (public.is_organizer()) with check (public.is_organizer());

-- ETAP 7: formularz tworzenia zawodów.
alter table public.tournaments add column if not exists start_time time;
alter table public.tournaments add column if not exists mat_count integer not null default 3;
alter table public.tournaments add column if not exists visible_to_clubs boolean not null default true;
alter table public.tournaments add column if not exists published_at timestamptz;

create table if not exists public.tournament_competitions (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  competition_id text not null references public.competition_types(id),
  primary key (tournament_id, competition_id)
);
alter table public.tournament_competitions enable row level security;
create policy "tournament competitions public read" on public.tournament_competitions for select using (true);
create policy "tournament competitions organizer write" on public.tournament_competitions for all using (public.is_organizer()) with check (public.is_organizer());

-- ETAP 15: kategorie tworzone dopiero po utworzeniu zawodów.
create table if not exists public.tournament_categories (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  competition_id text not null references public.competition_types(id),
  name text not null,
  gender text not null default 'all',
  min_age integer,
  max_age integer,
  created_at timestamptz not null default now(),
  unique(tournament_id, competition_id, name)
);

alter table public.entries add column if not exists category_id uuid references public.tournament_categories(id) on delete cascade;
alter table public.tournament_categories enable row level security;
create policy "tournament categories public read" on public.tournament_categories for select using (true);
create policy "tournament categories organizer write" on public.tournament_categories for all using (public.is_organizer()) with check (public.is_organizer());
