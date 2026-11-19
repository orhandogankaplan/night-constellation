"""Windows System Tray icon & startup registry manager."""

from __future__ import annotations

import sys
import threading
from pathlib import Path
from typing import Callable, Dict, Any

TRAY_AVAILABLE = False
try:
    import pystray
    from PIL import Image, ImageDraw

    TRAY_AVAILABLE = True
except Exception:
    TRAY_AVAILABLE = False

if sys.platform == "win32":
    import winreg


RUN_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"
APP_REG_NAME = "NightConstellation"


def is_startup_enabled() -> bool:
    if sys.platform != "win32":
        return False
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, RUN_KEY, 0, winreg.KEY_READ) as key:
            winreg.QueryValueEx(key, APP_REG_NAME)
            return True
    except OSError:
        return False


def set_startup_enabled(enabled: bool, base_dir: Path) -> bool:
    if sys.platform != "win32":
        return False
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, RUN_KEY, 0, winreg.KEY_SET_VALUE) as key:
            if enabled:
                if getattr(sys, "frozen", False):
                    cmd = f'"{sys.executable}" --wallpaper'
                else:
                    pyw = Path(sys.executable).with_name("pythonw.exe")
                    exe = str(pyw if pyw.exists() else Path(sys.executable))
                    cmd = f'"{exe}" "{base_dir / "main.py"}" --wallpaper'
                winreg.SetValueEx(key, APP_REG_NAME, 0, winreg.REG_SZ, cmd)
            else:
                try:
                    winreg.DeleteValue(key, APP_REG_NAME)
                except FileNotFoundError:
                    pass
        return True
    except OSError:
        return False


def _create_tray_icon() -> "Image.Image":
    img = Image.new("RGBA", (64, 64), (8, 8, 12, 255))
    draw = ImageDraw.Draw(img)
    pts = [(16, 44), (28, 22), (44, 34), (50, 14)]
    draw.line(pts, fill=(235, 240, 255, 210), width=2)
    for x, y in pts:
        draw.ellipse((x - 3, y - 3, x + 3, y + 3), fill=(255, 252, 244, 255))
    draw.ellipse((22, 16, 34, 28), outline=(255, 255, 255, 230), width=2)
    return img


class TrayManager:
    """Runs pystray icon on a daemon thread for live theme, visual toggles, eco, and quit."""

    def __init__(
        self,
        base_dir: Path,
        get_config: Callable[[], Dict[str, Any]],
        update_config: Callable[[Dict[str, Any]], None],
        on_quit: Callable[[], None],
    ) -> None:
        self.base_dir = base_dir
        self.get_config = get_config
        self.update_config = update_config
        self.on_quit = on_quit
        self._icon = None

    def start(self) -> None:
        if not TRAY_AVAILABLE:
            return
        threading.Thread(target=self._run, daemon=True).start()

    def stop(self) -> None:
        if self._icon is not None:
            try:
                self._icon.stop()
            except Exception:
                pass

    def _set_theme(self, theme: str):
        def _handler(_icon, _item):
            self.update_config({"theme": theme})

        return _handler

    def _is_theme(self, theme: str):
        return lambda _item: self.get_config().get("theme", "adaptive") == theme

    def _toggle_bool(self, key: str, default: bool = True):
        def _handler(_icon, _item):
            cur = bool(self.get_config().get(key, default))
            self.update_config({key: not cur})

        return _handler

    def _is_bool(self, key: str, default: bool = True):
        return lambda _item: bool(self.get_config().get(key, default))

    def _adjust_offset(self, delta: int | None):
        def _handler(_icon, _item):
            cur = int(self.get_config().get("lyrics_offset_ms", 0))
            new_val = 0 if delta is None else cur + delta
            self.update_config({"lyrics_offset_ms": new_val})

        return _handler

    def _toggle_startup(self, _icon, _item) -> None:
        set_startup_enabled(not is_startup_enabled(), self.base_dir)

    def _quit_clicked(self, _icon, _item) -> None:
        self.stop()
        self.on_quit()

    def _run(self) -> None:
        theme_menu = pystray.Menu(
            pystray.MenuItem("Otomatik (Albüm Rengi)", self._set_theme("adaptive"), checked=self._is_theme("adaptive")),
            pystray.MenuItem("Klasik Şampanya", self._set_theme("champagne"), checked=self._is_theme("champagne")),
            pystray.MenuItem("Buz Mavisi", self._set_theme("cyber_ice"), checked=self._is_theme("cyber_ice")),
            pystray.MenuItem("Kızıl Gece", self._set_theme("crimson_night"), checked=self._is_theme("crimson_night")),
        )
        offset_menu = pystray.Menu(
            pystray.MenuItem("Erken (-250 ms)", self._adjust_offset(-250)),
            pystray.MenuItem("Sıfırla (0 ms)", self._adjust_offset(None)),
            pystray.MenuItem("Geç (+250 ms)", self._adjust_offset(250)),
        )
        menu = pystray.Menu(
            pystray.MenuItem("Ayarlar Paneli (S)", self._toggle_bool("show_settings", False), checked=self._is_bool("show_settings", False)),
            pystray.MenuItem("Tema", theme_menu),
            pystray.MenuItem("Söz Senkronu", offset_menu),
            pystray.MenuItem("Aurora Kuzey Işıkları", self._toggle_bool("show_aurora", True), checked=self._is_bool("show_aurora", True)),
            pystray.MenuItem("Alt Cam Ekolayzır", self._toggle_bool("show_equalizer", True), checked=self._is_bool("show_equalizer", True)),
            pystray.MenuItem("Hava Durumu Rozeti", self._toggle_bool("show_weather", True), checked=self._is_bool("show_weather", True)),
            pystray.MenuItem("Odak / Pomodoro (P)", self._toggle_bool("show_pomodoro", False), checked=self._is_bool("show_pomodoro", False)),
            pystray.MenuItem("Türkçe Söz Çevirisi", self._toggle_bool("auto_translate", True), checked=self._is_bool("auto_translate", True)),
            pystray.MenuItem("HUD Telemetri (H)", self._toggle_bool("show_hud", True), checked=self._is_bool("show_hud", True)),
            pystray.MenuItem("3D Galaksi (N)", self._toggle_bool("show_nebula", True), checked=self._is_bool("show_nebula", True)),
            pystray.MenuItem("Manyetik Parçacık Fiziği", self._toggle_bool("magnetic_particles", True), checked=self._is_bool("magnetic_particles", True)),
            pystray.MenuItem("Auto-Eco (Oyun Modu)", self._toggle_bool("auto_eco", True), checked=self._is_bool("auto_eco", True)),
            pystray.MenuItem("Efektleri Duraklat (Ctrl+Alt+N)", self._toggle_bool("paused_visuals", False), checked=self._is_bool("paused_visuals", False)),
            pystray.MenuItem("Çoklu Monitör (Yeniden Başlat)", self._toggle_bool("multi_monitor", False), checked=self._is_bool("multi_monitor", False)),
            pystray.MenuItem("Windows ile Başlat", self._toggle_startup, checked=lambda _item: is_startup_enabled()),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Çıkış", self._quit_clicked),
        )
        self._icon = pystray.Icon("NightConstellation", _create_tray_icon(), "Night Constellation", menu)
        self._icon.run()
