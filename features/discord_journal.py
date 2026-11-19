from datetime import datetime, timezone
import json
import os
import threading
import time

HISTORY_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "listening_history.jsonl")


class ListeningJournal:
    def __init__(self, path: str = HISTORY_PATH) -> None:
        self.path = path
        self._last_logged_key: str | None = None

    def record_track(self, title: str, artist: str, bpm: float) -> None:
        key = f"{artist.strip().lower()}::{title.strip().lower()}"
        if not title or key == self._last_logged_key:
            return
        self._last_logged_key = key

        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "artist": artist,
            "title": title,
            "bpm": round(bpm, 1),
        }
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")


class DiscordPresenceBridge:
    def __init__(self, ctx, client_id: str | None = None, rpc_client=None) -> None:
        self.ctx = ctx
        self.client_id = client_id
        self._rpc = rpc_client
        self.journal = ListeningJournal()
        self._stop_event = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()

    def _run(self) -> None:
        while not self._stop_event.is_set():
            with self.ctx.lock:
                enabled = self.ctx.settings.discord_rpc_enabled
                eco = self.ctx.state.auto_eco_active
                title = self.ctx.state.title
                artist = self.ctx.state.artist
                bpm = self.ctx.state.bpm

            if enabled and not eco:
                self.journal.record_track(title, artist, bpm)
                if self._rpc is not None:
                    try:
                        self._rpc.update(
                            details=title,
                            state=f"{artist} • {bpm:.0f} BPM",
                        )
                    except Exception:
                        pass
            elif self._rpc is not None:
                try:
                    self._rpc.clear()
                except Exception:
                    pass

            time.sleep(3.0)
