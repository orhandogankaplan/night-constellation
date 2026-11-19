"""Real-time Windows WASAPI Loopback audio spectrum analyzer with auto-gain."""

from __future__ import annotations

import sys
import threading
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
    """Captures system loopback audio on Windows and computes a 32-band AGC-normalized FFT spectrum."""

    def __init__(self, num_bands: int = 32) -> None:
        self.num_bands = num_bands
        self._lock = threading.Lock()
        self._bands: List[float] = [0.0] * num_bands
        self._bass: float = 0.0
        self._energy: float = 0.0
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

            while not self._stop_event.is_set():
                raw = stream.read(chunk, exception_on_overflow=False)
                samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32)
                if channels > 1:
                    samples = samples.reshape(-1, channels).mean(axis=1)
                if len(samples) != chunk:
                    continue

                samples = (samples / 32768.0) * window
                fft = np.abs(np.fft.rfft(samples))
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

                new_bands = [
                    min(1.0, float(np.sqrt(v / running_peak))) for v in raw_bands
                ]

                bass_raw = float(np.max(new_bands[:6])) if new_bands else 0.0
                energy = float(np.mean(new_bands))

                with self._lock:
                    for i in range(self.num_bands):
                        self._bands[i] = self._bands[i] * 0.35 + new_bands[i] * 0.65
                    # Fast attack, smooth decay for punchy bass swells
                    if bass_raw > self._bass:
                        self._bass = self._bass * 0.25 + bass_raw * 0.75
                    else:
                        self._bass = self._bass * 0.72 + bass_raw * 0.28
                    self._energy = self._energy * 0.45 + energy * 0.55

            stream.stop_stream()
            stream.close()
            p.terminate()
        except Exception:
            self._active = False

    def get_spectrum(self) -> dict:
        with self._lock:
            return {
                "live": self._active,
                "bands": list(self._bands),
                "bass": self._bass,
                "energy": self._energy,
            }
