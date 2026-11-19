/**
 * Night Constellation App Controller
 * Connects to Python pywebview bridge (or runs standalone Demo Mode in browser).
 * Includes automatic album-art dominant color extraction and theme/offset hotkeys.
 */

(function () {
  const dateLabel = document.getElementById("date-label");
  const timeLabel = document.getElementById("time-label");
  const idleStage = document.getElementById("idle-stage");
  const mediaPill = document.getElementById("media-pill");
  const albumArt = document.getElementById("album-art");
  const albumFallback = document.getElementById("album-fallback");
  const centerAlbumArt = document.getElementById("center-album-art");
  const centerAlbumFallback = document.getElementById("center-album-fallback");
  const trackTitle = document.getElementById("track-title");
  const trackArtist = document.getElementById("track-artist");
  const progressFill = document.getElementById("progress-fill");
  const btnPrev = document.getElementById("btn-prev");
  const btnPlay = document.getElementById("btn-play");
  const btnNext = document.getElementById("btn-next");
  const btnDemo = document.getElementById("btn-demo");
  const btnExit = document.getElementById("btn-exit");

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

  let latestState = {
    media: { active: false, playing: false, title: "", artist: "", duration_ms: 0, position_ms: 0, thumbnail: "", track_id: "" },
    audio: { live: false, bands: new Array(32).fill(0), bass: 0, energy: 0 },
    lyrics: [],
  };

  const THEME_ORDER = ["adaptive", "champagne", "cyber_ice", "crimson_night"];

  const DEMO_LYRICS = [
    {
      time_ms: 800,
      end_ms: 4600,
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
          // Prefer vibrant, bright-enough colors for glowing edges
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

  function updateClock() {
    const now = new Date();
    const locale = config.locale || "tr-TR";
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

  function setupDesktopControls() {
    btnPrev.addEventListener("click", () => window.pywebview?.api?.previous_track());
    btnPlay.addEventListener("click", () => window.pywebview?.api?.play_pause());
    btnNext.addEventListener("click", () => window.pywebview?.api?.next_track());
    btnDemo.addEventListener("click", () => toggleDemo());
    btnExit.addEventListener("click", () => window.pywebview?.api?.quit_app());

    window.addEventListener("keydown", (e) => {
      if (screensaverMode) return;
      if (e.key === "d" || e.key === "D") toggleDemo();
      else if (e.key === "t" || e.key === "T") {
        const idx = THEME_ORDER.indexOf(config.theme || "adaptive");
        const nextTheme = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
        config.theme = nextTheme;
        window.pywebview?.api?.update_config({ theme: nextTheme });
      } else if (e.key === "[") {
        config.lyrics_offset_ms = (config.lyrics_offset_ms || 0) - 250;
        window.pywebview?.api?.update_config({ lyrics_offset_ms: config.lyrics_offset_ms });
      } else if (e.key === "]") {
        config.lyrics_offset_ms = (config.lyrics_offset_ms || 0) + 250;
        window.pywebview?.api?.update_config({ lyrics_offset_ms: config.lyrics_offset_ms });
      } else if (e.key === " ") {
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

  function updateMediaUI(media) {
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

    const pct = media.duration_ms > 0 ? Math.min(100, (media.position_ms / media.duration_ms) * 100) : 0;
    progressFill.style.width = `${pct.toFixed(1)}%`;
  }

  async function pollBackend() {
    if (window.pywebview?.api?.get_state) {
      try {
        latestState = await window.pywebview.api.get_state();
        if (latestState.config) {
          config = { ...config, ...latestState.config };
        }
      } catch (_) {}
    }
    setTimeout(pollBackend, 45);
  }

  function frame(perfNow) {
    const nowSec = perfNow / 1000;
    updateClock();

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
      audio = { live: false, bands: synthBands, bass: 0.48 + 0.25 * Math.sin(nowSec * 4.2), energy: 0.55 };
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
    renderer.render(nowSec, posMs, media.playing, hasLyrics, audio, config);

    requestAnimationFrame(frame);
  }

  async function init() {
    setupDesktopControls();

    if (window.pywebview?.api?.get_init_config) {
      try {
        const initData = await window.pywebview.api.get_init_config();
        config = { ...config, ...(initData.config || {}) };
        screensaverMode = Boolean(initData.screensaver_mode);
        if (initData.demo_mode) toggleDemo(true);
      } catch (_) {}
    } else {
      toggleDemo(true);
    }

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
