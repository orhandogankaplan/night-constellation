"""Win32 helpers for frameless fullscreen, multi-monitor Live Wallpaper, and global hotkey."""

from __future__ import annotations

import ctypes
import sys
import threading
import time
from typing import Callable

if sys.platform == "win32":
    from ctypes import wintypes

    user32 = ctypes.windll.user32

    try:
        user32.SetProcessDpiAwarenessContext(ctypes.c_void_p(-4))
    except Exception:
        pass

    GWL_STYLE = -16
    GWL_EXSTYLE = -20
    WS_CAPTION = 0x00C00000
    WS_THICKFRAME = 0x00040000
    WS_MINIMIZEBOX = 0x00020000
    WS_MAXIMIZEBOX = 0x00010000
    WS_SYSMENU = 0x00080000
    WS_CHILD = 0x40000000
    WS_EX_TOOLWINDOW = 0x00000080
    WS_EX_NOACTIVATE = 0x08000000

    SWP_NOACTIVATE = 0x0010
    SWP_NOZORDER = 0x0004
    SWP_FRAMECHANGED = 0x0020
    SWP_SHOWWINDOW = 0x0040
    SMTO_NORMAL = 0x0000

    SM_CXSCREEN = 0
    SM_CYSCREEN = 1
    SM_XVIRTUALSCREEN = 76
    SM_YVIRTUALSCREEN = 77
    SM_CXVIRTUALSCREEN = 78
    SM_CYVIRTUALSCREEN = 79

    MOD_ALT = 0x0001
    MOD_CONTROL = 0x0002
    WM_HOTKEY = 0x0312

    WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)


def _find_window_by_title(title: str, timeout_sec: float = 8.0) -> int:
    if sys.platform != "win32":
        return 0
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        hwnd = user32.FindWindowW(None, title)
        if hwnd:
            return int(hwnd)
        time.sleep(0.08)
    return 0


def _get_screen_bounds(multi_monitor: bool) -> tuple[int, int, int, int]:
    if multi_monitor:
        x = user32.GetSystemMetrics(SM_XVIRTUALSCREEN)
        y = user32.GetSystemMetrics(SM_YVIRTUALSCREEN)
        w = user32.GetSystemMetrics(SM_CXVIRTUALSCREEN)
        h = user32.GetSystemMetrics(SM_CYVIRTUALSCREEN)
        if w > 0 and h > 0:
            return (x, y, w, h)
    return (0, 0, user32.GetSystemMetrics(SM_CXSCREEN), user32.GetSystemMetrics(SM_CYSCREEN))


def strip_window_chrome(title: str) -> bool:
    """Remove Windows title bar and resize borders for true edge-to-edge display."""
    if sys.platform != "win32":
        return False
    hwnd = _find_window_by_title(title)
    if not hwnd:
        return False

    style = user32.GetWindowLongW(hwnd, GWL_STYLE)
    style &= ~(WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU)
    user32.SetWindowLongW(hwnd, GWL_STYLE, style)

    w = user32.GetSystemMetrics(SM_CXSCREEN)
    h = user32.GetSystemMetrics(SM_CYSCREEN)
    user32.SetWindowPos(hwnd, 0, 0, 0, w, h, SWP_NOZORDER | SWP_FRAMECHANGED | SWP_SHOWWINDOW)
    return True


def attach_as_wallpaper(title: str, multi_monitor: bool = False) -> bool:
    """Attach the window behind desktop icons on Windows 10 & Windows 11 (24H2/26200+)."""
    if sys.platform != "win32":
        return False

    hwnd = _find_window_by_title(title)
    if not hwnd:
        return False

    time.sleep(0.35)

    progman = user32.FindWindowW("Progman", None)
    if not progman:
        return False

    result = ctypes.c_ulong(0)
    user32.SendMessageTimeoutW(progman, 0x052C, 0x0D, 0x01, SMTO_NORMAL, 1000, ctypes.byref(result))
    user32.SendMessageTimeoutW(progman, 0x052C, 0, 0, SMTO_NORMAL, 1000, ctypes.byref(result))

    workerw_holder = [0]
    shell_view_holder = [0]

    def _enum_cb(top_hwnd: int, _lparam: int) -> bool:
        sv = user32.FindWindowExW(top_hwnd, 0, "SHELLDLL_DefView", None)
        if sv:
            shell_view_holder[0] = int(sv)
            next_worker = user32.FindWindowExW(0, top_hwnd, "WorkerW", None)
            if next_worker:
                workerw_holder[0] = int(next_worker)
                return False
        return True

    user32.EnumWindows(WNDENUMPROC(_enum_cb), 0)

    progman_worker = user32.FindWindowExW(progman, 0, "WorkerW", None)
    progman_sv = user32.FindWindowExW(progman, 0, "SHELLDLL_DefView", None)

    style = user32.GetWindowLongW(hwnd, GWL_STYLE)
    style &= ~(WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU)
    style |= WS_CHILD
    user32.SetWindowLongW(hwnd, GWL_STYLE, style)

    ex_style = user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
    ex_style |= WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE
    user32.SetWindowLongW(hwnd, GWL_EXSTYLE, ex_style)

    x, y, w, h = _get_screen_bounds(multi_monitor)

    if workerw_holder[0]:
        user32.SetParent(hwnd, workerw_holder[0])
        user32.SetWindowPos(hwnd, 0, x, y, w, h, SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED | SWP_SHOWWINDOW)
    elif progman_worker:
        user32.SetParent(hwnd, progman_worker)
        user32.SetWindowPos(hwnd, 0, x, y, w, h, SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED | SWP_SHOWWINDOW)
    else:
        user32.SetParent(hwnd, progman)
        insert_after = progman_sv or shell_view_holder[0] or 1
        user32.SetWindowPos(hwnd, insert_after, x, y, w, h, SWP_NOACTIVATE | SWP_FRAMECHANGED | SWP_SHOWWINDOW)

    return True


def start_global_hotkey(on_trigger: Callable[[], None]) -> None:
    """Register Ctrl + Alt + N global hotkey to toggle visuals on/off from any app."""
    if sys.platform != "win32":
        return

    def _loop() -> None:
        hotkey_id = 1
        vk_n = 0x4E
        if not user32.RegisterHotKey(None, hotkey_id, MOD_CONTROL | MOD_ALT, vk_n):
            return
        msg = wintypes.MSG()
        try:
            while user32.GetMessageW(ctypes.byref(msg), None, 0, 0) != 0:
                if msg.message == WM_HOTKEY and msg.wParam == hotkey_id:
                    on_trigger()
        finally:
            user32.UnregisterHotKey(None, hotkey_id)

    threading.Thread(target=_loop, daemon=True).start()
