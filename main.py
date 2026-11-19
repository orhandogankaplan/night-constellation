"""Night Constellation — Windows Screensaver (.scr), Live Wallpaper & Desktop Music Skin."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import threading
from pathlib import Path
from typing import Any, Dict

import webview

from backend.audio_reactive import AudioReactiveAnalyzer
from backend.lyrics_client import LyricsClient
from backend.media_smtc import WindowsMediaMonitor
from backend.tray_manager import TrayManager
from backend.win_wallpaper import attach_as_wallpaper, strip_window_chrome


def get_base_dir() -> Path:
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS)  # type: ignore[attr-defined]
    return Path(__file__).resolve().parent


def get_config_path(base_dir: Path) -> Path:
    cfg = base_dir / "config.json"
    if cfg.exists():
        return cfg
    return Path.cwd() / "config.json"


def load_config(cfg_path: Path) -> Dict[str, Any]:
    try:
        return json.loads(cfg_path.read_text(encoding="utf-8"))
    except Exception:
        return {
            "locale": "tr-TR",
            "hour_24": True,
            "theme": "adaptive",
            "show_media_card": True,
            "show_radial_visualizer": True,
            "edge_glow_intensity": 1.0,
            "smoky_waves_opacity": 0.65,
            "auto_demo_when_idle": False,
            "screensaver_mouse_deadzone_px": 18,
            "lyrics_offset_ms": 0,
        }


class ApiBridge:
    """Exposed to JavaScript via window.pywebview.api."""

    def __init__(
        self,
        media: WindowsMediaMonitor,
        lyrics: LyricsClient,
        audio: AudioReactiveAnalyzer,
        config: Dict[str, Any],
        cfg_path: Path,
        screensaver_mode: bool,
        wallpaper_mode: bool,
        demo_mode: bool,
    ) -> None:
        self._media = media
        self._lyrics = lyrics
        self._audio = audio
        self._config = config
        self._cfg_path = cfg_path
        self._screensaver_mode = screensaver_mode
        self._wallpaper_mode = wallpaper_mode
        self._demo_mode = demo_mode
        self._window: webview.Window | None = None
        self._last_track_id = ""
        self._cached_lyrics: list = []
        self._lyrics_loading = False
        self._lock = threading.Lock()

    def attach_window(self, window: webview.Window) -> None:
        self._window = window

    def get_config_copy(self) -> Dict[str, Any]:
        with self._lock:
            return dict(self._config)

    def update_config(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            self._config.update(updates)
            snapshot = dict(self._config)
        try:
            self._cfg_path.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception:
            pass
        return snapshot

    def get_init_config(self) -> Dict[str, Any]:
        return {
            "config": self.get_config_copy(),
            "screensaver_mode": self._screensaver_mode,
            "wallpaper_mode": self._wallpaper_mode,
            "demo_mode": self._demo_mode,
        }

    def get_state(self) -> Dict[str, Any]:
        media_state = self._media.get_state()
        audio_state = self._audio.get_spectrum()

        track_id = media_state.get("track_id", "")
        if track_id and track_id != self._last_track_id and not self._lyrics_loading:
            self._last_track_id = track_id
            self._cached_lyrics = []
            self._lyrics_loading = True
            threading.Thread(
                target=self._fetch_lyrics_bg,
                args=(
                    media_state.get("title", ""),
                    media_state.get("artist", ""),
                    media_state.get("album", ""),
                    media_state.get("duration_ms", 0),
                    track_id,
                ),
                daemon=True,
            ).start()
        elif not track_id:
            self._last_track_id = ""
            self._cached_lyrics = []

        with self._lock:
            lyrics_copy = list(self._cached_lyrics)
            cfg_copy = dict(self._config)

        return {
            "media": media_state,
            "audio": audio_state,
            "lyrics": lyrics_copy,
            "config": cfg_copy,
        }

    def _fetch_lyrics_bg(self, title: str, artist: str, album: str, duration_ms: int, track_id: str) -> None:
        try:
            lines = self._lyrics.get_lyrics(title, artist, album, duration_ms)
            with self._lock:
                if self._last_track_id == track_id:
                    self._cached_lyrics = lines
        finally:
            self._lyrics_loading = False

    def play_pause(self) -> bool:
        return self._media.play_pause()

    def next_track(self) -> bool:
        return self._media.next_track()

    def previous_track(self) -> bool:
        return self._media.previous_track()

    def toggle_fullscreen(self) -> None:
        if self._window:
            self._window.toggle_fullscreen()

    def quit_app(self) -> None:
        if self._window:
            self._window.destroy()
        os._exit(0)


def parse_mode(argv: list[str]) -> tuple[str, bool]:
    """Handle Windows screensaver CLI flags (/s, /c, /p), --wallpaper, and --desktop."""
    lowered = [a.lower() for a in argv]
    for arg in lowered:
        if arg.startswith("/p") or arg.startswith("-p"):
            return ("preview", False)
        if arg.startswith("/c") or arg.startswith("-c"):
            return ("config", False)
        if arg.startswith("/s") or arg.startswith("-s"):
            return ("screensaver", False)

    parser = argparse.ArgumentParser(description="Night Constellation")
    parser.add_argument("--desktop", action="store_true", help="Run in interactive desktop mode")
    parser.add_argument("--wallpaper", action="store_true", help="Attach behind Windows desktop icons as live wallpaper")
    parser.add_argument("--demo", action="store_true", help="Start with built-in lyric constellation demo")
    args, _ = parser.parse_known_args(argv)
    if args.wallpaper:
        return ("wallpaper", args.demo)
    return ("desktop", args.demo)


def main() -> None:
    base_dir = get_base_dir()
    mode, demo_mode = parse_mode(sys.argv[1:])

    if mode == "preview":
        return

    cfg_path = get_config_path(base_dir)
    if mode == "config":
        if sys.platform == "win32" and cfg_path.exists():
            subprocess.Popen(["notepad.exe", str(cfg_path)])
        return

    config = load_config(cfg_path)
    screensaver_mode = mode == "screensaver"
    wallpaper_mode = mode == "wallpaper"

    media = WindowsMediaMonitor()
    lyrics = LyricsClient(local_dir=base_dir / "lyrics")
    audio = AudioReactiveAnalyzer()

    media.start()
    audio.start()

    bridge = ApiBridge(
        media=media,
        lyrics=lyrics,
        audio=audio,
        config=config,
        cfg_path=cfg_path,
        screensaver_mode=screensaver_mode,
        wallpaper_mode=wallpaper_mode,
        demo_mode=demo_mode,
    )

    tray = None
    if not screensaver_mode:
        tray = TrayManager(
            base_dir=base_dir,
            get_config=bridge.get_config_copy,
            update_config=bridge.update_config,
            on_quit=bridge.quit_app,
        )
        tray.start()

    window_title = "Night Constellation"
    html_path = (base_dir / "frontend" / "index.html").as_uri()
    window = webview.create_window(
        title=window_title,
        url=html_path,
        fullscreen=not wallpaper_mode,
        frameless=True,
        on_top=screensaver_mode,
        background_color="#040406",
        js_api=bridge,
    )
    bridge.attach_window(window)

    def _on_start() -> None:
        if wallpaper_mode:
            attach_as_wallpaper(window_title)
        else:
            strip_window_chrome(window_title)

    try:
        webview.start(func=_on_start, debug=False)
    finally:
        if tray:
            tray.stop()
        media.stop()
        audio.stop()


if __name__ == "__main__":
    main()
