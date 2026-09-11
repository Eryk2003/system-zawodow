Na stronie głównej w sekcji głównej pozostawiono tylko dwa przyciski: „Zarejestruj się” i „Zaloguj”.

Usunięto duże logo z sekcji głównej strony startowej. Logo w nagłówku i ikona strony pozostają bez zmian.

# IKA Poland — System Zawodów ETAP 31

Ten etap ustawia oficjalne logo IKA Poland jako logo systemu, faviconę strony i znak marki zamiast domyślnej ikony.

# IKA Poland — System Zawodów — ETAP 26

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


## ETAP 17 — płeć i klasyfikacja LIVE
- Płeć przy zawodniku i kategorii: tylko Kobieta albo Mężczyzna.
- Klasyfikacja zawodników i klubów aktualizowana automatycznie po zakończeniu finału kategorii kumite.
- Początkowo klasyfikacja zawodników używała punktacji 3 / 2 / 1; od ETAPU 20 została zastąpiona klasyfikacją medalową 6 / 4 / 2.
- Dwa trzecie miejsca z półfinałów są naliczane osobno.
- Publiczny ekran `/klasyfikacja` odświeża się na żywo.


## ETAP 18 — podium po zakończeniu kategorii
- Po zakończeniu finału kumite tablica TV automatycznie przełącza się z punktacji na podium ukończonej kategorii.
- Podium pokazuje 1. miejsce, 2. miejsce oraz dwa 3. miejsca, jeśli wynikają z drabinki.
- Wyświetlane są imię i nazwisko, klub oraz zdjęcie zawodnika; przy braku zdjęcia pojawiają się inicjały.
- Panel sędziego po finale informuje, że na TV jest już podium.
- Przycisk „Drabinka na TV” nadal pozwala ręcznie wrócić do drabinki.


## ETAP 19 — klasyfikacja klubowa medalowa
- O pozycji klubu decyduje najpierw liczba złotych medali.
- Przy równej liczbie złotych decydują srebrne, a następnie brązowe medale.
- Złoty medal zawodnika daje klubowi 6 pkt.
- Srebrny medal daje klubowi 4 pkt.
- Brązowy medal daje klubowi 2 pkt.
- Dwa trzecie miejsca są naliczane niezależnie: każdy brąz daje swojemu klubowi 2 pkt.
- Punkty klubowe są wyświetlane w tabeli, ale klub z większą liczbą złotych medali pozostaje wyżej nawet wtedy, gdy inny klub ma większą sumę punktów z medali niższego koloru.
- Od ETAPU 20 klasyfikacja zawodników działa medalowo na tych samych zasadach co klasyfikacja klubów.


## ETAP 20 — klasyfikacja zawodników medalowa
- Klasyfikacja zawodników działa teraz dokładnie tak samo jak klasyfikacja klubowa.
- O pozycji zawodnika decyduje najpierw liczba złotych medali.
- Przy równej liczbie złotych porównywane są srebrne, a następnie brązowe medale.
- Złoty medal daje zawodnikowi 6 pkt.
- Srebrny medal daje zawodnikowi 4 pkt.
- Brązowy medal daje zawodnikowi 2 pkt.
- Punkty są wyświetlane jako dorobek, ale kolejność pozostaje medalowa: złote → srebrne → brązowe → punkty.
- Przy dwóch trzecich miejscach każdy brąz jest naliczany osobno.


## ETAP 21 — punktacja kata zamiast drabinek
- Kategorie kata nie korzystają z drabinki. Organizator losuje listę startową zawodników.
- Przy tworzeniu listy wybiera się 3 albo 5 sędziów.
- Panel sędziego kata prowadzi zawodników kolejno z listy.
- Przycisk **GWIZDEK — POKAŻ OCENY** uruchamia etap prezentacji punktów i krótki sygnał dźwiękowy.
- Oceny każdego sędziego wpisuje się ręcznie w panelu; każda wpisana nota od razu pojawia się na tablicy TV.
- Dla 3 sędziów końcowa ocena jest sumą wszystkich 3 not.
- Dla 5 sędziów system automatycznie odrzuca jedną najwyższą i jedną najniższą notę i sumuje pozostałe 3.
- Po zapisaniu końcowej oceny TV pokazuje wynik zawodnika przez około 5 sekund, następnie listę uczestników przez około 4 sekundy i potem automatycznie następnego zawodnika.
- Po ocenie ostatniego zawodnika TV przechodzi po tej samej sekwencji na podium kategorii.
- Wyniki kata są uwzględniane w klasyfikacji medalowej zawodników i klubów (6 / 4 / 2 pkt).


## ETAP 26 — podium TV i pełny ekran
- Tablica TV kata i kumite korzysta z jednego, spójnego ekranu podium po zakończeniu kategorii.
- Podium ma formę rzeczywistych stopni: 1. miejsce na najwyższym stopniu, 2. miejsce po lewej i 3. miejsce po prawej.
- W kumite obsługiwane są dwa równorzędne 3. miejsca — obaj zawodnicy są pokazani nad wspólnym stopniem 3. miejsca.
- Na podium są zdjęcia zawodników, imię i nazwisko oraz klub.
- Każda tablica TV ma przycisk **Pełny ekran**. W pełnym ekranie przycisk chowa się po 3 sekundach i pojawia ponownie po poruszeniu myszą lub dotknięciu ekranu.
- Tryb pełnoekranowy pozostaje aktywny podczas automatycznych przejść: walka / wynik / lista / kolejny zawodnik / podium, dopóki użytkownik z niego nie wyjdzie.


## ETAP 26 — pole nazwy kata

W panelu sędziego kata przy aktualnym zawodniku znajduje się pole **„Wykonywane kata”**. Można wpisać nazwę, np. `Bassai Dai`, `Kanku Dai` albo inną nazwę kata. Nazwa jest zapisywana osobno dla każdego zawodnika i pojawia się automatycznie na tablicy TV: przy prezentacji zawodnika, podczas pokazywania ocen, przy końcowej ocenie oraz na liście uczestników.


## ETAP 26 — szybsze wpisywanie ocen kata

- po wpisaniu pierwszej cyfry oceny system automatycznie dopisuje kropkę, np. `8` → `8.`;
- po wpisaniu cyfry dziesiętnej, np. `8.5`, fokus automatycznie przechodzi do następnego sędziego;
- po wpisaniu oceny ostatniego sędziego fokus przechodzi na przycisk **ZAPISZ KOŃCOWĄ OCENĘ**;
- przycisk zapisu jest aktywny dopiero wtedy, gdy każdy sędzia ma pełną ocenę w formacie `x.x`;
- Backspace przy wartości zakończonej samą kropką czyści pole, żeby łatwo poprawić pierwszą cyfrę.


## ETAP 26 – punktacja kumite
- WAZARI = 1 punkt
- IPPON = 2 punkty
- COFNIJ = -1 punkt
