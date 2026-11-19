"""Zero-dependency Windows CPU, RAM & Battery telemetry reader using ctypes."""

from __future__ import annotations

import ctypes
import sys

if sys.platform == "win32":
    from ctypes import wintypes

    class FILETIME(ctypes.Structure):
        _fields_ = [("dwLowDateTime", wintypes.DWORD), ("dwHighDateTime", wintypes.DWORD)]

    class MEMORYSTATUSEX(ctypes.Structure):
        _fields_ = [
            ("dwLength", wintypes.DWORD),
            ("dwMemoryLoad", wintypes.DWORD),
            ("ullTotalPhys", ctypes.c_uint64),
            ("ullAvailPhys", ctypes.c_uint64),
            ("ullTotalPageFile", ctypes.c_uint64),
            ("ullAvailPageFile", ctypes.c_uint64),
            ("ullTotalVirtual", ctypes.c_uint64),
            ("ullAvailVirtual", ctypes.c_uint64),
            ("sullAvailExtendedVirtual", ctypes.c_uint64),
        ]

    class SYSTEM_POWER_STATUS(ctypes.Structure):
        _fields_ = [
            ("ACLineStatus", ctypes.c_byte),
            ("BatteryFlag", ctypes.c_byte),
            ("BatteryLifePercent", ctypes.c_byte),
            ("SystemStatusFlag", ctypes.c_byte),
            ("BatteryLifeTime", wintypes.DWORD),
            ("BatteryFullLifeTime", wintypes.DWORD),
        ]

    kernel32 = ctypes.windll.kernel32


class SystemTelemetry:
    """Computes CPU %, RAM %, and Battery/Charging status without external dependencies."""

    def __init__(self) -> None:
        self._prev_idle = 0
        self._prev_total = 0

    def read(self) -> dict:
        if sys.platform != "win32":
            return {"cpu": 0, "ram": 0, "battery": None, "charging": False}
        bat, chg = self._read_battery()
        return {"cpu": self._read_cpu(), "ram": self._read_ram(), "battery": bat, "charging": chg}

    def _ft_to_int(self, ft: "FILETIME") -> int:
        return (ft.dwHighDateTime << 32) | ft.dwLowDateTime

    def _read_cpu(self) -> int:
        try:
            idle_ft = FILETIME()
            kernel_ft = FILETIME()
            user_ft = FILETIME()
            if not kernel32.GetSystemTimes(ctypes.byref(idle_ft), ctypes.byref(kernel_ft), ctypes.byref(user_ft)):
                return 0
            idle = self._ft_to_int(idle_ft)
            total = self._ft_to_int(kernel_ft) + self._ft_to_int(user_ft)
            d_idle = idle - self._prev_idle
            d_total = total - self._prev_total
            self._prev_idle = idle
            self._prev_total = total
            if d_total <= 0:
                return 0
            pct = int(round((1.0 - d_idle / d_total) * 100.0))
            return max(0, min(100, pct))
        except Exception:
            return 0

    def _read_ram(self) -> int:
        try:
            mem = MEMORYSTATUSEX()
            mem.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            if kernel32.GlobalMemoryStatusEx(ctypes.byref(mem)):
                return int(mem.dwMemoryLoad)
            return 0
        except Exception:
            return 0

    def _read_battery(self) -> tuple[int | None, bool]:
        try:
            sps = SYSTEM_POWER_STATUS()
            if kernel32.GetSystemPowerStatus(ctypes.byref(sps)):
                pct = int(sps.BatteryLifePercent)
                if pct <= 100:
                    return (pct, sps.ACLineStatus == 1)
            return (None, False)
        except Exception:
            return (None, False)
