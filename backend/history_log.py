"""Lightweight local listening history logger with thumbnail caching & stats."""

from __future__ import annotations

import datetime as dt
import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Dict, List


class ListeningHistory:
    """Saves played tracks to ~/.night-constellation/history.json and caches thumbnails."""

    def __init__(self, max_entries: int = 250) -> None:
        self.base_dir = Path.home() / ".night-constellation"
        self.path = self.base_dir / "history.json"
        self.thumb_dir = self.base_dir / "thumbs"
        self.thumb_dir.mkdir(parents=True, exist_ok=True)
        self.max_entries = max_entries
        self._last_logged_id = ""

    def _thumb_key(self, track_id: str) -> str:
        return hashlib.sha256(track_id.encode("utf-8")).hexdigest()[:16]

    def record(self, track_id: str, title: str, artist: str, bpm: int = 0, thumbnail: str = "") -> None:
        if not track_id or track_id == self._last_logged_id or not title:
            return
        self._last_logged_id = track_id

        t_key = self._thumb_key(track_id)
        if thumbnail:
            try:
                (self.thumb_dir / f"{t_key}.txt").write_text(thumbnail, encoding="utf-8")
            except Exception:
                pass

        entries = self._load()
        entries = [e for e in entries if e.get("track_id") != track_id]
        entries.insert(
            0,
            {
                "track_id": track_id,
                "ts": dt.datetime.now().isoformat(timespec="seconds"),
                "title": title,
                "artist": artist,
                "bpm": bpm,
                "thumb_key": t_key,
            },
        )
        entries = entries[: self.max_entries]
        try:
            self.path.write_text(json.dumps(entries, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception:
            pass

    def get_recent_with_thumbs(self, limit: int = 6) -> List[Dict]:
        entries = self._load()[:limit]
        out: List[Dict] = []
        for e in entries:
            item = dict(e)
            t_key = item.get("thumb_key") or (self._thumb_key(item.get("track_id", "")) if item.get("track_id") else "")
            thumb = ""
            if t_key:
                t_file = self.thumb_dir / f"{t_key}.txt"
                if t_file.exists():
                    try:
                        thumb = t_file.read_text(encoding="utf-8")
                    except Exception:
                        pass
            item["thumbnail"] = thumb
            out.append(item)
        return out

    def get_stats(self) -> Dict:
        entries = self._load()
        artists = [e.get("artist", "") for e in entries if e.get("artist")]
        top_artist = Counter(artists).most_common(1)[0][0] if artists else "-"
        return {"total_tracks": len(entries), "top_artist": top_artist}

    def _load(self) -> List[Dict]:
        if not self.path.exists():
            return []
        try:
            return json.loads(self.path.read_text(encoding="utf-8"))
        except Exception:
            return []
