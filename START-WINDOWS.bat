IKA POLAND - SYSTEM ZAWODOW - ETAP 55 CLEAN DEPLOY

TYM RAZEM NIE PRZECIAGAJ PLIKOW RECZNIE Z ZIP-A.

1. Rozpakuj caly ZIP do zwyklego folderu na Pulpicie.
2. W rozpakowanym folderze kliknij dwa razy: AKTUALIZUJ-SYSTEM.bat
3. Skrypt znajdzie lokalny folder system-zawodow (lub poprosi o sciezke).
4. Skrypt skopiuje pliki po ich prawidlowych nazwach i sprawdzi:
   - package.json
   - vercel.json
   - vite.config.js
   - index.html
5. Dopiero gdy zobaczysz komunikat GOTOWE, otworz GitHub Desktop.
6. Commit: ETAP 55 clean deploy
7. Push origin.
8. Vercel uruchomi nowy deployment.

Nie kopiuj recznie pojedynczych plikow konfiguracyjnych - to bylo zrodlem poprzednich bledow.

NOWOSC W ETAPIE 55:
- Rozpocznij walke przygotowuje zawodnikow i tablice, ale NIE uruchamia czasu.
- START CZASU uruchamia odliczanie.
- PAUZA CZASU zatrzymuje odliczanie.
- COFNIJ 10 s dodaje z powrotem 10 sekund (maksymalnie do pelnego czasu walki).
- ODEJMIJ 10 s odejmuje 10 sekund.
- RESET CZASU przywraca pelny czas kategorii i zatrzymuje zegar.
