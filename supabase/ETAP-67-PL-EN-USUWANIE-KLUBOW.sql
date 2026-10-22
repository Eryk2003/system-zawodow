-- ============================================================
-- IKA Poland - ETAP 67
-- Aktywność kont klubowych + bezpieczne usuwanie klubu przez organizatora.
-- Uruchom CAŁY plik w Supabase -> SQL Editor -> New query -> Run.
-- ============================================================

alter table public.profiles
  add column if not exists active boolean not null default true;

-- Organizator musi być aktywny, aby otrzymać uprawnienia organizatora.
create or replace function public.is_organizer()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists(
    select 1
    from public.profiles
    where id = auth.uid() and role = 'organizer' and active is true
  );
$$;


create or replace function public.is_active_account()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and active is true
  );
$$;

-- Aktywne konto klubowe może czytać/zapisywać tylko własny rekord.
drop policy if exists "club private own read" on public.club_private_state;
create policy "club private own read"
on public.club_private_state for select to authenticated
using ((owner_id = auth.uid() and public.is_active_account()) or public.is_organizer());

drop policy if exists "club private own insert" on public.club_private_state;
create policy "club private own insert"
on public.club_private_state for insert to authenticated
with check ((owner_id = auth.uid() and public.is_active_account()) or public.is_organizer());

drop policy if exists "club private own update" on public.club_private_state;
create policy "club private own update"
on public.club_private_state for update to authenticated
using ((owner_id = auth.uid() and public.is_active_account()) or public.is_organizer())
with check ((owner_id = auth.uid() and public.is_active_account()) or public.is_organizer());

-- Chronimy profiles: użytkownik może odczytać swój profil, organizator wszystkie.
alter table public.profiles enable row level security;

drop policy if exists "profiles own or organizer read" on public.profiles;
create policy "profiles own or organizer read"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_organizer());

-- Nie dajemy klientom ogólnej polityki UPDATE/DELETE na profiles.
-- Dezaktywację klubu wykonuje wyłącznie poniższa funkcja organizatora.

create or replace function public.remove_club_account(target_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_organizer() then
    raise exception 'Organizer permission required';
  end if;

  if target_owner_id = auth.uid() then
    raise exception 'Organizer cannot remove own account';
  end if;

  update public.profiles
  set active = false
  where id = target_owner_id and role = 'club';

  delete from public.club_private_state
  where owner_id = target_owner_id;
end;
$$;

grant execute on function public.remove_club_account(uuid) to authenticated;

-- Upewniamy się, że nowe profile są aktywne.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, active)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'club', true)
  on conflict (id) do nothing;
  return new;
end;
$$;
