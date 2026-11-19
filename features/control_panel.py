import tkinter as tk
from tkinter import ttk


class LiveControlCenter:
    def __init__(self, ctx) -> None:
        self.ctx = ctx
        self.root: tk.Toplevel | None = None

    def open_window(self, master: tk.Misc | None = None) -> None:
        if self.root is not None and self.root.winfo_exists():
            self.root.deiconify()
            self.root.lift()
            self.root.focus_force()
            return

        win = tk.Toplevel(master) if master else tk.Tk()
        self.root = win
        win.title("night-constellation • Canlı Kontrol Merkezi")
        win.geometry("390x470")
        win.configure(bg="#0d111a")
        win.resizable(False, False)

        with self.ctx.lock:
            s = self.ctx.settings

        def make_slider(label_text: str, from_: float, to_: float, initial: float, resolution: float, on_change):
            frame = tk.Frame(win, bg="#0d111a")
            frame.pack(fill="x", padx=18, pady=7)

            top = tk.Frame(frame, bg="#0d111a")
            top.pack(fill="x")

            tk.Label(top, text=label_text, bg="#0d111a", fg="#e6edf3", font=("Segoe UI", 10, "bold")).pack(side="left")
            val_lbl = tk.Label(top, text=f"{initial:.2f}" if resolution < 1 else f"{int(initial)}", bg="#0d111a", fg="#7ee787", font=("Segoe UI", 10))
            val_lbl.pack(side="right")

            def _cmd(val_str: str) -> None:
                val = float(val_str) if resolution < 1 else int(float(val_str))
                val_lbl.config(text=f"{val:.2f}" if resolution < 1 else f"{val}")
                on_change(val)
                self.ctx.save_settings()

            scale = tk.Scale(
                frame,
                from_=from_,
                to=to_,
                resolution=resolution,
                orient="horizontal",
                showvalue=False,
                bg="#161b22",
                fg="#58a6ff",
                highlightthickness=0,
                troughcolor="#21262d",
                activebackground="#58a6ff",
                command=_cmd,
            )
            scale.set(initial)
            scale.pack(fill="x", pady=(4, 0))

        def set_clock_size(v):
            with self.ctx.lock:
                self.ctx.settings.clock_size = int(v)

        def set_border_glow(v):
            with self.ctx.lock:
                self.ctx.settings.border_glow = float(v)

        def set_bpm_sens(v):
            with self.ctx.lock:
                self.ctx.settings.bpm_sensitivity = float(v)

        def set_mag_pull(v):
            with self.ctx.lock:
                self.ctx.settings.magnetic_pull = float(v)

        make_slider("Saat Boyutu", 24, 96, s.clock_size, 1, set_clock_size)
        make_slider("Kenar Parlaklığı", 0.1, 1.5, s.border_glow, 0.05, set_border_glow)
        make_slider("BPM Hassasiyeti", 0.3, 2.5, s.bpm_sensitivity, 0.05, set_bpm_sens)
        make_slider("Manyetik Çekim", 0.0, 3.0, s.magnetic_pull, 0.05, set_mag_pull)

        toggles = tk.Frame(win, bg="#0d111a")
        toggles.pack(fill="x", padx=18, pady=(10, 6))

        vars_map = {
            "3D Şarkı Rayı (Önceki/Sıradaki)": tk.BooleanVar(value=s.carousel_3d_enabled),
            "Anlık Türkçe Söz Çevirisi": tk.BooleanVar(value=s.lyrics_translation_enabled),
            "Auto-Eco (Oyun / Tam Ekran)": tk.BooleanVar(value=s.auto_eco_enabled),
            "Discord Rich Presence & Günlük": tk.BooleanVar(value=s.discord_rpc_enabled),
        }

        def sync_toggles() -> None:
            with self.ctx.lock:
                self.ctx.settings.carousel_3d_enabled = vars_map["3D Şarkı Rayı (Önceki/Sıradaki)"].get()
                self.ctx.settings.lyrics_translation_enabled = vars_map["Anlık Türkçe Söz Çevirisi"].get()
                self.ctx.settings.auto_eco_enabled = vars_map["Auto-Eco (Oyun / Tam Ekran)"].get()
                self.ctx.settings.discord_rpc_enabled = vars_map["Discord Rich Presence & Günlük"].get()
            self.ctx.save_settings()

        for text, var in vars_map.items():
            ttk.Checkbutton(toggles, text=text, variable=var, command=sync_toggles).pack(anchor="w", pady=3)
