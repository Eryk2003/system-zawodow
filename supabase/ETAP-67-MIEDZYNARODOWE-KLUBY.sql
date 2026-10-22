-- ETAP 67 — dane międzynarodowe klubów i zawodników.
-- Uruchom ten plik JEDEN RAZ po wdrożeniu ETAPU 67.
-- Nie usuwa istniejących danych. Rozszerza wyłącznie sanitowany widok publiczny.

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
      'country', new.club->'country',
      'countryCode', new.club->'countryCode',
      'federation', new.club->'federation'
    ))
  end;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', athlete->'id',
    'clubId', athlete->'clubId',
    'firstName', athlete->'firstName',
    'lastName', athlete->'lastName',
    'gender', athlete->'gender',
    'grade', athlete->'grade',
    'nationality', athlete->'nationality',
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

-- Odśwież istniejące rekordy, żeby nowe pola pojawiły się od razu.
update public.club_private_state
set updated_at = now();

select 'ETAP 67 OK' as status;
