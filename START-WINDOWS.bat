@echo off
cd /d %~dp0
if not exist node_modules (
  echo Instalowanie zaleznosci...
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo Nie udalo sie zainstalowac zaleznosci.
    pause
    exit /b 1
  )
)
echo.
echo IKA Poland - System Zawodow
start "IKA Poland - serwer" cmd /k npm.cmd run dev
timeout /t 3 /nobreak >nul
start "" http://localhost:19464
exit
