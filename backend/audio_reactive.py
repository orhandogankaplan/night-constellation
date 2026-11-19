"""Real-time Windows WASAPI Loopback audio spectrum, beat/BPM & waveform analyzer."""

from __future__ import annotations

import sys
import threading
import time
from collections import deque
from typing import List

import numpy as np

AUDIO_AVAILABLE = False
if sys.platform == "win32":
    try:
        import pyaudiowpatch as pyaudio

        AUDIO_AVAILABLE = True
    except Exception:
        AUDIO_AVAILABLE = False


class AudioReactiveAnalyzer:
    """Captures system loopback audio on Windows and computes 32-band FFT, waveform, beat & BPM."""

    def __init__(self, num_bands: int = 32) -> None:
        self.num_bands = num_bands
        self._lock = threading.Lock()
        self._bands: List[float] = [0.0] * num_bands
        self._waveform: List[float] = [0.0] * 32
        self._bass: float = 0.0
        self._energy: float = 0.0
        self._beat: bool = False
        self._bpm: int = 0
        self._active: bool = False
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if not AUDIO_AVAILABLE or self._thread is not None:
            return
        self._thread = threading.Thread(target=self._capture_loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()

    def _capture_loop(self) -> None:
        try:
            p = pyaudio.PyAudio()
            wasapi_info = p.get_host_api_info_by_type(pyaudio.paWASAPI)
            default_speakers = p.get_device_info_by_index(wasapi_info["defaultOutputDevice"])

            if not default_speakers.get("isLoopbackDevice", False):
                for loopback in p.get_loopback_device_info_generator():
                    if default_speakers["name"] in loopback["name"]:
                        default_speakers = loopback
                        break

            rate = int(default_speakers["defaultSampleRate"])
            channels = max(1, int(default_speakers["maxInputChannels"]))
            chunk = 1024

            stream = p.open(
                format=pyaudio.paInt16,
                channels=channels,
                rate=rate,
                frames_per_buffer=chunk,
                input=True,
                input_device_index=default_speakers["index"],
            )
            self._active = True

            window = np.hanning(chunk)
            running_peak = 0.25
            bass_history: deque[float] = deque(maxlen=24)
            beat_times: deque[float] = deque(maxlen=10)
            last_beat_ts = 0.0

            while not self._stop_event.is_set():
                raw = stream.read(chunk, exception_on_overflow=False)
                samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32)
                if channels > 1:
                    samples = samples.reshape(-1, channels).mean(axis=1)
                if len(samples) != chunk:
                    continue

                norm_samples = samples / 32768.0
                # Downsample 32-point oscilloscope trace
                step = chunk // 32
                wave_pts = [float(np.clip(norm_samples[i * step] * 2.5, -1.0, 1.0)) for i in range(32)]

                fft = np.abs(np.fft.rfft(norm_samples * window))
                freqs = np.fft.rfftfreq(chunk, 1.0 / rate)

                band_edges = np.geomspace(35, min(12000, rate / 2 - 1), self.num_bands + 1)
                raw_bands = []
                for i in range(self.num_bands):
                    mask = (freqs >= band_edges[i]) & (freqs < band_edges[i + 1])
                    val = float(np.mean(fft[mask])) if np.any(mask) else 0.0
                    raw_bands.append(val)

                frame_peak = max(raw_bands) if raw_bands else 0.0
                if frame_peak > running_peak:
                    running_peak = running_peak * 0.4 + frame_peak * 0.6
                else:
                    running_peak = max(0.08, running_peak * 0.992)

                new_bands = [min(1.0, float(np.sqrt(v / running_peak))) for v in raw_bands]

                bass_raw = float(np.max(new_bands[:6])) if new_bands else 0.0
                energy = float(np.mean(new_bands))

                # Real-time beat / onset detection
                avg_bass = float(np.mean(bass_history)) if bass_history else bass_raw
                bass_history.append(bass_raw)
                now = time.monotonic()
                is_beat = False
                if bass_raw > max(0.42, avg_bass * 1.28) and (now - last_beat_ts) > 0.28:
                    is_beat = True
                    last_beat_ts = now
                    beat_times.append(now)

                bpm = 0
                if len(beat_times) >= 4:
                    intervals = [
                        beat_times[i] - beat_times[i - 1]
                        for i in range(1, len(beat_times))
                        if 0.30 <= (beat_times[i] - beat_times[i - 1]) <= 1.25
                    ]
                    if intervals:
                        med = float(np.median(intervals))
                        bpm = int(round(max(60.0, min(185.0, 60.0 / med))))

                with self._lock:
                    for i in range(self.num_bands):
                        self._bands[i] = self._bands[i] * 0.35 + new_bands[i] * 0.65
                    self._waveform = wave_pts
                    if bass_raw > self._bass:
                        self._bass = self._bass * 0.25 + bass_raw * 0.75
                    else:
                        self._bass = self._bass * 0.72 + bass_raw * 0.28
                    self._energy = self._energy * 0.45 + energy * 0.55
                    if is_beat:
                        self._beat = True
                    if bpm > 0:
                        self._bpm = bpm

            stream.stop_stream()
            stream.close()
            p.terminate()
        except Exception:
            self._active = False

    def get_spectrum(self) -> dict:
        with self._lock:
            beat_fired = self._beat
            self._beat = False
            return {
                "live": self._active,
                "bands": list(self._bands),
                "waveform": list(self._waveform),
                "bass": self._bass,
                "energy": self._energy,
                "beat": beat_fired,
                "bpm": self._bpm,
            }
