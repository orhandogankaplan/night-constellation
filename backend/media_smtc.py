"""Windows SMTC (System Media Transport Controls) reader & controller."""

from __future__ import annotations

import asyncio
import base64
import datetime as dt
import sys
import threading
from dataclasses import dataclass, asdict
from typing import Optional

SMTC_AVAILABLE = False
if sys.platform == "win32":
    try:
        from winrt.windows.media.control import (
            GlobalSystemMediaTransportControlsSessionManager as SessionManager,
            GlobalSystemMediaTransportControlsSessionPlaybackStatus as PlaybackStatus,
        )
        from winrt.windows.storage.streams import DataReader, Buffer, InputStreamOptions

        SMTC_AVAILABLE = True
    except Exception:
        SMTC_AVAILABLE = False


@dataclass
class MediaState:
    active: bool = False
    playing: bool = False
    title: str = ""
    artist: str = ""
    album: str = ""
    duration_ms: int = 0
    position_ms: int = 0
    thumbnail: str = ""
    track_id: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


class WindowsMediaMonitor:
    """Polls Windows SMTC on a background asyncio loop and exposes thread-safe state."""

    def __init__(self, poll_interval: float = 0.35) -> None:
        self.poll_interval = poll_interval
        self._lock = threading.Lock()
        self._state = MediaState()
        self._last_thumb_key = ""
        self._last_thumb_b64 = ""
        self._last_updated_utc: Optional[dt.datetime] = None
        self._base_position_ms: int = 0
        self._stop_event = threading.Event()
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._thread: Optional[threading.Thread] = None

    def start(self) -> None:
        if not SMTC_AVAILABLE or self._thread is not None:
            return
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._loop and self._loop.is_running():
            self._loop.call_soon_threadsafe(self._loop.stop)

    def _run_loop(self) -> None:
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        try:
            self._loop.run_until_complete(self._poll_forever())
        except Exception:
            pass
        finally:
            self._loop.close()

    async def _poll_forever(self) -> None:
        manager = await SessionManager.request_async()
        while not self._stop_event.is_set():
            try:
                session = manager.get_current_session()
                if session is None:
                    with self._lock:
                        self._state = MediaState(active=False)
                else:
                    await self._read_session(session)
            except Exception:
                pass
            await asyncio.sleep(self.poll_interval)

    async def _read_session(self, session) -> None:
        props = await session.try_get_media_properties_async()
        playback = session.get_playback_info()
        timeline = session.get_timeline_properties()

        title = (props.title or "").strip() if props else ""
        artist = (props.artist or "").strip() if props else ""
        album = (props.album_title or "").strip() if props else ""

        if not title:
            with self._lock:
                self._state = MediaState(active=False)
            return

        is_playing = (
            playback is not None
            and playback.playback_status == PlaybackStatus.PLAYING
        )

        duration_ms = 0
        position_ms = 0
        last_updated = None

        if timeline is not None:
            try:
                end_td = timeline.end_time
                pos_td = timeline.position
                duration_ms = max(0, int(end_td.total_seconds() * 1000))
                position_ms = max(0, int(pos_td.total_seconds() * 1000))
                if timeline.last_updated_time is not None:
                    last_updated = timeline.last_updated_time
                    if last_updated.tzinfo is None:
                        last_updated = last_updated.replace(tzinfo=dt.timezone.utc)
            except Exception:
                pass

        thumb_key = f"{artist}::{album}::{title}"
        thumb_b64 = self._last_thumb_b64
        if thumb_key != self._last_thumb_key:
            thumb_b64 = await self._read_thumbnail(props)
            self._last_thumb_key = thumb_key
            self._last_thumb_b64 = thumb_b64

        with self._lock:
            self._base_position_ms = position_ms
            self._last_updated_utc = last_updated or dt.datetime.now(dt.timezone.utc)
            self._state = MediaState(
                active=True,
                playing=is_playing,
                title=title,
                artist=artist,
                album=album,
                duration_ms=duration_ms,
                position_ms=position_ms,
                thumbnail=thumb_b64,
                track_id=thumb_key,
            )

    async def _read_thumbnail(self, props) -> str:
        if not props or not props.thumbnail:
            return ""
        try:
            stream = await props.thumbnail.open_read_async()
            size = int(stream.size)
            if size <= 0 or size > 4_000_000:
                return ""
            buf = Buffer(size)
            await stream.read_async(buf, size, InputStreamOptions.NONE)
            reader = DataReader.from_buffer(buf)
            raw = bytearray(size)
            reader.read_bytes(raw)
            encoded = base64.b64encode(bytes(raw)).decode("ascii")
            return f"data:image/jpeg;base64,{encoded}"
        except Exception:
            return ""

    def get_state(self) -> dict:
        with self._lock:
            state = MediaState(**asdict(self._state))
            if state.active and state.playing and self._last_updated_utc is not None:
                elapsed = (
                    dt.datetime.now(dt.timezone.utc) - self._last_updated_utc
                ).total_seconds() * 1000.0
                if 0 <= elapsed < 30000:
                    pos = int(self._base_position_ms + elapsed)
                    if state.duration_ms > 0:
                        pos = min(pos, state.duration_ms)
                    state.position_ms = pos
            return state.to_dict()

    def _dispatch_control(self, action: str) -> bool:
        if not SMTC_AVAILABLE or self._loop is None:
            return False

        async def _run() -> None:
            manager = await SessionManager.request_async()
            session = manager.get_current_session()
            if session is None:
                return
            if action == "play_pause":
                await session.try_toggle_play_pause_async()
            elif action == "next":
                await session.try_skip_next_async()
            elif action == "prev":
                await session.try_skip_previous_async()

        try:
            asyncio.run_coroutine_threadsafe(_run(), self._loop)
            return True
        except Exception:
            return False

    def play_pause(self) -> bool:
        return self._dispatch_control("play_pause")

    def next_track(self) -> bool:
        return self._dispatch_control("next")

    def previous_track(self) -> bool:
        return self._dispatch_control("prev")
