from dataclasses import dataclass, field, asdict
import json
import os
import threading

CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config.json")


@dataclass
class AppSettings:
    clock_size: int = 44
    border_glow: float = 0.85
    bpm_sensitivity: float = 1.25
    magnetic_pull: float = 1.40
    particle_count: int = 160
    carousel_3d_enabled: bool = True
    lyrics_translation_enabled: bool = True
    auto_eco_enabled: bool = True
    discord_rpc_enabled: bool = True
    monitored_games: list[str] = field(
        default_factory=lambda: ["valorant.exe", "cs2.exe", "valorant-win64-shipping.exe"]
    )


@dataclass
class LiveState:
    title: str = "Bilinmeyen Parça"
    artist: str = "Sanatçı"
    prev_title: str = "Önceki Şarkı"
    next_title: str = "Sıradaki Şarkı"
    bpm: float = 120.0
    bass_energy: float = 0.0
    lyric_line: str = ""
    lyric_tr: str = ""
    auto_eco_active: bool = False
    eco_reason: str = ""
    mouse_x: float = 0.5
    mouse_y: float = 0.5
    mouse_vx: float = 0.0
    mouse_vy: float = 0.0


class SharedContext:
    def __init__(self) -> None:
        self.lock = threading.RLock()
        self.settings = self.load_settings()
        self.state = LiveState()

    def load_settings(self) -> AppSettings:
        if os.path.exists(CONFIG_PATH):
            try:
                with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return AppSettings(**{k: v for k, v in data.items() if k in AppSettings.__dataclass_fields__})
            except Exception:
                pass
        return AppSettings()

    def save_settings(self) -> None:
        with self.lock:
            with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                json.dump(asdict(self.settings), f, ensure_ascii=False, indent=2)
