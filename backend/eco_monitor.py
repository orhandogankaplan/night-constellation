"""Detects fullscreen foreground apps/games on Windows for Auto-Eco mode."""

from __future__ import annotations

import ctypes
import sys

if sys.platform == "win32":
    from ctypes import wintypes

    user32 = ctypes.windll.user32
    SM_CXSCREEN = 0
    SM_CYSCREEN = 1


def is_fullscreen_app_active() -> bool:
    """Return True if a non-desktop foreground window covers the full primary monitor."""
    if sys.platform != "win32":
        return False
    try:
        hwnd = user32.GetForegroundWindow()
        if not hwnd:
            return False

        cls_buf = ctypes.create_unicode_buffer(64)
        user32.GetClassNameW(hwnd, cls_buf, 64)
        cls_name = cls_buf.value
        if cls_name in ("Progman", "WorkerW", "Shell_TrayWnd", "Shell_SecondaryTrayWnd"):
            return False

        title_buf = ctypes.create_unicode_buffer(128)
        user32.GetWindowTextW(hwnd, title_buf, 128)
        if title_buf.value == "Night Constellation":
            return False

        rect = wintypes.RECT()
        if not user32.GetWindowRect(hwnd, ctypes.byref(rect)):
            return False

        sw = user32.GetSystemMetrics(SM_CXSCREEN)
        sh = user32.GetSystemMetrics(SM_CYSCREEN)
        return (
            rect.left <= 0
            and rect.top <= 0
            and rect.right >= sw
            and rect.bottom >= sh
        )
    except Exception:
        return False
