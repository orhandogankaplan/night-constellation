"""Synced lyrics fetcher using LRCLIB API + plainLyrics fallback + local .lrc + disk cache."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import List, Dict, Any, Optional

import requests

LRC_LINE_RE = re.compile(r"\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\](.*)")
WORD_TIME_RE = re.compile(r"<(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?>")


def _to_ms(minutes: str, seconds: str, frac: Optional[str]) -> int:
    m = int(minutes)
    s = int(seconds)
    ms = 0
    if frac:
        ms = int(frac.ljust(3, "0")[:3])
    return (m * 60 + s) * 1000 + ms


def _clean_query_text(text: str) -> str:
    cleaned = re.sub(r"\([^)]*\)|\[[^\]]*\]", "", text or "")
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" -–—")
    return cleaned


def parse_lrc(lrc_text: str) -> List[Dict[str, Any]]:
    """Parse LRC text into a list of timed lines, each containing timed words."""
    raw_lines: List[Dict[str, Any]] = []
    for line in lrc_text.splitlines():
        line = line.strip()
        if not line:
            continue
        match = LRC_LINE_RE.match(line)
        if not match:
            continue
        start_ms = _to_ms(match.group(1), match.group(2), match.group(3))
        content = match.group(4).strip()
        if not content:
            continue

        words: List[Dict[str, Any]] = []
        if WORD_TIME_RE.search(content):
            parts = WORD_TIME_RE.split(content)
            idx = 1
            while idx + 3 < len(parts):
                w_ms = _to_ms(parts[idx], parts[idx + 1], parts[idx + 2])
                w_text = parts[idx + 3].strip()
                if w_text:
                    for token in w_text.split():
                        words.append({"text": token, "time_ms": w_ms})
                idx += 4
        else:
            for token in content.split():
                words.append({"text": token, "time_ms": None})

        if words:
            raw_lines.append({"time_ms": start_ms, "text": WORD_TIME_RE.sub("", content).strip(), "words": words})

    raw_lines.sort(key=lambda item: item["time_ms"])

    for i, item in enumerate(raw_lines):
        start_ms = item["time_ms"]
        if i + 1 < len(raw_lines):
            next_ms = raw_lines[i + 1]["time_ms"]
        else:
            next_ms = start_ms + max(2500, len(item["words"]) * 420)
        line_dur = max(600, min(next_ms - start_ms, max(1200, len(item["words"]) * 750)))
        item["end_ms"] = start_ms + line_dur

        words = item["words"]
        if any(w["time_ms"] is None for w in words):
            step = line_dur / max(1, len(words))
            for wi, w in enumerate(words):
                w["time_ms"] = int(start_ms + wi * step)

    return raw_lines


def distribute_plain_lyrics(plain_text: str, duration_ms: int = 0) -> List[Dict[str, Any]]:
    """Convert plain untimed lyrics into evenly paced constellation lines."""
    lines = [ln.strip() for ln in plain_text.splitlines() if ln.strip()]
    if not lines:
        return []
    total_ms = duration_ms if duration_ms > 20000 else max(120000, len(lines) * 3800)
    intro_ms = min(8000, int(total_ms * 0.05))
    usable_ms = max(20000, total_ms - intro_ms * 2)
    per_line = usable_ms / len(lines)

    result: List[Dict[str, Any]] = []
    for idx, text in enumerate(lines):
        start_ms = int(intro_ms + idx * per_line)
        end_ms = int(start_ms + per_line * 0.9)
        tokens = text.split()
        step = (end_ms - start_ms) / max(1, len(tokens))
        words = [{"text": tok, "time_ms": int(start_ms + wi * step)} for wi, tok in enumerate(tokens)]
        if words:
            result.append({"time_ms": start_ms, "end_ms": end_ms, "text": text, "words": words})
    return result


class LyricsClient:
    """Fetches and caches synced LRC lyrics from LRCLIB or local ./lyrics folder."""

    def __init__(self, local_dir: Optional[Path] = None) -> None:
        self.cache_dir = Path.home() / ".night-constellation" / "cache"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.local_dir = local_dir
        self._mem_cache: Dict[str, List[Dict[str, Any]]] = {}

    def _cache_key(self, title: str, artist: str) -> str:
        raw = f"{artist.lower().strip()}::{title.lower().strip()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:20]

    def get_lyrics(self, title: str, artist: str, album: str = "", duration_ms: int = 0) -> List[Dict[str, Any]]:
        if not title:
            return []
        key = self._cache_key(title, artist)
        if key in self._mem_cache:
            return self._mem_cache[key]

        # 1. Check local ./lyrics/*.lrc
        if self.local_dir and self.local_dir.exists():
            safe_both = re.sub(r'[\\/:*?"<>|]', "", f"{artist} - {title}").strip()
            safe_title = re.sub(r'[\\/:*?"<>|]', "", title).strip()
            for candidate in [
                self.local_dir / (safe_both + ".lrc"),
                self.local_dir / (safe_title + ".lrc"),
            ]:
                if candidate.exists():
                    parsed = parse_lrc(candidate.read_text(encoding="utf-8", errors="ignore"))
                    if parsed:
                        self._mem_cache[key] = parsed
                        return parsed

        # 2. Check disk cache (only use if non-empty, so previously missed tracks retry)
        cache_file = self.cache_dir / f"{key}.json"
        if cache_file.exists():
            try:
                data = json.loads(cache_file.read_text(encoding="utf-8"))
                if data:
                    self._mem_cache[key] = data
                    return data
            except Exception:
                pass

        # 3. Query LRCLIB (synced first, plainLyrics fallback)
        synced, plain = self._fetch_lrclib(title, artist, album, duration_ms)
        parsed = parse_lrc(synced) if synced else []
        if not parsed and plain:
            parsed = distribute_plain_lyrics(plain, duration_ms)

        self._mem_cache[key] = parsed
        if parsed:
            try:
                cache_file.write_text(json.dumps(parsed, ensure_ascii=False), encoding="utf-8")
            except Exception:
                pass
        return parsed

    def _fetch_lrclib(self, title: str, artist: str, album: str, duration_ms: int) -> tuple[str, str]:
        headers = {"User-Agent": "NightConstellation/1.1 (https://github.com/night-constellation)"}
        clean_title = _clean_query_text(title)
        clean_artist = _clean_query_text(artist)

        params: Dict[str, Any] = {"track_name": clean_title or title, "artist_name": clean_artist or artist}
        if album:
            params["album_name"] = album
        if duration_ms > 0:
            params["duration"] = round(duration_ms / 1000)

        plain_fallback = ""
        try:
            resp = requests.get("https://lrclib.net/api/get", params=params, headers=headers, timeout=5.0)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("syncedLyrics"):
                    return (data["syncedLyrics"], "")
                if data.get("plainLyrics"):
                    plain_fallback = data["plainLyrics"]
        except Exception:
            pass

        for q in [f"{clean_artist} {clean_title}".strip(), clean_title]:
            if not q:
                continue
            try:
                resp = requests.get(
                    "https://lrclib.net/api/search",
                    params={"q": q},
                    headers=headers,
                    timeout=5.0,
                )
                if resp.status_code == 200:
                    results = resp.json()
                    for item in results:
                        if item.get("syncedLyrics"):
                            return (item["syncedLyrics"], "")
                        if not plain_fallback and item.get("plainLyrics"):
                            plain_fallback = item["plainLyrics"]
            except Exception:
                pass

        return ("", plain_fallback)
