/**
 * Night Constellation App Controller
 * Connects to Python pywebview bridge (or runs standalone Demo Mode in browser).
 * Handles MacBook clock styles, Vinyl spin, Ambient Blur, 3D Cover Flow, Weather, Pomodoro & HUD.
 */

(function () {
  const ambientBackdrop = document.getElementById("ambient-backdrop");
  const greetingLabel = document.getElementById("greeting-label");
  const dateLabel = document.getElementById("date-label");
  const timeLabel = document.getElementById("time-label");
  const weatherBadge = document.getElementById("weather-badge");
  const pomodoroPill = document.getElementById("pomodoro-pill");
  const idleStage = document.getElementById("idle-stage");
  const mediaPill = document.getElementById("media-pill");
  const albumArt = document.getElementById("album-art");
  const albumFallback = document.getElementById("album-fallback");
  const centerAlbumArt = document.getElementById("center-album-art");
  const centerAlbumFallback = document.getElementById("center-album-fallback");

  const coverPrev = document.getElementById("cover-prev");
  const prevAlbumArt = document.getElementById("prev-album-art");
  const prevAlbumFallback = document.getElementById("prev-album-fallback");
  const prevTrackLabel = document.getElementById("prev-track-label");

  const coverNext = document.getElementById("cover-next");
  const nextAlbumArt = document.getElementById("next-album-art");
  const nextAlbumFallback = document.getElementById("next-album-fallback");
  const nextTrackLabel = document.getElementById("next-track-label");

  const trackTitle = document.getElementById("track-title");
  const liveBars = document.getElementById("live-bars");
  const trackArtist = document.getElementById("track-artist");
  const timeElapsed = document.getElementById("time-elapsed");
  const timeTotal = document.getElementById("time-total");
  const progressFill = document.getElementById("progress-fill");
  const btnPrev = document.getElementById("btn-prev");
  const btnPlay = document.getElementById("btn-play");
  const btnNext = document.getElementById("btn-next");
  const btnDemo = document.getElementById("btn-demo");
  const btnSettings = document.getElementById("btn-settings");
  const btnExit = document.getElementById("btn-exit");

  const settingsPanel = document.getElementById("settings-panel");
  const btnCloseSettings = document.getElementById("btn-close-settings");
  const statsBanner = document.getElementById("stats-banner");
  const setClockStyle = document.getElementById("set-clock-style");
  const setClockSize = document.getElementById("set-clock-size");
  const setTheme = document.getElementById("set-theme");
  const setParticleMode = document.getElementById("set-particle-mode");
  const setGlow = document.getElementById("set-glow");
  const setMotto = document.getElementById("set-motto");
  const setVinyl = document.getElementById("set-vinyl");
  const setAmbient = document.getElementById("set-ambient");
  const setOrbital = document.getElementById("set-orbital");
  const setAurora = document.getElementById("set-aurora");
  const setEqualizer = document.getElementById("set-equalizer");
  const setWeather = document.getElementById("set-weather");
  const setPomodoro = document.getElementById("set-pomodoro");
  const setNebula = document.getElementById("set-nebula");
  const setMagnetic = document.getElementById("set-magnetic");
  const setHud = document.getElementById("set-hud");
  const setTranslate = document.getElementById("set-translate");
  const setAmber = document.getElementById("set-amber");
  const setEco = document.getElementById("set-eco");

  const hudBox = document.getElementById("hud-telemetry");
  const hudDot = document.getElementById("hud-beat-dot");
  const hudBpm = document.getElementById("hud-bpm");
  const hudCpu = document.getElementById("hud-cpu");
  const hudRam = document.getElementById("hud-ram");
  const hudBatWrap = document.getElementById("hud-bat-wrap");
  const hudBat = document.getElementById("hud-bat");
  const hudScope = document.getElementById("hud-scope");
  const hudCtx = hudScope ? hudScope.getContext("2d") : null;

  const renderer = new window.NightConstellationRenderer(
    document.getElementById("bg-canvas"),
    document.getElementById("constellation-canvas"),
    document.getElementById("radial-canvas"),
    document.getElementById("edge-aura"),
    document.getElementById("center-art-ring")
  );

  let config = {
    locale: "tr-TR",
    hour_24: true,
    theme: "adaptive",
    clock_style: "macbook",
    clock_size: 88,
    particle_mode: "stars",
    custom_motto: "",
    vinyl_spin: true,
    ambient_blur: true,
    orbital_rings: true,
    night_amber: false,
    show_aurora: true,
    show_equalizer: true,
    show_weather: true,
    show_pomodoro: false,
    show_hud: true,
    show_nebula: true,
    magnetic_particles: true,
    auto_translate: true,
    auto_eco: true,
    show_settings: false,
    paused_visuals: false,
    show_media_card: true,
    show_radial_visualizer: true,
    edge_glow_intensity: 1.0,
    smoky_waves_opacity: 0.65,
    auto_demo_when_idle: false,
    screensaver_mouse_deadzone_px: 18,
    lyrics_offset_ms: 0,
  };

  let screensaverMode = false;
  let demoMode = false;
  let demoStartPerf = performance.now();
  let lastThumbAnalyzed = "";
  let beatFlashUntil = 0;

  let currentTrackSnapshot = null;
  let prevTrackSnapshot = null;
  let nextTrackSnapshot = null;
  let recentTracks = [];

  let pomoSecondsLeft = 25 * 60;
  let pomoRunning = false;
  let pomoLastTick = performance.now();

  let latestState = {
    media: { active: false, playing: false, title: "", artist: "", duration_ms: 0, position_ms: 0, thumbnail: "", track_id: "" },
    audio: { live: false, bands: new Array(32).fill(0), waveform: new Array(32).fill(0), bass: 0, energy: 0, beat: false, bpm: 0 },
    telemetry: { cpu: 0, ram: 0, battery: null, charging: false },
    weather: { ready: false },
    recent_tracks: [],
    stats: { total_tracks: 0, top_artist: "-" },
    eco_sleep: false,
    lyrics: [],
  };

  const THEME_ORDER = ["adaptive", "champagne", "cyber_ice", "crimson_night"];

  const DEMO_LYRICS = [
    {
      time_ms: 800,
      end_ms: 4600,
      tr: "Bu gece rüyalarımın bana anlatacağı gece olabilir",
      words: [
        { text: "This", time_ms: 800 },
        { text: "night", time_ms: 1400 },
        { text: "may", time_ms: 2000 },
        { text: "be", time_ms: 2400 },
        { text: "the", time_ms: 2800 },
        { text: "night", time_ms: 3300 },
      ],
    },
    {
      time_ms: 4600,
      end_ms: 8200,
      tr: "ki hayallerim gerçeği görmeme izin verir",
      words: [
        { text: "that", time_ms: 4600 },
        { text: "my", time_ms: 5100 },
        { text: "dreams", time_ms: 5700 },
        { text: "might", time_ms: 6400 },
        { text: "let", time_ms: 7000 },
        { text: "me", time_ms: 7400 },
        { text: "know", time_ms: 7800 },
      ],
    },
    {
      time_ms: 8400,
      end_ms: 12200,
      tr: "Tüm yıldızlar giderek yaklaşıyor",
      words: [
        { text: "All", time_ms: 8400 },
        { text: "the", time_ms: 8900 },
        { text: "stars", time_ms: 9500 },
        { text: "approach", time_ms: 10400 },
        { text: "closer", time_ms: 11300 },
      ],
    },
  ];
  const DEMO_DURATION = 13000;

  function fmtMs(ms) {
    const totalSec = Math.max(0, Math.floor((ms || 0) / 1000));
    const m = Math.floor(totalSec / 60);
    const s = String(totalSec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function extractDominantColor(dataUri) {
    if (!dataUri) {
      renderer.setAdaptiveColor(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 24;
        c.height = 24;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, 24, 24);
        const data = ctx.getImageData(0, 0, 24, 24).data;
        let bestR = 255;
        let bestG = 250;
        let bestB = 236;
        let bestScore = -1;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          const lum = (r + g + b) / 3;
          const score = sat * 2.2 + (lum > 45 && lum < 235 ? 0.6 : 0);
          if (score > bestScore && lum > 35) {
            bestScore = score;
            bestR = Math.min(255, Math.round(r * 0.75 + 255 * 0.25));
            bestG = Math.min(255, Math.round(g * 0.75 + 255 * 0.25));
            bestB = Math.min(255, Math.round(b * 0.75 + 255 * 0.25));
          }
        }
        renderer.setAdaptiveColor([bestR, bestG, bestB]);
      } catch (_) {
        renderer.setAdaptiveColor(null);
      }
    };
    img.src = dataUri;
  }

  function applyConfigToUI() {
    document.documentElement.style.setProperty("--clock-px", `${config.clock_size || 88}px`);
    if (timeLabel) {
      timeLabel.classList.remove("style-macbook", "style-serif", "style-neon");
      timeLabel.classList.add(`style-${config.clock_style || "macbook"}`);
    }
    if (settingsPanel) {
      if (config.show_settings && !screensaverMode) settingsPanel.classList.remove("hidden");
      else settingsPanel.classList.add("hidden");
    }
    if (setClockStyle) setClockStyle.value = config.clock_style || "macbook";
    if (setClockSize) setClockSize.value = String(config.clock_size || 88);
    if (setTheme) setTheme.value = config.theme || "adaptive";
    if (setParticleMode) setParticleMode.value = config.particle_mode || "stars";
    if (setGlow) setGlow.value = String(config.edge_glow_intensity ?? 1.0);
    if (setMotto && document.activeElement !== setMotto) setMotto.value = config.custom_motto || "";
    if (setVinyl) setVinyl.checked = Boolean(config.vinyl_spin ?? true);
    if (setAmbient) setAmbient.checked = Boolean(config.ambient_blur ?? true);
    if (setOrbital) setOrbital.checked = Boolean(config.orbital_rings ?? true);
    if (setAurora) setAurora.checked = Boolean(config.show_aurora ?? true);
    if (setEqualizer) setEqualizer.checked = Boolean(config.show_equalizer ?? true);
    if (setWeather) setWeather.checked = Boolean(config.show_weather ?? true);
    if (setPomodoro) setPomodoro.checked = Boolean(config.show_pomodoro ?? false);
    if (setNebula) setNebula.checked = Boolean(config.show_nebula ?? true);
    if (setMagnetic) setMagnetic.checked = Boolean(config.magnetic_particles ?? true);
    if (setHud) setHud.checked = Boolean(config.show_hud ?? true);
    if (setTranslate) setTranslate.checked = Boolean(config.auto_translate ?? true);
    if (setAmber) setAmber.checked = Boolean(config.night_amber ?? false);
    if (setEco) setEco.checked = Boolean(config.auto_eco ?? true);
  }

  function pushConfigUpdate(patch) {
    config = { ...config, ...patch };
    applyConfigToUI();
    window.pywebview?.api?.update_config(patch);
  }

  function updateClock() {
    const now = new Date();
    const locale = config.locale || "tr-TR";
    const hr = now.getHours();
    let autoGreeting = "İyi geceler";
    if (hr >= 6 && hr < 12) autoGreeting = "Günaydın";
    else if (hr >= 12 && hr < 18) autoGreeting = "İyi günler";
    else if (hr >= 18 && hr < 23) autoGreeting = "İyi akşamlar";

    if (greetingLabel) {
      greetingLabel.textContent = (config.custom_motto || "").trim() || autoGreeting;
    }

    const dateStr = now.toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const timeStr = now.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: !config.hour_24,
    });
    dateLabel.textContent = dateStr;
    timeLabel.textContent = timeStr;
  }

  function updateWeatherAndPomodoro(perfNow, weather, stats) {
    if (weatherBadge) {
      if (config.show_weather && weather?.ready) {
        weatherBadge.textContent = `${weather.icon} ${weather.temp}°C · ${weather.city || weather.desc}`;
        weatherBadge.classList.remove("hidden");
      } else {
        weatherBadge.classList.add("hidden");
      }
    }

    if (statsBanner && stats) {
      statsBanner.textContent = `Dinlenen: ${stats.total_tracks || 0} şarkı · Favori: ${stats.top_artist || "-"}`;
    }

    if (pomodoroPill) {
      if (config.show_pomodoro && !screensaverMode) {
        pomodoroPill.classList.remove("hidden");
        if (pomoRunning && perfNow - pomoLastTick >= 1000) {
          const elapsedSec = Math.floor((perfNow - pomoLastTick) / 1000);
          pomoLastTick += elapsedSec * 1000;
          pomoSecondsLeft = Math.max(0, pomoSecondsLeft - elapsedSec);
          if (pomoSecondsLeft === 0) pomoRunning = false;
        } else if (!pomoRunning) {
          pomoLastTick = perfNow;
        }
        const mm = String(Math.floor(pomoSecondsLeft / 60)).padStart(2, "0");
        const ss = String(pomoSecondsLeft % 60).padStart(2, "0");
        pomodoroPill.textContent = `${pomoRunning ? "⏳" : "🍅"} ${mm}:${ss}`;
      } else {
        pomodoroPill.classList.add("hidden");
      }
    }
  }

  function toggleDemo(force) {
    demoMode = typeof force === "boolean" ? force : !demoMode;
    demoStartPerf = performance.now();
    btnDemo.textContent = `Demo: ${demoMode ? "On" : "Off"}`;
  }

  function setupScreensaverExit() {
    if (!screensaverMode) return;
    document.body.classList.add("screensaver-mode");
    const deadzone = config.screensaver_mouse_deadzone_px || 18;
    let startX = null;
    let startY = null;
    const armedAt = performance.now() + 700;

    const exitNow = () => {
      if (window.pywebview?.api?.quit_app) {
        window.pywebview.api.quit_app();
      }
    };

    window.addEventListener("mousemove", (e) => {
      if (performance.now() < armedAt) return;
      if (startX === null) {
        startX = e.clientX;
        startY = e.clientY;
        return;
      }
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (dist > deadzone) exitNow();
    });

    window.addEventListener("mousedown", () => {
      if (performance.now() >= armedAt) exitNow();
    });

    window.addEventListener("keydown", () => {
      if (performance.now() >= armedAt) exitNow();
    });
  }

  function setupControls() {
    btnPrev.addEventListener("click", () => window.pywebview?.api?.previous_track());
    btnPlay.addEventListener("click", () => window.pywebview?.api?.play_pause());
    btnNext.addEventListener("click", () => window.pywebview?.api?.next_track());
    if (coverPrev) coverPrev.addEventListener("click", () => window.pywebview?.api?.previous_track());
    if (coverNext) coverNext.addEventListener("click", () => window.pywebview?.api?.next_track());

    if (pomodoroPill) {
      pomodoroPill.addEventListener("click", () => {
        pomoRunning = !pomoRunning;
        pomoLastTick = performance.now();
      });
      pomodoroPill.addEventListener("dblclick", () => {
        pomoRunning = false;
        pomoSecondsLeft = 25 * 60;
      });
    }

    btnDemo.addEventListener("click", () => toggleDemo());
    if (btnSettings) btnSettings.addEventListener("click", () => pushConfigUpdate({ show_settings: !config.show_settings }));
    if (btnCloseSettings) btnCloseSettings.addEventListener("click", () => pushConfigUpdate({ show_settings: false }));
    btnExit.addEventListener("click", () => window.pywebview?.api?.quit_app());

    if (setClockStyle) setClockStyle.addEventListener("change", (e) => pushConfigUpdate({ clock_style: e.target.value }));
    if (setClockSize) setClockSize.addEventListener("input", (e) => pushConfigUpdate({ clock_size: Number(e.target.value) }));
    if (setTheme) setTheme.addEventListener("change", (e) => pushConfigUpdate({ theme: e.target.value }));
    if (setParticleMode) setParticleMode.addEventListener("change", (e) => pushConfigUpdate({ particle_mode: e.target.value }));
    if (setGlow) setGlow.addEventListener("input", (e) => pushConfigUpdate({ edge_glow_intensity: Number(e.target.value) }));
    if (setMotto) setMotto.addEventListener("input", (e) => pushConfigUpdate({ custom_motto: e.target.value }));
    if (setVinyl) setVinyl.addEventListener("change", (e) => pushConfigUpdate({ vinyl_spin: e.target.checked }));
    if (setAmbient) setAmbient.addEventListener("change", (e) => pushConfigUpdate({ ambient_blur: e.target.checked }));
    if (setOrbital) setOrbital.addEventListener("change", (e) => pushConfigUpdate({ orbital_rings: e.target.checked }));
    if (setAurora) setAurora.addEventListener("change", (e) => pushConfigUpdate({ show_aurora: e.target.checked }));
    if (setEqualizer) setEqualizer.addEventListener("change", (e) => pushConfigUpdate({ show_equalizer: e.target.checked }));
    if (setWeather) setWeather.addEventListener("change", (e) => pushConfigUpdate({ show_weather: e.target.checked }));
    if (setPomodoro) setPomodoro.addEventListener("change", (e) => pushConfigUpdate({ show_pomodoro: e.target.checked }));
    if (setNebula) setNebula.addEventListener("change", (e) => pushConfigUpdate({ show_nebula: e.target.checked }));
    if (setMagnetic) setMagnetic.addEventListener("change", (e) => pushConfigUpdate({ magnetic_particles: e.target.checked }));
    if (setHud) setHud.addEventListener("change", (e) => pushConfigUpdate({ show_hud: e.target.checked }));
    if (setTranslate) setTranslate.addEventListener("change", (e) => pushConfigUpdate({ auto_translate: e.target.checked }));
    if (setAmber) setAmber.addEventListener("change", (e) => pushConfigUpdate({ night_amber: e.target.checked }));
    if (setEco) setEco.addEventListener("change", (e) => pushConfigUpdate({ auto_eco: e.target.checked }));

    window.addEventListener("keydown", (e) => {
      if (screensaverMode) return;
      if (document.activeElement && document.activeElement.tagName === "INPUT") return;
      if (e.key === "d" || e.key === "D") toggleDemo();
      else if (e.key === "s" || e.key === "S") pushConfigUpdate({ show_settings: !config.show_settings });
      else if (e.key === "p" || e.key === "P") {
        if (!config.show_pomodoro) pushConfigUpdate({ show_pomodoro: true });
        pomoRunning = !pomoRunning;
        pomoLastTick = performance.now();
      } else if (e.key === "t" || e.key === "T") {
        const idx = THEME_ORDER.indexOf(config.theme || "adaptive");
        pushConfigUpdate({ theme: THEME_ORDER[(idx + 1) % THEME_ORDER.length] });
      } else if (e.key === "h" || e.key === "H") pushConfigUpdate({ show_hud: !config.show_hud });
      else if (e.key === "n" || e.key === "N") pushConfigUpdate({ show_nebula: !config.show_nebula });
      else if (e.key === "[") pushConfigUpdate({ lyrics_offset_ms: (config.lyrics_offset_ms || 0) - 250 });
      else if (e.key === "]") pushConfigUpdate({ lyrics_offset_ms: (config.lyrics_offset_ms || 0) + 250 });
      else if (e.key === " ") {
        e.preventDefault();
        window.pywebview?.api?.play_pause();
      } else if (e.key === "ArrowRight") window.pywebview?.api?.next_track();
      else if (e.key === "ArrowLeft") window.pywebview?.api?.previous_track();
      else if (e.key === "F11") window.pywebview?.api?.toggle_fullscreen();
      else if (e.key === "Escape" || e.key === "q" || e.key === "Q") {
        window.pywebview?.api?.quit_app();
      }
    });
  }

  function updateCoverFlow(media) {
    if (!media.active) {
      coverPrev?.classList.add("hidden");
      coverNext?.classList.add("hidden");
      return;
    }

    if (currentTrackSnapshot && currentTrackSnapshot.track_id !== media.track_id) {
      if (nextTrackSnapshot && nextTrackSnapshot.track_id === media.track_id) {
        prevTrackSnapshot = currentTrackSnapshot;
        nextTrackSnapshot = null;
      } else if (prevTrackSnapshot && prevTrackSnapshot.track_id === media.track_id) {
        nextTrackSnapshot = currentTrackSnapshot;
        prevTrackSnapshot = null;
      } else {
        prevTrackSnapshot = currentTrackSnapshot;
      }
    }
    currentTrackSnapshot = {
      track_id: media.track_id,
      title: media.title,
      thumbnail: media.thumbnail,
    };

    const otherRecent = (recentTracks || []).filter((t) => t.track_id !== media.track_id);
    const prevDisplay = prevTrackSnapshot || otherRecent[0] || null;
    const nextDisplay = nextTrackSnapshot || otherRecent[1] || otherRecent[0] || null;

    coverPrev.classList.remove("hidden");
    coverNext.classList.remove("hidden");

    if (prevDisplay?.thumbnail) {
      if (prevAlbumArt.src !== prevDisplay.thumbnail) prevAlbumArt.src = prevDisplay.thumbnail;
      prevAlbumArt.classList.remove("hidden");
      prevAlbumFallback.classList.add("hidden");
      prevTrackLabel.textContent = prevDisplay.title || "Önceki";
    } else {
      prevAlbumArt.classList.add("hidden");
      prevAlbumFallback.classList.remove("hidden");
      prevTrackLabel.textContent = prevDisplay?.title || "Önceki";
    }

    if (nextDisplay?.thumbnail) {
      if (nextAlbumArt.src !== nextDisplay.thumbnail) nextAlbumArt.src = nextDisplay.thumbnail;
      nextAlbumArt.classList.remove("hidden");
      nextAlbumFallback.classList.add("hidden");
      nextTrackLabel.textContent = nextDisplay.title || "Sonraki";
    } else {
      nextAlbumArt.classList.add("hidden");
      nextAlbumFallback.classList.remove("hidden");
      nextTrackLabel.textContent = nextDisplay?.title || "Sonraki";
    }
  }

  function updateMediaUI(media) {
    updateCoverFlow(media);

    // Ambient Blur Backdrop
    if (ambientBackdrop) {
      if (config.ambient_blur && media.active && media.thumbnail) {
        const bgUrl = `url("${media.thumbnail}")`;
        if (ambientBackdrop.style.backgroundImage !== bgUrl) {
          ambientBackdrop.style.backgroundImage = bgUrl;
        }
        ambientBackdrop.classList.add("visible");
      } else {
        ambientBackdrop.classList.remove("visible");
      }
    }

    // Center Vinyl / Cover Art
    if (media.active && media.thumbnail) {
      if (centerAlbumArt.src !== media.thumbnail) {
        centerAlbumArt.src = media.thumbnail;
      }
      if (lastThumbAnalyzed !== media.thumbnail) {
        lastThumbAnalyzed = media.thumbnail;
        extractDominantColor(media.thumbnail);
      }
      centerAlbumArt.classList.remove("hidden");
      centerAlbumFallback.classList.add("hidden");
      if (config.vinyl_spin) {
        centerAlbumArt.classList.add("vinyl-spinning");
        if (media.playing) centerAlbumArt.classList.remove("vinyl-paused");
        else centerAlbumArt.classList.add("vinyl-paused");
      } else {
        centerAlbumArt.classList.remove("vinyl-spinning", "vinyl-paused");
      }
    } else {
      if (lastThumbAnalyzed !== "") {
        lastThumbAnalyzed = "";
        renderer.setAdaptiveColor(null);
      }
      centerAlbumArt.classList.add("hidden");
      centerAlbumFallback.classList.remove("hidden");
    }

    if (!config.show_media_card || !media.active) {
      mediaPill.classList.add("hidden");
      return;
    }
    mediaPill.classList.remove("hidden");
    trackTitle.textContent = media.title || "Unknown Track";
    trackArtist.textContent = media.artist || "Unknown Artist";
    btnPlay.innerHTML = media.playing ? "&#10074;&#10074;" : "&#9654;";

    if (liveBars) {
      if (media.playing) liveBars.classList.remove("paused");
      else liveBars.classList.add("paused");
    }

    if (media.thumbnail) {
      if (albumArt.src !== media.thumbnail) {
        albumArt.src = media.thumbnail;
      }
      albumArt.classList.remove("hidden");
      albumFallback.classList.add("hidden");
    } else {
      albumArt.classList.add("hidden");
      albumFallback.classList.remove("hidden");
    }

    if (timeElapsed) timeElapsed.textContent = fmtMs(media.position_ms);
    if (timeTotal) timeTotal.textContent = fmtMs(media.duration_ms);
    const pct = media.duration_ms > 0 ? Math.min(100, (media.position_ms / media.duration_ms) * 100) : 0;
    progressFill.style.width = `${pct.toFixed(1)}%`;
  }

  function updateHud(perfNow, audio, telemetry) {
    if (!hudBox) return;
    if (!config.show_hud || screensaverMode) {
      hudBox.classList.add("hidden");
      return;
    }
    hudBox.classList.remove("hidden");

    if (audio.beat) {
      beatFlashUntil = perfNow + 120;
    }
    if (hudDot) {
      if (perfNow < beatFlashUntil) hudDot.classList.add("pulse");
      else hudDot.classList.remove("pulse");
    }
    if (hudBpm) hudBpm.textContent = audio.bpm > 0 ? `${audio.bpm} BPM` : "-- BPM";
    if (hudCpu) hudCpu.textContent = `CPU ${telemetry?.cpu ?? 0}%`;
    if (hudRam) hudRam.textContent = `RAM ${telemetry?.ram ?? 0}%`;

    if (hudBatWrap && hudBat) {
      if (telemetry?.battery !== null && telemetry?.battery !== undefined) {
        hudBat.textContent = `${telemetry.charging ? "⚡" : "🔋"} ${telemetry.battery}%`;
        hudBatWrap.classList.remove("hidden");
      } else {
        hudBatWrap.classList.add("hidden");
      }
    }

    if (hudCtx && hudScope) {
      const w = hudScope.width;
      const h = hudScope.height;
      const wave = audio.waveform || [];
      hudCtx.clearRect(0, 0, w, h);
      hudCtx.strokeStyle = "rgba(255, 255, 255, 0.78)";
      hudCtx.lineWidth = 1.4;
      hudCtx.beginPath();
      const count = wave.length || 32;
      for (let i = 0; i < count; i++) {
        const x = (i / (count - 1)) * w;
        const y = h * 0.5 + (wave[i] || 0) * (h * 0.42);
        if (i === 0) hudCtx.moveTo(x, y);
        else hudCtx.lineTo(x, y);
      }
      hudCtx.stroke();
    }
  }

  async function pollBackend() {
    if (window.pywebview?.api?.get_state) {
      try {
        latestState = await window.pywebview.api.get_state();
        if (latestState.recent_tracks) recentTracks = latestState.recent_tracks;
        if (latestState.config) {
          config = { ...config, ...latestState.config };
          applyConfigToUI();
        }
      } catch (_) {}
    }
    setTimeout(pollBackend, latestState.eco_sleep ? 400 : 45);
  }

  function frame(perfNow) {
    if (latestState.eco_sleep) {
      requestAnimationFrame(frame);
      return;
    }

    const nowSec = perfNow / 1000;
    updateClock();
    updateWeatherAndPomodoro(perfNow, latestState.weather, latestState.stats);

    let media = latestState.media;
    let lyrics = latestState.lyrics;
    let audio = latestState.audio;

    if (demoMode) {
      const demoPos = (perfNow - demoStartPerf) % DEMO_DURATION;
      media = {
        active: true,
        playing: true,
        title: "All The Stars (Demo)",
        artist: "Night Constellation",
        duration_ms: DEMO_DURATION,
        position_ms: demoPos,
        thumbnail: "",
        track_id: "demo::all_the_stars",
      };
      lyrics = DEMO_LYRICS;
      const synthBands = new Array(32).fill(0).map((_, i) =>
        0.28 + 0.45 * Math.abs(Math.sin(nowSec * 3.4 + i * 0.35))
      );
      const synthWave = new Array(32).fill(0).map((_, i) =>
        0.65 * Math.sin(nowSec * 8 + i * 0.45)
      );
      audio = { live: false, bands: synthBands, waveform: synthWave, bass: 0.48 + 0.25 * Math.sin(nowSec * 4.2), energy: 0.55, beat: Math.sin(nowSec * 4.2) > 0.96, bpm: 120 };
    }

    const posMs = (media.position_ms || 0) + (config.lyrics_offset_ms || 0);
    const hasLyrics = Boolean(media.active && media.playing && lyrics && lyrics.length > 0 && posMs >= lyrics[0].time_ms - 600);

    if (hasLyrics) {
      renderer.setLyrics(media.track_id, lyrics);
      idleStage.classList.add("lyrics-active");
    } else {
      idleStage.classList.remove("lyrics-active");
    }

    updateMediaUI(media);
    updateHud(perfNow, audio, latestState.telemetry);
    renderer.render(nowSec, posMs, media.playing, hasLyrics, audio, config);

    requestAnimationFrame(frame);
  }

  async function init() {
    setupControls();

    if (window.pywebview?.api?.get_init_config) {
      try {
        const initData = await window.pywebview.api.get_init_config();
        config = { ...config, ...(initData.config || {}) };
        screensaverMode = Boolean(initData.screensaver_mode);
        if (initData.recent_tracks) recentTracks = initData.recent_tracks;
        if (initData.demo_mode) toggleDemo(true);
      } catch (_) {}
    } else {
      toggleDemo(true);
    }

    applyConfigToUI();
    setupScreensaverExit();
    pollBackend();
    requestAnimationFrame(frame);
  }

  if (window.pywebview) {
    init();
  } else {
    window.addEventListener("pywebviewready", init);
    setTimeout(() => {
      if (!window.pywebview) init();
    }, 150);
  }
})();
