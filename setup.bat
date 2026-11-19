@echo off
cd /d "%~dp0"
echo Night Constellation kurulumu baslatiliyor...
py -m pip install -r requirements.txt
if errorlevel 1 (
    python -m pip install -r requirements.txt
)
echo.
echo Kurulum tamamlandi! Canli duvar kagidi baslatiliyor...
call wallpaper.bat
