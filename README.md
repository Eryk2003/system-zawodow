# ETAP 67 — międzynarodowe kluby

Dodano PL/EN w publicznej stronie i strefie klubu, kraj z flagą, federację/organizację narodową oraz narodowość zawodnika. Po wdrożeniu uruchom `supabase/ETAP-67-MIEDZYNARODOWE-KLUBY.sql`.

# ETAP 66 — bezpieczne konta klubów i synchronizacja Supabase

Ten etap przygotowuje system do zawodów międzynarodowych pod kątem prywatności i wielu klubów.

## Najważniejsze zmiany
- Organizator i kluby logują się przez Supabase Auth na stronie produkcyjnej.
- Rola `organizer` jest odczytywana z `public.profiles`.
- Pełne dane klubu, zawodników i zgłoszeń trafiają do `club_private_state` chronionego RLS.
- Klub widzi i zapisuje pełne dane tylko własnego klubu.
- Organizator może odczytać wszystkie kluby.
- Publiczna strona LIVE korzysta z `public_participant_state`, który nie zawiera dat urodzenia, e-maili ani danych rodziców.
- `app_shared_state` przechowuje od tego etapu tylko publiczny/organizacyjny stan zawodów i może być zapisywany wyłącznie przez organizatora.
- Dotychczasowe dane z `app_shared_state` są automatycznie migrowane dla klubów posiadających prawidłowe konta Supabase.

## WAŻNE — jednorazowa migracja Supabase
Przed końcowym testem Vercela uruchom w Supabase SQL Editor cały plik:
`supabase/ETAP-66-BEZPIECZNA-SYNCHRONIZACJA.sql`

Następnie konto organizatora musi mieć rolę `organizer` w `public.profiles`. Instrukcja jest również na końcu pliku SQL.

---

# ETAP 65 — duże drabinki 2–128 zawodników

- Obsługa drabinek kumite od 2 do 128 zawodników.
- Wolne losy są rozkładane równomiernie w całej drabince.
- Dla 50 zawodników system tworzy 18 walk wstępnych, 14 wolnych losów i 49 realnych walk łącznie.
- Dodane rundy 1/32 i 1/64 finału.
- Duże drabinki mają kompaktowy, przewijany widok w Centrum Zawodów i na TV.
- Wydruk dużych drabinek jest przygotowany do dzielenia na kolejne arkusze A3.


## ETAP 62 — dynamiczny badge zawodnika zgodny z zaakceptowanym wzorem
- Po zamknięciu zgłoszeń organizator otrzymuje badge każdego zgłoszonego zawodnika.
- Wygląd badge’a wykorzystuje zaakceptowany wzór IKA Poland jako warstwę graficzną.
- Dynamicznie podmieniane są: zdjęcie, numer startowy, imię i nazwisko, klub, kraj oraz kategorie.
- Każdy badge ma indywidualny kod QR prowadzący bezpośrednio do `/rodzic?athlete=...`, czyli do podglądu LIVE startów danego zawodnika.
- Można drukować pojedynczy badge albo wszystkie identyfikatory.
# ETAP 61 – identyfikatory zawodników po zamknięciu zgłoszeń

- Identyfikatory są dostępne wyłącznie dla organizatora i dopiero po zamknięciu zgłoszeń.
- Każdy zgłoszony zawodnik otrzymuje stały numer startowy, który nie przesuwa się po ponownym otwarciu widoku.
- Identyfikator zawiera: zdjęcie, numer startowy, imię i nazwisko, klub, kraj oraz wszystkie kategorie zawodnika.
- Każdy identyfikator ma kod QR prowadzący bezpośrednio do publicznego podglądu LIVE konkretnego zawodnika.
- Po zeskanowaniu QR system pokazuje jego konkurencje, tatami, przewidywane godziny i liczbę walk do startu.
- Organizator może drukować wszystkie identyfikatory albo pojedynczy wybrany identyfikator.

# ETAP 59 - drukowanie drabinek i list kata

- Każda wybrana kategoria kumite ma przycisk **Drukuj drabinkę**.
- Wydruk zawiera nazwę zawodów, konkurencję, kategorię, datę, miejsce, tatami oraz pełną drabinkę.
- Układ drabinki jest przygotowany przede wszystkim pod A3 poziomo.
- Każda wybrana kategoria kata ma przycisk **Drukuj listę kata**.
- Wydruk kata zawiera kolejność startową, zawodnika, klub, wykonywane kata i wynik, jeśli został już zapisany.
- Widok do druku nie zawiera przycisków ani elementów panelu organizatora.

# ETAP 51 - termin zgłoszeń klubów

- Organizator ustawia dokładną datę i godzinę zakończenia zapisów.
- Klub widzi termin i licznik pozostałego czasu przy aktywnych zawodach.
- Po upływie terminu strona klubowa automatycznie blokuje dodawanie i usuwanie zgłoszeń.
- Zawody i istniejące zgłoszenia nadal pozostają widoczne.

# IKA Poland - System Zawodów - ETAP 49

## Naprawa 404 Panelu Sędziego na Vercel

Przywrócono prawidłowy `vercel.json` dla aplikacji Vite/React SPA. Dzięki regule rewrite bezpośrednie adresy takie jak `/organizator/sedzia/Tatami%201`, `/organizator/kata-sedzia/...` i `/tatami/...` są obsługiwane przez React Router zamiast zwracać błąd Vercel 404.

**Ważne:** po skopiowaniu tej paczki upewnij się, że `vercel.json` znajduje się w głównym folderze repo obok `package.json`, a potem zrób Commit + Push.

# ETAP 47 - większe kafelki drabinki

Poprawka wyłącznie wyglądu drabinki Kumite. Cofnięto niepotrzebną zmianę logiki z ETAPU 46. Kafelki walk są szersze i wyższe, odstępy pionowe są większe, a oba nazwiska zawodników mieszczą się bez nachodzenia sąsiednich walk. Zmiana działa w Centrum Zawodów i na telebimie.

# ETAP 44 - harmonogram liczony z rzeczywistego czasu walki

- Harmonogram liczy czas w sekundach, więc obsługuje dokładnie 1:00, 1:30, 2:00 i 3:00.
- Kategorie kumite mogą mieć własny czas walki; brak ustawienia oznacza domyślny czas zawodów.
- Dla 4 zawodników kumite system liczy 3 walki, np. przy 1:30 = 4 min 30 s.
- Zawodnicy nie dostają już wszyscy tej samej godziny: pierwsze pary otrzymują kolejne orientacyjne czasy zgodnie z kolejnością walk.
- Po wylosowaniu drabinki orientacyjne godziny są przeliczane zgodnie z kolejnością walk w drabince.
- Zegar panelu sędziego używa czasu przypisanego do danej kategorii.
- `vercel.json` pozostaje poprawnym plikiem JSON.

# ETAP 42 - kary Shobu

Dodano cztery poziomy kar w kumite Shobu: ATTENAI 1, ATTENAI 2, CHUI i HANSOKU. HANSOKU automatycznie kończy walkę: zawodnik ukarany przegrywa, przeciwnik zostaje zwycięzcą i awansuje dalej. Po zakończeniu walki nie można zmieniać punktów ani kar. Kary są widoczne w Panelu Sędziego, Centrum Zawodów i na tablicy TV.

# IKA Poland - System Zawodów ETAP 40

## Najważniejsza zmiana
Kluby korzystają teraz z Supabase Auth (e-mail + hasło), jeśli Supabase jest skonfigurowany.
Dzięki temu ten sam klub może zalogować się na komputerze, laptopie lub telefonie tym samym kontem.

Zawody utworzone przez organizatora są zapisywane w wspólnym stanie Supabase i są automatycznie widoczne w panelach wszystkich zalogowanych klubów. Realtime odświeża widok bez ręcznego kopiowania danych.

Przepływ:
1. Organizator tworzy zawody.
2. `visibleToClubs` jest automatycznie ustawione na `true`.
3. Supabase synchronizuje zawody na wszystkie urządzenia.
4. Klub loguje się swoim kontem e-mail/hasło.
5. Klub widzi zawody, dodaje swoich zawodników i zgłasza ich do kategorii.
6. Organizator widzi wspólne zgłoszenia wszystkich klubów.

Konto demonstracyjne organizatora pozostaje lokalne:
- admin@ikapoland.demo
- IKA12345

Jeśli w Supabase Auth jest włączone potwierdzanie e-maili, nowy klub musi najpierw kliknąć link potwierdzający. Jeśli chcesz rejestrację od razu bez potwierdzenia, wyłącz Confirm email w Supabase -> Authentication -> Providers -> Email.

# IKA Poland - System Zawodów ETAP 38

## Drabinki i panel sędziego kumite jak w Systemie Akademii

- Przeniesiono układ drabinek wzorowany na Systemie Akademii: kolumny rund, karty walk, połączenia między rundami, statusy i wyróżnienie zwycięzcy.
- Kumite Shobu Ippon: AKA czerwony, SHIRO biały.
- Kumite Shobu Sanbon: AKA czerwony, AO niebieski.
- Kumite Shobu Nihon: AKA czerwony, AO niebieski.
- Panel sędziego ma punktację WAZARI +1 i IPPON +2.
- Dodano korektę wyniku -1 i -2 dla obu stron.
- Oznaczenia AKA/SHIRO/AO są widoczne w panelu sędziego, drabince organizatora i drabince TV.
- Pozostała logika zawodów, podium, harmonogramu i Supabase nie została przebudowana.

# IKA Poland - System Zawodów ETAP 34

Synchronizacja Supabase Realtime między komputerem, laptopem i telefonem.

# IKA Poland - System Zawodów ETAP 34

## Synchronizacja między urządzeniami

Ten etap dodaje wspólny zapis Supabase. Zawody, kluby, zawodnicy, kategorie, harmonogram, drabinki, kata, wyniki i ekrany LIVE są synchronizowane pomiędzy urządzeniami przez tabelę `app_shared_state`.

Wykonaj jednorazowo `supabase/cloud-sync.sql`, a w Vercel ustaw `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY`. Szczegóły: `INSTRUKCJA-SYNCHRONIZACJA-SUPABASE.txt`.

ETAP 32: podmieniono logo systemu na dokładnie przesłane oficjalne logo IKA Poland. Logo jest używane w nagłówku i jako favicon, bez dużego logo w sekcji głównej.

Na stronie głównej w sekcji głównej pozostawiono tylko dwa przyciski: „Zarejestruj się” i „Zaloguj”.

Usunięto duże logo z sekcji głównej strony startowej. Logo w nagłówku i ikona strony pozostają bez zmian.

# IKA Poland - System Zawodów ETAP 32

Ten etap ustawia oficjalne logo IKA Poland jako logo systemu, faviconę strony i znak marki zamiast domyślnej ikony.

# IKA Poland - System Zawodów - ETAP 26

## Organizator jest jednocześnie klubem

Konto organizatora może teraz mieć własny profil klubu i własną bazę zawodników.

### Przepływ

1. Organizator wchodzi w **Mój klub**.
2. Tworzy profil swojego klubu, jeśli jeszcze go nie ma.
3. Dodaje zawodników do własnego klubu wraz ze zdjęciami i danymi.
4. Przechodzi do **Stwórz zawody**.
5. Tworzy zawody i kategorie.
6. Przy wyborze zawodników do kategorii widzi **wyłącznie zawodników swojego klubu**.
7. Zaznacza własnych zawodników, zapisuje zgłoszenia i może losować drabinkę.

Zgłoszenia innych klubów są zachowywane niezależnie. Zmiana listy zawodników przez organizatora dotyczy tylko zawodników jego własnego klubu i nie usuwa zgłoszeń należących do innych klubów.

## Pozostałe funkcje

- automatyczny harmonogram z możliwością ręcznej korekty,
- panel sędziego i tablice TV kumite,
- Shobu Ippon: czerwony / biały,
- Shobu Sanbon i Shobu Nihon: czerwony / niebieski,
- WAZARI = 0,5 pkt, IPPON = 1 pkt,
- zdjęcia zawodników na tablicy TV,
- drabinki i losowanie zawodników.

## Uruchomienie Windows

```cmd
npm.cmd install
npm.cmd run dev
```

Adres: `http://localhost:19464`

> Wersja demonstracyjna zapisuje dane lokalnie w przeglądarce. Wspólna praca klubów na różnych komputerach wymaga podłączenia do Supabase.


## ETAP 17 - płeć i klasyfikacja LIVE
- Płeć przy zawodniku i kategorii: tylko Kobieta albo Mężczyzna.
- Klasyfikacja zawodników i klubów aktualizowana automatycznie po zakończeniu finału kategorii kumite.
- Początkowo klasyfikacja zawodników używała punktacji 3 / 2 / 1; od ETAPU 20 została zastąpiona klasyfikacją medalową 6 / 4 / 2.
- Dwa trzecie miejsca z półfinałów są naliczane osobno.
- Publiczny ekran `/klasyfikacja` odświeża się na żywo.


## ETAP 18 - podium po zakończeniu kategorii
- Po zakończeniu finału kumite tablica TV automatycznie przełącza się z punktacji na podium ukończonej kategorii.
- Podium pokazuje 1. miejsce, 2. miejsce oraz dwa 3. miejsca, jeśli wynikają z drabinki.
- Wyświetlane są imię i nazwisko, klub oraz zdjęcie zawodnika; przy braku zdjęcia pojawiają się inicjały.
- Panel sędziego po finale informuje, że na TV jest już podium.
- Przycisk „Drabinka na TV” nadal pozwala ręcznie wrócić do drabinki.


## ETAP 19 - klasyfikacja klubowa medalowa
- O pozycji klubu decyduje najpierw liczba złotych medali.
- Przy równej liczbie złotych decydują srebrne, a następnie brązowe medale.
- Złoty medal zawodnika daje klubowi 6 pkt.
- Srebrny medal daje klubowi 4 pkt.
- Brązowy medal daje klubowi 2 pkt.
- Dwa trzecie miejsca są naliczane niezależnie: każdy brąz daje swojemu klubowi 2 pkt.
- Punkty klubowe są wyświetlane w tabeli, ale klub z większą liczbą złotych medali pozostaje wyżej nawet wtedy, gdy inny klub ma większą sumę punktów z medali niższego koloru.
- Od ETAPU 20 klasyfikacja zawodników działa medalowo na tych samych zasadach co klasyfikacja klubów.


## ETAP 20 - klasyfikacja zawodników medalowa
- Klasyfikacja zawodników działa teraz dokładnie tak samo jak klasyfikacja klubowa.
- O pozycji zawodnika decyduje najpierw liczba złotych medali.
- Przy równej liczbie złotych porównywane są srebrne, a następnie brązowe medale.
- Złoty medal daje zawodnikowi 6 pkt.
- Srebrny medal daje zawodnikowi 4 pkt.
- Brązowy medal daje zawodnikowi 2 pkt.
- Punkty są wyświetlane jako dorobek, ale kolejność pozostaje medalowa: złote → srebrne → brązowe → punkty.
- Przy dwóch trzecich miejscach każdy brąz jest naliczany osobno.


## ETAP 21 - punktacja kata zamiast drabinek
- Kategorie kata nie korzystają z drabinki. Organizator losuje listę startową zawodników.
- Przy tworzeniu listy wybiera się 3 albo 5 sędziów.
- Panel sędziego kata prowadzi zawodników kolejno z listy.
- Przycisk **GWIZDEK - POKAŻ OCENY** uruchamia etap prezentacji punktów i krótki sygnał dźwiękowy.
- Oceny każdego sędziego wpisuje się ręcznie w panelu; każda wpisana nota od razu pojawia się na tablicy TV.
- Dla 3 sędziów końcowa ocena jest sumą wszystkich 3 not.
- Dla 5 sędziów system automatycznie odrzuca jedną najwyższą i jedną najniższą notę i sumuje pozostałe 3.
- Po zapisaniu końcowej oceny TV pokazuje wynik zawodnika przez około 5 sekund, następnie listę uczestników przez około 4 sekundy i potem automatycznie następnego zawodnika.
- Po ocenie ostatniego zawodnika TV przechodzi po tej samej sekwencji na podium kategorii.
- Wyniki kata są uwzględniane w klasyfikacji medalowej zawodników i klubów (6 / 4 / 2 pkt).


## ETAP 26 - podium TV i pełny ekran
- Tablica TV kata i kumite korzysta z jednego, spójnego ekranu podium po zakończeniu kategorii.
- Podium ma formę rzeczywistych stopni: 1. miejsce na najwyższym stopniu, 2. miejsce po lewej i 3. miejsce po prawej.
- W kumite obsługiwane są dwa równorzędne 3. miejsca - obaj zawodnicy są pokazani nad wspólnym stopniem 3. miejsca.
- Na podium są zdjęcia zawodników, imię i nazwisko oraz klub.
- Każda tablica TV ma przycisk **Pełny ekran**. W pełnym ekranie przycisk chowa się po 3 sekundach i pojawia ponownie po poruszeniu myszą lub dotknięciu ekranu.
- Tryb pełnoekranowy pozostaje aktywny podczas automatycznych przejść: walka / wynik / lista / kolejny zawodnik / podium, dopóki użytkownik z niego nie wyjdzie.


## ETAP 26 - pole nazwy kata

W panelu sędziego kata przy aktualnym zawodniku znajduje się pole **„Wykonywane kata”**. Można wpisać nazwę, np. `Bassai Dai`, `Kanku Dai` albo inną nazwę kata. Nazwa jest zapisywana osobno dla każdego zawodnika i pojawia się automatycznie na tablicy TV: przy prezentacji zawodnika, podczas pokazywania ocen, przy końcowej ocenie oraz na liście uczestników.


## ETAP 26 - szybsze wpisywanie ocen kata

- po wpisaniu pierwszej cyfry oceny system automatycznie dopisuje kropkę, np. `8` → `8.`;
- po wpisaniu cyfry dziesiętnej, np. `8.5`, fokus automatycznie przechodzi do następnego sędziego;
- po wpisaniu oceny ostatniego sędziego fokus przechodzi na przycisk **ZAPISZ KOŃCOWĄ OCENĘ**;
- przycisk zapisu jest aktywny dopiero wtedy, gdy każdy sędzia ma pełną ocenę w formacie `x.x`;
- Backspace przy wartości zakończonej samą kropką czyści pole, żeby łatwo poprawić pierwszą cyfrę.


## ETAP 26 - punktacja kumite
- WAZARI = 1 punkt
- IPPON = 2 punkty
- COFNIJ = -1 punkt


ETAP 35: Na ekranie oczekiwania telebimu napis „IKA” jest biały, a „POLAND” czerwony.

## ETAP 36 - zgłoszenia klubu na zawody
- Klub może wyszukiwać własnych zawodników po imieniu, nazwisku, dacie urodzenia, stopniu lub danych opiekuna.
- System pokazuje zawodnikowi tylko kategorie pasujące do płci i wieku na dzień zawodów.
- Klub może sam zgłosić/wycofać swojego zawodnika do/z kategorii.
- Przy każdej kategorii widoczna jest aktualna liczba wszystkich zgłoszonych zawodników, bez ujawniania danych innych klubów.
- W tabeli własnych zgłoszeń również widoczny jest licznik zawodników w kategorii.


ETAP 37: Ujednolicono wszystkie myślniki i kreski do zwykłego znaku "-" w całym projekcie.


ETAP 39:
- po utworzeniu zawodów organizator może dodać kilka konkurencji do jednych zawodów,
- konkurencje wybiera się wielokrotnie checkboxami,
- kategorie można tworzyć wyłącznie dla konkurencji dodanych do danych zawodów,
- wybrana konkurencja pozostaje w zawodach nawet jeśli nie ma jeszcze kategorii,
- konkurencji z istniejącymi kategoriami nie można przypadkowo odznaczyć.


## ETAP 41 - zasady wygranej Shobu i blokada punktów

- Kumite Ippon Shobu: automatyczna wygrana po 2 pkt (1 IPPON albo 2 WAZARI).
- Kumite Shobu Nihon: automatyczna wygrana po 4 pkt.
- Kumite Sanbon Shobu: automatyczna wygrana po 6 pkt.
- Po osiągnięciu progu system natychmiast kończy walkę, zatrzymuje czas i przekazuje zwycięzcę do kolejnej rundy.
- Zakończonej walki nie można dalej punktować ani korygować przyciskami - blokada działa również w warstwie danych.
- Panel sędziego pokazuje regułę wygranej dla aktualnej konkurencji.


## ETAP 43 - drabinka na telebimie po walce
- Po zakończeniu walki telebim automatycznie przechodzi na drabinkę.
- Zwycięzca jest już widoczny jako awansujący dalej.
- Następna gotowa walka jest podświetlona złotą ramką i oznaczona NASTĘPNA WALKA.
- Przy dużej drabince telebim automatycznie przewija widok do następnej walki.
- Po uruchomieniu następnej walki telebim wraca do tablicy punktowej.

## ETAP 45
- Publiczny wybór tatami przy zawodach z więcej niż jednym tatami.
- Lista najbliższych startów na wybranym tatami aktualizowana LIVE.
- Wyszukiwanie zawodnika działa po imieniu, nazwisku lub fragmencie nazwy.
- Przy zawodniku system pokazuje szacowaną godzinę startu oraz "za około N min".
- Szacunek LIVE uwzględnia kolejkę walk, pozostały czas aktywnej walki i czas pojedynku ustawiony dla kategorii.


## ETAP 48 - animowane podium

Po zakonczeniu kategorii podium na telebimie nie pokazuje wszystkich medalistow od razu. Zawodnicy pojawiaja sie kolejno z animacja spadania z gory i lekkiego odbicia przy ladowaniu:

1. pierwszy zawodnik z 3. miejsca,
2. drugi zawodnik z 3. miejsca, jesli wystepuje,
3. zawodnik z 2. miejsca,
4. na koncu zwyciezca z 1. miejsca.

Zmiana dotyczy tylko prezentacji podium. Klasyfikacja, wyniki i naliczanie punktow pozostaja bez zmian.


## ETAP 50 - strona zgłoszeń klubów
- część klubowa została ustawiona jako zwykła strona internetowa do zgłoszeń, a nie osobna aplikacja klubowa,
- po zalogowaniu klub widzi tylko swoich zawodników, aktywne zawody oraz własne zgłoszenia,
- klub może dodać/edytować/usunąć własnego zawodnika i zgłosić go do pasującej kategorii,
- przy kategorii widoczna jest łączna liczba zgłoszeń, ale bez danych zawodników innych klubów,
- organizator zachowuje osobne narzędzia do prowadzenia zawodów, drabinek, sędziów i telebimów,
- zachowany poprawny vercel.json z obsługą tras React Router.


## ETAP 52
- Po zakończeniu konkurencji TV pokazuje najpierw prostokątny kafel zwycięzcy ze zdjęciem - bez korony.
- Po 6 sekundach ekran przechodzi automatycznie do pełnej listy zawodników tej kategorii.
- Lista pokazuje miejsca 1/2/3/3, a pozostałych zawodników jako uczestników.


## ETAP 53
- Wyniki końcowe na telebimie są wyświetlane w jednej kolumnie - zawodnicy jeden pod drugim od 1. miejsca w dół.

## ETAP 54 - clean deploy
Dodano kontrolę integralności plików wdrożeniowych przed buildem (`scripts/verify-deploy.mjs`) oraz zewnętrzny instalator Windows, który kopiuje projekt po nazwach plików i weryfikuje konfigurację przed commitem.


## ETAP 55 - sterowanie czasem walki
- Rozpocznij walkę przygotowuje walkę i tablicę, ale zegar pozostaje zatrzymany.
- START CZASU uruchamia odliczanie.
- Dostępne są: Pauza czasu, Cofnij 10 s, Odejmij 10 s i Reset czasu.


## ETAP 57
- Punktacja kumite w interfejsie bez nazw WAZARI/IPPON.
- Panel sędziego i Centrum Zawodów: +1, +2, -1, -2.
- TV nie pokazuje legendy WAZARI/IPPON.
- Progi wygranej pozostają bez zmian i są opisane wyłącznie liczbą punktów.

## ETAP 63 - strona główna dla klubów
- Publiczny landing page jest teraz skierowany do klubów: rejestracja, logowanie i zgłoszenia zawodników.
- Usunięto publiczny katalog konkurencji ze strony głównej.
- Po wejściu na stronę główną widok zawsze wraca na samą górę do przycisków „Zarejestruj klub” i „Zaloguj”.
- Katalog konkurencji nadal pozostaje w narzędziach organizatora i konfiguracji zawodów.


## ETAP 64 — poprawa AUTO TV po odmowie uprawnienia
- Telebim nie jest zamykany, gdy Chrome/Edge odmówi dostępu do zarządzania ekranami.
- System pokazuje instrukcję odblokowania „Zarządzanie oknami / Window management”.
- Przycisk „Ponów wykrywanie” pozwala uruchomić AUTO HDMI po zmianie zgody bez restartu zawodów.
- Tryb ręczny TV pozostaje dostępny jako bezpieczne wyjście awaryjne.
