@echo off
cd /d "%~dp0"
py main.py --wallpaper
if errorlevel 1 (
    python main.py --wallpaper
)
