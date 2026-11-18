@echo off
cd /d "%~dp0"
echo Night Constellation Windows Ekran Koruyucu (.scr) derleniyor...
pyinstaller --noconfirm --onefile --windowed ^
    --name NightConstellation ^
    --add-data "frontend;frontend" ^
    --add-data "config.json;." ^
    --hidden-import winrt.windows.media.control ^
    --hidden-import winrt.windows.storage.streams ^
    --hidden-import winrt.windows.foundation ^
    main.py

if exist "dist\NightConstellation.exe" (
    copy /Y "dist\NightConstellation.exe" "dist\NightConstellationWallpaper.exe" >nul
    copy /Y "dist\NightConstellation.exe" "dist\NightConstellation.scr" >nul
    echo.
    echo Basarili! Uygulama: dist\NightConstellation.exe
    echo Duvar kagidi uygulamasi: dist\NightConstellationWallpaper.exe
    echo Ekran koruyucu: dist\NightConstellation.scr
    echo Yuklemek icin dosyaya sag tiklayip "Yukle" secenegine tiklayabilirsiniz.
) else (
    echo Derleme basarisiz oldu.
)
pause
