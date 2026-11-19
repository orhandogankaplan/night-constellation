"""Lightweight weather badge fetcher using Open-Meteo (no API key required)."""

from __future__ import annotations

import threading
import time
from typing import Dict

import requests

WMO_TR = {
    0: ("Açık", "☀", "🌙"),
    1: ("Az Bulutlu", "🌤", "🌙"),
    2: ("Parçalı Bulutlu", "⛅", "☁"),
    3: ("Bulutlu", "☁", "☁"),
    45: ("Sisli", "🌫", "🌫"),
    48: ("Sisli", "🌫", "🌫"),
    51: ("Çiseleme", "🌦", "🌧"),
    61: ("Yağmurlu", "🌧", "🌧"),
    63: ("Yağmurlu", "🌧", "🌧"),
    71: ("Karlı", "❄", "❄"),
    80: ("Sağanak", "🌦", "🌧"),
    95: ("Fırtına", "⛈", "⛈"),
}


class WeatherService:
    """Polls Open-Meteo every 15 minutes on a background thread."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._data: Dict = {"ready": False, "temp": None, "desc": "", "icon": "", "city": ""}
        self._lat = 37.8715
        self._lon = 32.4846
        self._city = "Konya"
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread is not None:
            return
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()

    def get(self) -> Dict:
        with self._lock:
            return dict(self._data)

    def _detect_location(self) -> None:
        try:
            r = requests.get("https://ipapi.co/json/", timeout=4.0)
            if r.status_code == 200:
                j = r.json()
                if j.get("latitude") and j.get("longitude"):
                    self._lat = float(j["latitude"])
                    self._lon = float(j["longitude"])
                    self._city = str(j.get("city") or self._city)
        except Exception:
            pass

    def _loop(self) -> None:
        self._detect_location()
        while not self._stop.is_set():
            try:
                r = requests.get(
                    "https://api.open-meteo.com/v1/forecast",
                    params={
                        "latitude": self._lat,
                        "longitude": self._lon,
                        "current": "temperature_2m,weather_code,is_day",
                    },
                    timeout=5.0,
                )
                if r.status_code == 200:
                    cur = r.json().get("current", {})
                    temp = cur.get("temperature_2m")
                    code = int(cur.get("weather_code", 0))
                    is_day = int(cur.get("is_day", 1)) == 1
                    desc, day_ic, night_ic = WMO_TR.get(code, ("Açık", "☀", "🌙"))
                    with self._lock:
                        self._data = {
                            "ready": temp is not None,
                            "temp": round(float(temp)) if temp is not None else None,
                            "desc": desc,
                            "icon": day_ic if is_day else night_ic,
                            "city": self._city,
                        }
            except Exception:
                pass
            for _ in range(90):
                if self._stop.is_set():
                    return
                time.sleep(10)
