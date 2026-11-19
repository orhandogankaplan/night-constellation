@echo off
cd /d "%~dp0"
python main.py --desktop
if errorlevel 1 (
    echo.
    echo Hata olustu. Bagimliliklarin kurulu oldugundan emin olun: pip install -r requirements.txt
    pause
)
