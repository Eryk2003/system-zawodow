@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "LAN_IP="
for /f "usebackq delims=" %%I in (`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue ^| Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceOperationalStatus -eq 'Up' }; $best = $ips ^| Sort-Object InterfaceMetric ^| Select-Object -First 1 -ExpandProperty IPAddress; if ($best) { Write-Output $best }"`) do set "LAN_IP=%%I"
if not defined LAN_IP (
  echo Nie udalo sie wykryc adresu IPv4.
  pause
  exit /b 1
)
set "SHARE_URL=http://%LAN_IP%:19464"
echo %SHARE_URL%
echo %SHARE_URL%| clip
echo.
echo Link skopiowany do schowka.
pause
