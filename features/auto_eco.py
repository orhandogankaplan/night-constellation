import ctypes
from ctypes import wintypes
import os
import threading
import time

user32 = ctypes.windll.user32
psapi = ctypes.windll.psapi

PROCESS_QUERY_INFORMATION = 0x0400
PROCESS_VM_READ = 0x0010


class RECT(ctypes.Structure):
    _fields_ = [
        ("left", ctypes.c_long),
        ("top", ctypes.c_long),
        ("right", ctypes.c_long),
        ("bottom", ctypes.c_long),
    ]


class AutoEcoMonitor:
    def __init__(self, ctx, poll_interval: float = 1.0) -> None:
        self.ctx = ctx
        self.poll_interval = poll_interval
        self._stop_event = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()

    @staticmethod
    def _get_foreground_process_name() -> tuple[str, RECT]:
        hwnd = user32.GetForegroundWindow()
        rect = RECT()
        if not hwnd:
            return "", rect
        user32.GetWindowRect(hwnd, ctypes.byref(rect))
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        if not pid.value:
            return "", rect

        h_proc = user32.OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, False, pid.value)
        if not h_proc:
            return "", rect
        try:
            buf = ctypes.create_unicode_buffer(260)
            if psapi.GetModuleBaseNameW(h_proc, None, buf, 260) > 0:
                return os.path.basename(buf.value).lower(), rect
        finally:
            ctypes.windll.kernel32.CloseHandle(h_proc)
        return "", rect

    @staticmethod
    def _is_fullscreen(rect: RECT) -> bool:
        screen_w = user32.GetSystemMetrics(0)
        screen_h = user32.GetSystemMetrics(1)
        w = rect.right - rect.left
        h = rect.bottom - rect.top
        return w >= screen_w and h >= screen_h and rect.left <= 0 and rect.top <= 0

    def _run(self) -> None:
        while not self._stop_event.is_set():
            with self.ctx.lock:
                enabled = self.ctx.settings.auto_eco_enabled
                games = {g.lower() for g in self.ctx.settings.monitored_games}

            if not enabled:
                with self.ctx.lock:
                    self.ctx.state.auto_eco_active = False
                    self.ctx.state.eco_reason = ""
                time.sleep(self.poll_interval)
                continue

            proc_name, rect = self._get_foreground_process_name()
            fullscreen = self._is_fullscreen(rect)
            matched_game = proc_name in games

            eco_on = matched_game or (fullscreen and proc_name not in {"explorer.exe", "python.exe", "pythonw.exe"})
            reason = f"Oyun algılandı: {proc_name}" if matched_game else ("Tam ekran uygulama" if eco_on else "")

            with self.ctx.lock:
                self.ctx.state.auto_eco_active = eco_on
                self.ctx.state.eco_reason = reason

            time.sleep(self.poll_interval)
