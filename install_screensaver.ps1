#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"

$scrSource = Join-Path $PSScriptRoot "dist\NightConstellation.scr"
if (-not (Test-Path $scrSource)) {
    Write-Error "dist\NightConstellation.scr bulunamadi. Once build_screensaver.bat calistirin."
    exit 1
}

$dest = "$env:WINDIR\System32\NightConstellation.scr"
Copy-Item -Path $scrSource -Destination $dest -Force

# Set as active Windows screensaver
$regPath = "HKCU:\Control Panel\Desktop"
Set-ItemProperty -Path $regPath -Name "SCRNSAVE.EXE" -Value $dest
Set-ItemProperty -Path $regPath -Name "ScreenSaveActive" -Value "1"
Set-ItemProperty -Path $regPath -Name "ScreenSaveTimeOut" -Value "300"

Write-Host "NightConstellation.scr basariyla yuklendi ve varsayilan ekran koruyucu yapildi (5 dakika)." -ForegroundColor Green
