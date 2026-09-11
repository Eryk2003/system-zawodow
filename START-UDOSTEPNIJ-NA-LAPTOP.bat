@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title IKA Poland - udostepnianie na laptopa

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

set "LAN_IP="
for /f "usebackq delims=" %%I in (`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue ^| Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceOperationalStatus -eq 'Up' }; $best = $ips ^| Sort-Object InterfaceMetric ^| Select-Object -First 1 -ExpandProperty IPAddress; if ($best) { Write-Output $best }"`) do set "LAN_IP=%%I"

if not defined LAN_IP (
  echo.
  echo Nie udalo sie automatycznie wykryc adresu IPv4.
  echo Uruchom w terminalu: ipconfig
  echo i znajdz Adres IPv4 karty Wi-Fi.
  pause
  exit /b 1
)

set "SHARE_URL=http://%LAN_IP%:19464"

echo.
echo ===============================================
echo   IKA POLAND - SYSTEM ZAWODOW
 echo ===============================================
echo.
echo Link na tym komputerze:
echo   http://localhost:19464
 echo.
echo LINK DO WYSŁANIA NA LAPTOPA:
echo   %SHARE_URL%
echo.
echo Laptop musi byc polaczony z ta sama siecia Wi-Fi/LAN.
echo.
echo %SHARE_URL%| clip
echo Link zostal skopiowany do schowka - mozesz go od razu wkleic w wiadomosc.
echo.
echo Jesli Windows zapyta o dostep sieciowy dla Node.js,
echo zezwol na sieci prywatne.
echo ===============================================
echo.

start "IKA Poland - serwer 19464" cmd /k "cd /d \"%~dp0\" && npm.cmd run dev"
timeout /t 3 /nobreak >nul
start "" http://localhost:19464
pause
