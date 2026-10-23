-- IKA Poland: zabezpieczenie logowania organizatora po ETAPIE 66.
-- Wykonaj w Supabase SQL Editor (rola postgres), przed rozpoczęciem testów.
-- Nie tworzy kont organizatora i nie nadaje roli żadnemu klubowi.
BEGIN;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Historyczna polityka pozwalała klubowi zaktualizować własny profil (w tym rolę).
DROP POLICY IF EXISTS "profile own update" ON public.profiles;
DROP POLICY IF EXISTS "profiles own update" ON public.profiles;
DROP POLICY IF EXISTS "profiles own or organizer update" ON public.profiles;
-- Minimalny zestaw uprawnień: profil można czytać, ale nie zmieniać rolę przez klienta.
REVOKE UPDATE, DELETE, INSERT ON public.profiles FROM anon, authenticated;
DROP POLICY IF EXISTS "profiles own or organizer read" ON public.profiles;
CREATE POLICY "profiles own or organizer read" ON public.profiles
FOR SELECT TO authenticated USING (id = (select auth.uid()) OR public.is_organizer());
COMMIT;
SELECT 'IKA ORGANIZER AUTH: SQL OK' AS result;
