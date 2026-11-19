/**
 * Night Constellation Engine — High-FPS (60-144Hz) Cinema Renderer
 *  1) Delta-time normalized silky animations (smooth reticle glide, shooting line beams, word bloom)
 *  2) Time-of-Day dynamic sky + Night Eye-Care Warm Amber Shift
 *  3) Aurora Borealis flowing sky curtains + 3D Particle Galaxy (Nebula) with Magnetic Physics
 *  4) Switchable Particle Weather: Stars / Gentle Snow / Matrix Digital Rain
 *  5) 3D Orbital Saturn Rings + Beat Shockwaves + Bottom Glass Equalizer
 *  6) Constellation node-graph synced lyrics with 4-point star-flare reticle (matching reference)
 */

const THEME_PRESETS = {
  champagne: [255, 250, 236],
  cyber_ice: [130, 220, 255],
  crimson_night: [255, 105, 145],
};

class NightConstellationRenderer {
  constructor(bgCanvas, constellationCanvas, radialCanvas, edgeAuraEl, centerArtRingEl) {
    this.bgCanvas = bgCanvas;
    this.bgCtx = bgCanvas.getContext("2d");

    this.conCanvas = constellationCanvas;
    this.conCtx = constellationCanvas.getContext("2d");

    this.radCanvas = radialCanvas;
    this.radCtx = radialCanvas.getContext("2d");

    this.edgeAuraEl = edgeAuraEl;
    this.centerArtRingEl = centerArtRingEl;

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.nodes = [];
    this.lines = [];
    this.trackKey = "";
    this.camX = 0;
    this.camY = 0;
    this.targetCamX = 0;
    this.targetCamY = 0;

    // Smooth gliding reticle state
    this.reticleX = 0;
    this.reticleY = 0;
    this.lastNowSec = 0;

    this.smoothBass = 0;
    this.smoothEnergy = 0;
    this.smoothBands = new Array(32).fill(0);

    this.adaptiveRGB = [255, 250, 236];
    this.currentRGB = [255, 250, 236];

    this.mouseX = window.innerWidth * 0.5;
    this.mouseY = window.innerHeight * 0.5;
    this.mouseNormX = 0;
    this.mouseNormY = 0;
    this.parallaxX = 0;
    this.parallaxY = 0;

    this.stars = this._createStarfield(90);
    this.snowflakes = this._createSnow(70);
    this.matrixDrops = this._createMatrixDrops(42);
    this.nebula = this._createNebula(140);
    this.nebulaAngle = 0;
    this.shootingStars = [];
    this.nextShootAt = 4.0;
    this.shockwaves = [];

    this.orbitParticles = this._createOrbitParticles(22);

    this.resize();
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("mousemove", (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.mouseNormX = e.clientX / Math.max(1, this.width) - 0.5;
      this.mouseNormY = e.clientY / Math.max(1, this.height) - 0.5;
    });
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    for (const c of [this.bgCanvas, this.conCanvas]) {
      c.width = Math.floor(this.width * this.dpr);
      c.height = Math.floor(this.height * this.dpr);
      c.style.width = `${this.width}px`;
      c.style.height = `${this.height}px`;
    }

    const radSize = 340;
    this.radCanvas.width = radSize * this.dpr;
    this.radCanvas.height = radSize * this.dpr;
  }

  setAdaptiveColor(rgb) {
    if (Array.isArray(rgb) && rgb.length === 3) {
      this.adaptiveRGB = rgb;
    } else {
      this.adaptiveRGB = [255, 250, 236];
    }
  }

  triggerShockwave() {
    this.shockwaves.push({ r: 74, alpha: 0.78 });
    if (this.shockwaves.length > 6) this.shockwaves.shift();
  }

  _rgba(alpha, rgb = this.currentRGB) {
    return `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}, ${alpha})`;
  }

  _createStarfield(count) {
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.5 + Math.random() * 1.3,
        depth: 0.4 + Math.random() * 0.9,
        baseAlpha: 0.14 + Math.random() * 0.42,
        speed: 0.7 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
        driftX: (Math.random() - 0.5) * 0.0025,
        driftY: (Math.random() - 0.5) * 0.0018,
      });
    }
    return list;
  }

  _createSnow(count) {
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({
        x: Math.random(),
        y: Math.random(),
        r: 1.0 + Math.random() * 2.4,
        speedY: 0.018 + Math.random() * 0.032,
        swayAmp: 0.008 + Math.random() * 0.015,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.25 + Math.random() * 0.5,
      });
    }
    return list;
  }

  _createMatrixDrops(count) {
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({
        xFrac: (i + 0.5) / count,
        y: Math.random(),
        speed: 0.14 + Math.random() * 0.22,
        len: 8 + Math.floor(Math.random() * 10),
      });
    }
    return list;
  }

  _createNebula(count) {
    const list = [];
    for (let i = 0; i < count; i++) {
      const arm = i % 3;
      const dist = 80 + Math.random() * 520;
      const angle = (arm * Math.PI * 2) / 3 + dist * 0.005 + (Math.random() - 0.5) * 0.7;
      list.push({
        x: Math.cos(angle) * dist,
        y: (Math.random() - 0.5) * 140,
        z: Math.sin(angle) * dist,
        ox: 0,
        oy: 0,
        size: 1.0 + Math.random() * 2.1,
        alpha: 0.25 + Math.random() * 0.55,
      });
    }
    return list;
  }

  _createOrbitParticles(count) {
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({
        angle: (i / count) * Math.PI * 2,
        speed: (0.18 + Math.random() * 0.25) * (i % 2 === 0 ? 1 : -1),
        radiusOffset: 16 + Math.random() * 44,
        size: 1.0 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return list;
  }

  _hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  _seededRandom(seed) {
    let s = seed || 1;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  setLyrics(trackKey, lines) {
    this.lines = lines || [];
    if (trackKey === this.trackKey && this.nodes.length > 0) return;
    this.trackKey = trackKey;
    this.nodes = [];

    if (!lines || lines.length === 0) return;

    const rand = this._seededRandom(this._hashString(trackKey || "constellation"));
    let cursorX = 0;
    let cursorY = 0;

    lines.forEach((line, lineIdx) => {
      const words = line.words || [];
      words.forEach((w, wordIdx) => {
        const angle = (rand() - 0.5) * 1.45;
        const dist = wordIdx === 0 && lineIdx > 0 ? 210 + rand() * 85 : 135 + rand() * 85;
        const dirSign = lineIdx % 2 === 0 ? 1 : -1;

        cursorX += Math.cos(angle) * dist * (wordIdx === 0 ? 0.68 : dirSign * 0.92);
        cursorY += Math.sin(angle) * dist * 0.72 + (wordIdx === 0 ? 48 : 0);

        if (Math.abs(cursorY) > 155) {
          cursorY *= 0.6;
        }

        for (let tries = 0; tries < 6; tries++) {
          let tooClose = false;
          for (let k = Math.max(0, this.nodes.length - 8); k < this.nodes.length; k++) {
            const prev = this.nodes[k];
            if (Math.hypot(cursorX - prev.x, cursorY - prev.y) < 92) {
              tooClose = true;
              break;
            }
          }
          if (!tooClose) break;
          cursorX += (rand() > 0.5 ? 1 : -1) * 62;
          cursorY += (rand() - 0.5) * 68;
        }

        this.nodes.push({
          id: `${lineIdx}-${wordIdx}`,
          lineIdx,
          wordIdx,
          text: w.text,
          timeMs: w.time_ms,
          endMs: line.end_ms || w.time_ms + 600,
          x: cursorX,
          y: cursorY,
          animScale: 0,
        });
      });
    });

    if (this.nodes.length > 0) {
      this.camX = this.nodes[0].x;
      this.camY = this.nodes[0].y;
      this.targetCamX = this.camX;
      this.targetCamY = this.camY;
      this.reticleX = this.nodes[0].x;
      this.reticleY = this.nodes[0].y;
    }
  }

  _getSkyPalette() {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 8) return ["#111726", "#070910", "#030408"];
    if (hr >= 17 && hr < 20) return ["#1a1019", "#0a070c", "#040306"];
    return ["#0a0b10", "#050508", "#020204"];
  }

  render(nowSec, positionMs, isPlaying, hasLyrics, audioState, config) {
    const dt = this.lastNowSec > 0 ? Math.min(0.05, Math.max(0.001, nowSec - this.lastNowSec)) : 1 / 60;
    this.lastNowSec = nowSec;

    const pausedVisuals = Boolean(config?.paused_visuals);
    const rawBass = pausedVisuals ? 0 : audioState?.bass || 0;
    const rawEnergy = pausedVisuals ? 0 : audioState?.energy || 0;
    const rawBands = pausedVisuals ? [] : audioState?.bands || [];

    if (!pausedVisuals && audioState?.beat) {
      this.triggerShockwave();
    }

    const rhythmFloor = !pausedVisuals && isPlaying ? 0.16 + 0.12 * Math.sin(nowSec * 4.2) : 0;
    const targetBass = Math.max(rawBass, rhythmFloor);

    const bassRate = targetBass > this.smoothBass ? 18 : 7;
    this.smoothBass += (targetBass - this.smoothBass) * (1 - Math.exp(-bassRate * dt));
    this.smoothEnergy += (Math.max(rawEnergy, rhythmFloor * 0.8) - this.smoothEnergy) * (1 - Math.exp(-12 * dt));

    const bandLerp = 1 - Math.exp(-15 * dt);
    for (let i = 0; i < 32; i++) {
      const target = Math.max(
        rawBands[i] || 0,
        !pausedVisuals && isPlaying ? 0.1 + 0.08 * Math.sin(nowSec * 3.4 + i * 0.5) : 0
      );
      this.smoothBands[i] += (target - this.smoothBands[i]) * bandLerp;
    }

    const themeName = config?.theme || "adaptive";
    let targetRGB =
      themeName === "adaptive"
        ? [...this.adaptiveRGB]
        : [...(THEME_PRESETS[themeName] || THEME_PRESETS.champagne)];

    if (config?.night_amber) {
      targetRGB = [
        Math.min(255, Math.round(targetRGB[0] * 1.0)),
        Math.round(targetRGB[1] * 0.78),
        Math.round(targetRGB[2] * 0.52),
      ];
    }

    const rgbLerp = 1 - Math.exp(-4 * dt);
    for (let c = 0; c < 3; c++) {
      this.currentRGB[c] += (targetRGB[c] - this.currentRGB[c]) * rgbLerp;
    }

    const parLerp = 1 - Math.exp(-5 * dt);
    this.parallaxX += (this.mouseNormX * 26 - this.parallaxX) * parLerp;
    this.parallaxY += (this.mouseNormY * 18 - this.parallaxY) * parLerp;

    const glowIntensity = pausedVisuals ? 0.25 : config?.edge_glow_intensity ?? 1.0;
    const showNebula = !pausedVisuals && (config?.show_nebula ?? true);
    const magneticOn = !pausedVisuals && (config?.magnetic_particles ?? true);
    const showAurora = !pausedVisuals && (config?.show_aurora ?? true);
    const showEq = !pausedVisuals && (config?.show_equalizer ?? true);
    const showOrbital = !pausedVisuals && (config?.orbital_rings ?? true);
    const particleMode = config?.particle_mode || "stars";
    const showTranslation = Boolean(config?.auto_translate ?? true);

    this._renderBackground(
      nowSec,
      dt,
      this.smoothBass,
      this.smoothEnergy,
      this.smoothBands,
      isPlaying && !pausedVisuals,
      glowIntensity,
      showNebula,
      magneticOn,
      showAurora,
      showEq,
      particleMode
    );
    this._renderFluidRadial(nowSec, this.smoothBands, isPlaying && !pausedVisuals, this.smoothBass, showOrbital);

    if (this.centerArtRingEl) {
      const scale = isPlaying && !pausedVisuals ? 1 + this.smoothBass * 0.12 : 1;
      const glow = isPlaying && !pausedVisuals ? Math.round(22 + this.smoothBass * 48) : 16;
      this.centerArtRingEl.style.transform = `scale(${scale.toFixed(3)})`;
      this.centerArtRingEl.style.boxShadow = `0 0 ${glow}px ${this._rgba((0.24 + this.smoothBass * 0.45).toFixed(2))}, inset 0 0 18px rgba(0,0,0,0.65)`;
    }

    if (hasLyrics && !pausedVisuals && this.nodes.length > 0) {
      this._renderConstellation(nowSec, dt, positionMs, this.smoothBass, showTranslation);
    } else {
      this.conCtx.clearRect(0, 0, this.conCanvas.width, this.conCanvas.height);
    }
  }

  _perimPoint(tNorm, w, h) {
    const perim = 2 * (w + h);
    const dist = (((tNorm % 1) + 1) % 1) * perim;
    if (dist < w) return { x: dist, y: 0 };
    if (dist < w + h) return { x: w, y: dist - w };
    if (dist < 2 * w + h) return { x: w - (dist - (w + h)), y: h };
    return { x: 0, y: h - (dist - (2 * w + h)) };
  }

  _renderAurora(ctx, w, h, nowSec, energy) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let r = 0; r < 2; r++) {
      const baseY = h * (0.14 + r * 0.09);
      const grad = ctx.createLinearGradient(0, baseY - 60, 0, baseY + 120);
      grad.addColorStop(0, this._rgba(0));
      grad.addColorStop(0.45, this._rgba((0.05 + energy * 0.08).toFixed(3)));
      grad.addColorStop(1, this._rgba(0));

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, baseY + 120);
      for (let x = 0; x <= w; x += 72) {
        const y =
          baseY +
          Math.sin((x / w) * Math.PI * 2.5 + nowSec * (0.28 + r * 0.12) + r * 2) * (28 + energy * 24);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, baseY + 120);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  _renderBottomEqualizer(ctx, w, h, bands, isPlaying, glowIntensity) {
    const barCount = 48;
    const totalW = Math.min(w * 0.44, 620);
    const startX = (w - totalW) * 0.5;
    const step = totalW / barCount;
    const barW = Math.max(3, step * 0.52);

    ctx.save();
    for (let i = 0; i < barCount; i++) {
      const mirrorIdx = i < barCount / 2 ? barCount / 2 - 1 - i : i - barCount / 2;
      const bandIdx = Math.floor((mirrorIdx / (barCount / 2)) * 31);
      const amp = bands[bandIdx] || 0;
      const barH = isPlaying ? 4 + amp * 42 : 3;
      const x = startX + i * step + (step - barW) * 0.5;
      const y = h - barH - 6;

      ctx.fillStyle = this._rgba(Math.min(0.85, (0.22 + amp * 0.62) * glowIntensity));
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barW, barH, 3);
      } else {
        ctx.rect(x, y, barW, barH);
      }
      ctx.fill();
    }
    ctx.restore();
  }

  _renderParticles(ctx, w, h, nowSec, energy, mode) {
    if (mode === "snow") {
      for (const fl of this.snowflakes) {
        const y = ((fl.y + nowSec * fl.speedY) % 1) * h;
        const x = ((fl.x + Math.sin(nowSec * 0.9 + fl.phase) * fl.swayAmp) % 1) * w;
        ctx.fillStyle = this._rgba((fl.alpha * (0.7 + energy * 0.4)).toFixed(3));
        ctx.beginPath();
        ctx.arc(x, y, fl.r, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    if (mode === "matrix") {
      ctx.font = '12px "Consolas", monospace';
      const chars = "01アイウエオカキクケコ";
      for (const d of this.matrixDrops) {
        const headY = ((d.y + nowSec * d.speed) % 1.15) * h;
        const x = d.xFrac * w;
        for (let k = 0; k < d.len; k++) {
          const cy = headY - k * 14;
          if (cy < 0 || cy > h) continue;
          const alpha = (1 - k / d.len) * (0.35 + energy * 0.4);
          ctx.fillStyle = this._rgba(alpha.toFixed(3));
          const ch = chars[Math.floor((nowSec * 6 + k + d.xFrac * 50) % chars.length)];
          ctx.fillText(ch, x, cy);
        }
      }
      return;
    }

    for (const s of this.stars) {
      const sx = (((s.x + nowSec * s.driftX) % 1) + 1) % 1 * w - this.parallaxX * s.depth;
      const sy = (((s.y + nowSec * s.driftY) % 1) + 1) % 1 * h - this.parallaxY * s.depth;
      const twinkle = 0.55 + 0.45 * Math.sin(nowSec * s.speed + s.phase);
      const alpha = s.baseAlpha * twinkle * (0.75 + energy * 0.65);
      ctx.fillStyle = this._rgba(alpha.toFixed(3));
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _renderBackground(nowSec, dt, bass, energy, bands, isPlaying, glowIntensity, showNebula, magneticOn, showAurora, showEq, particleMode) {
    const ctx = this.bgCtx;
    const w = this.width;
    const h = this.height;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    const [c0, c1, c2] = this._getSkyPalette();
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    bgGrad.addColorStop(0, c0);
    bgGrad.addColorStop(0.6, c1);
    bgGrad.addColorStop(1, c2);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    if (showAurora) {
      this._renderAurora(ctx, w, h, nowSec, energy);
    }

    if (showNebula) {
      this.nebulaAngle += (0.12 + (isPlaying ? bass * 0.72 : 0.06)) * dt;
      const cosA = Math.cos(this.nebulaAngle);
      const sinA = Math.sin(this.nebulaAngle);
      const fov = 420;
      const cx = w * 0.5 - this.parallaxX * 0.6;
      const cy = h * 0.52 - this.parallaxY * 0.6;

      for (const n of this.nebula) {
        const rx = n.x * cosA - n.z * sinA;
        const rz = n.x * sinA + n.z * cosA + 520;
        if (rz <= 20) continue;
        const scale = fov / rz;
        let px = cx + rx * scale;
        let py = cy + n.y * scale;

        if (magneticOn) {
          const dx = this.mouseX - px;
          const dy = this.mouseY - py;
          const dist = Math.hypot(dx, dy);
          if (dist < 175 && dist > 4) {
            const pull = (1 - dist / 175) * 0.35;
            n.ox += (dx * pull - dy * pull * 0.65 - n.ox) * 0.14;
            n.oy += (dy * pull + dx * pull * 0.65 - n.oy) * 0.14;
          } else {
            n.ox *= 0.92;
            n.oy *= 0.92;
          }
          px += n.ox;
          py += n.oy;
        }

        if (px < -10 || px > w + 10 || py < -10 || py > h + 10) continue;

        const alpha = n.alpha * Math.min(1, scale * 1.1) * (0.35 + energy * 0.65);
        ctx.fillStyle = this._rgba(alpha.toFixed(3));
        ctx.beginPath();
        ctx.arc(px, py, n.size * scale * (1 + bass * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    this._renderParticles(ctx, w, h, nowSec, energy, particleMode);

    if (nowSec > this.nextShootAt) {
      this.nextShootAt = nowSec + 5.5 + Math.random() * 6.0;
      this.shootingStars.push({
        x: Math.random() * w * 0.7 + w * 0.15,
        y: Math.random() * h * 0.35 + h * 0.08,
        vx: (Math.random() > 0.5 ? 1 : -1) * (420 + Math.random() * 240),
        vy: 140 + Math.random() * 140,
        life: 0,
        maxLife: 0.75,
      });
    }
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const sh = this.shootingStars[i];
      sh.life += dt;
      if (sh.life >= sh.maxLife) {
        this.shootingStars.splice(i, 1);
        continue;
      }
      const p = sh.life / sh.maxLife;
      const alpha = Math.sin(p * Math.PI) * 0.75;
      const cx = sh.x + sh.vx * sh.life;
      const cy = sh.y + sh.vy * sh.life;
      const tx = cx - sh.vx * 0.14;
      const ty = cy - sh.vy * 0.14;

      const sg = ctx.createLinearGradient(cx, cy, tx, ty);
      sg.addColorStop(0, this._rgba(alpha));
      sg.addColorStop(1, this._rgba(0));
      ctx.strokeStyle = sg;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }

    this._renderCurvedClaws(ctx, w, h, nowSec, bass, isPlaying, glowIntensity);

    if (showEq) {
      this._renderBottomEqualizer(ctx, w, h, bands, isPlaying, glowIntensity);
    }

    const bassCurve = Math.pow(bass, 0.85);
    const swellDepth = isPlaying ? (16 + bassCurve * 140) * glowIntensity : 10 * glowIntensity;
    const swellAlpha = isPlaying ? Math.min(0.68, (0.14 + bassCurve * 0.54) * glowIntensity) : 0.06 * glowIntensity;

    const topG = ctx.createLinearGradient(0, 0, 0, swellDepth);
    topG.addColorStop(0, this._rgba(swellAlpha));
    topG.addColorStop(0.35, this._rgba(swellAlpha * 0.35));
    topG.addColorStop(1, this._rgba(0));
    ctx.fillStyle = topG;
    ctx.fillRect(0, 0, w, swellDepth);

    const botG = ctx.createLinearGradient(0, h, 0, h - swellDepth);
    botG.addColorStop(0, this._rgba(swellAlpha));
    botG.addColorStop(0.35, this._rgba(swellAlpha * 0.35));
    botG.addColorStop(1, this._rgba(0));
    ctx.fillStyle = botG;
    ctx.fillRect(0, h - swellDepth, w, swellDepth);

    const leftG = ctx.createLinearGradient(0, 0, swellDepth, 0);
    leftG.addColorStop(0, this._rgba(swellAlpha));
    leftG.addColorStop(0.35, this._rgba(swellAlpha * 0.35));
    leftG.addColorStop(1, this._rgba(0));
    ctx.fillStyle = leftG;
    ctx.fillRect(0, 0, swellDepth, h);

    const rightG = ctx.createLinearGradient(w, 0, w - swellDepth, 0);
    rightG.addColorStop(0, this._rgba(swellAlpha));
    rightG.addColorStop(0.35, this._rgba(swellAlpha * 0.35));
    rightG.addColorStop(1, this._rgba(0));
    ctx.fillStyle = rightG;
    ctx.fillRect(w - swellDepth, 0, swellDepth, h);

    const rimAlpha = isPlaying
      ? Math.min(1.0, (0.45 + bassCurve * 0.55) * glowIntensity)
      : 0.25 * glowIntensity;

    ctx.save();
    ctx.strokeStyle = this._rgba(rimAlpha * 0.72);
    ctx.lineWidth = isPlaying ? 3 + bassCurve * 16 : 2;
    ctx.shadowColor = this._rgba(1);
    ctx.shadowBlur = isPlaying ? 18 + bassCurve * 55 : 10;
    ctx.strokeRect(0, 0, w, h);

    ctx.shadowBlur = isPlaying ? 8 + bassCurve * 24 : 5;
    ctx.lineWidth = isPlaying ? 1.6 + bassCurve * 4.5 : 1.1;
    ctx.strokeStyle = `rgba(255, 255, 255, ${rimAlpha})`;
    ctx.strokeRect(0, 0, w, h);

    ctx.globalCompositeOperation = "screen";
    const sweepCount = 3;
    for (let s = 0; s < sweepCount; s++) {
      const tHead = (nowSec * (0.09 + s * 0.025) + s / sweepCount) % 1;
      const segLen = 0.095;
      ctx.beginPath();
      const steps = 20;
      for (let k = 0; k <= steps; k++) {
        const pt = this._perimPoint(tHead + (k / steps) * segLen, w, h);
        if (k === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = this._rgba((isPlaying ? 0.65 + bassCurve * 0.35 : 0.25) * glowIntensity);
      ctx.lineWidth = isPlaying ? 4.5 + bassCurve * 12 : 2.2;
      ctx.shadowColor = this._rgba(1);
      ctx.shadowBlur = isPlaying ? 26 + bassCurve * 44 : 12;
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore();
  }

  _renderCurvedClaws(ctx, w, h, nowSec, bass, isPlaying, glowIntensity) {
    const clawCount = 8;
    const cx = w * 0.5 - this.parallaxX * 0.35;
    const arcRadiusX = Math.min(w * 0.25, 280);
    const activeBoost = isPlaying ? 0.92 + bass * 0.65 : 0.72;
    const alpha = Math.min(0.95, (isPlaying ? 0.55 + bass * 0.45 : 0.36) * glowIntensity);

    for (let i = 0; i < clawCount; i++) {
      const t = (i / (clawCount - 1)) * 2 - 1;
      const baseX = cx + t * arcRadiusX;
      const baseY = -4;
      const sway = Math.sin(nowSec * 1.4 + i * 0.9) * 5;

      const len = (118 + (1 - Math.abs(t)) * 88) * activeBoost;
      const tipX = baseX + t * 52 + sway;
      const tipY = baseY + len;
      const curveX = baseX + t * 18;
      const curveY = baseY + len * 0.52;
      const halfW = 5.5 + (1 - Math.abs(t)) * 3.5;

      const grad = ctx.createLinearGradient(baseX, baseY, tipX, tipY);
      grad.addColorStop(0, this._rgba(alpha));
      grad.addColorStop(0.55, this._rgba(alpha * 0.72));
      grad.addColorStop(1, this._rgba(0));

      ctx.save();
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(baseX - halfW, baseY);
      ctx.quadraticCurveTo(curveX - halfW * 0.45, curveY, tipX, tipY);
      ctx.quadraticCurveTo(curveX + halfW * 0.45, curveY, baseX + halfW, baseY);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.65})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(curveX, curveY, tipX, tipY);
      ctx.stroke();
      ctx.restore();
    }
  }

  _renderFluidRadial(nowSec, bands, isPlaying, bass, showOrbital) {
    const ctx = this.radCtx;
    const size = 340;
    const cx = size / 2;
    const cy = size / 2;
    const baseR = 82 + (isPlaying ? bass * 12 : 0);

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    if (showOrbital) {
      for (let r = 0; r < 2; r++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((r === 0 ? 0.35 : -0.45) + nowSec * (r === 0 ? 0.12 : -0.09));
        ctx.strokeStyle = this._rgba((isPlaying ? 0.22 + bass * 0.25 : 0.1).toFixed(3));
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.ellipse(0, 0, baseR + 48 + r * 14, (baseR + 48 + r * 14) * 0.36, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.r += 3.2;
      sw.alpha *= 0.93;
      if (sw.alpha < 0.03 || sw.r > 168) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = this._rgba(sw.alpha.toFixed(3));
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(cx, cy, sw.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    const pts = 72;
    const buildRingPoints = (phaseShift, ampScale, radiusOffset) => {
      const ring = [];
      for (let i = 0; i < pts; i++) {
        const angle = (i / pts) * Math.PI * 2;
        const bandPos = (i / pts) * 32;
        const idx0 = Math.floor(bandPos) % 32;
        const idx1 = (idx0 + 1) % 32;
        const frac = bandPos - Math.floor(bandPos);
        const audioAmp = bands[idx0] * (1 - frac) + bands[idx1] * frac;

        const snakeWave =
          Math.sin(angle * 4 - nowSec * 3.2 + phaseShift) * 6 +
          Math.cos(angle * 7 + nowSec * 2.1 - phaseShift) * 3.5;

        const idleWave = 4 + Math.sin(angle * 3 - nowSec * 1.8 + phaseShift) * 4;
        const radialOffset = isPlaying
          ? radiusOffset + audioAmp * 54 * ampScale + snakeWave * (0.45 + audioAmp)
          : radiusOffset + idleWave;

        const r = baseR + radialOffset;
        ring.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
        });
      }
      return ring;
    };

    const drawSmoothClosedSpline = (ring, strokeStyle, lineWidth, glowBlur, fillStyle) => {
      ctx.save();
      ctx.beginPath();
      const firstMidX = (ring[pts - 1].x + ring[0].x) * 0.5;
      const firstMidY = (ring[pts - 1].y + ring[0].y) * 0.5;
      ctx.moveTo(firstMidX, firstMidY);
      for (let i = 0; i < pts; i++) {
        const curr = ring[i];
        const next = ring[(i + 1) % pts];
        const midX = (curr.x + next.x) * 0.5;
        const midY = (curr.y + next.y) * 0.5;
        ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
      }
      ctx.closePath();

      if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fill();
      }
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.shadowColor = this._rgba(0.9);
      ctx.shadowBlur = glowBlur;
      ctx.stroke();
      ctx.restore();
    };

    const outerRing = buildRingPoints(0.8, 1.05, 10);
    drawSmoothClosedSpline(
      outerRing,
      this._rgba(isPlaying ? 0.36 + bass * 0.42 : 0.16),
      1.5,
      14,
      this._rgba(isPlaying ? 0.04 + bass * 0.06 : 0.02)
    );

    const mainRing = buildRingPoints(0, 1.0, 4);
    drawSmoothClosedSpline(
      mainRing,
      `rgba(255, 253, 248, ${isPlaying ? 0.9 : 0.45})`,
      2.6,
      18,
      null
    );

    const innerRing = buildRingPoints(-1.4, 0.72, -1);
    drawSmoothClosedSpline(
      innerRing,
      this._rgba(isPlaying ? 0.48 + bass * 0.36 : 0.2),
      1.3,
      10,
      null
    );

    for (const op of this.orbitParticles) {
      const a = op.angle + nowSec * op.speed * (isPlaying ? 1 + bass * 1.6 : 0.5);
      const r = baseR + op.radiusOffset + (isPlaying ? bass * 24 : 0);
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      const twinkle = 0.45 + 0.55 * Math.sin(nowSec * 3.0 + op.phase);
      ctx.fillStyle = this._rgba((isPlaying ? 0.72 : 0.3) * twinkle);
      ctx.beginPath();
      ctx.arc(px, py, op.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _renderConstellation(nowSec, dt, positionMs, bass, showTranslation) {
    const ctx = this.conCtx;
    const w = this.width;
    const h = this.height;

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    let activeIdx = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].timeMs <= positionMs) {
        activeIdx = i;
      } else {
        break;
      }
    }

    const activeNode = this.nodes[activeIdx];
    this.targetCamX = activeNode.x;
    this.targetCamY = activeNode.y;

    // Delta-time smooth camera & gliding reticle
    const camLerp = 1 - Math.exp(-5.5 * dt);
    const retLerp = 1 - Math.exp(-14.0 * dt);
    this.camX += (this.targetCamX - this.camX) * camLerp;
    this.camY += (this.targetCamY - this.camY) * camLerp;
    this.reticleX += (activeNode.x - this.reticleX) * retLerp;
    this.reticleY += (activeNode.y - this.reticleY) * retLerp;

    const originX = w * 0.5 - this.camX - this.parallaxX * 0.5;
    const originY = h * 0.56 - this.camY - this.parallaxY * 0.5;

    const windowStart = Math.max(0, activeIdx - 9);
    const windowEnd = Math.min(this.nodes.length - 1, activeIdx + 6);

    // Draw crisp geometric constellation edges + animated shooting beam to active node
    for (let i = windowStart; i < windowEnd; i++) {
      const a = this.nodes[i];
      const b = this.nodes[i + 1];
      const distFromActive = Math.max(Math.abs(i - activeIdx), Math.abs(i + 1 - activeIdx));
      const fade = Math.max(0.08, 1 - distFromActive / 9.0);

      const ax = originX + a.x;
      const ay = originY + a.y;
      const bx = originX + b.x;
      const by = originY + b.y;

      ctx.strokeStyle = `rgba(255, 255, 255, ${(0.52 * fade).toFixed(3)})`;
      ctx.lineWidth = i + 1 === activeIdx ? 1.8 : 1.15;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();

      // Secondary triangulation link for geometric constellation look (like q.jpeg & r.jpeg)
      if (i + 2 <= windowEnd && i % 2 === 0) {
        const c = this.nodes[i + 2];
        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.18 * fade).toFixed(3)})`;
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(originX + c.x, originY + c.y);
        ctx.stroke();
      }
    }

    // Draw nodes and smooth-scaled words
    const scaleRate = 1 - Math.exp(-12 * dt);
    for (let i = windowStart; i <= windowEnd; i++) {
      const node = this.nodes[i];
      const nx = originX + node.x;
      const ny = originY + node.y;
      const isActive = i === activeIdx;
      const dist = Math.abs(i - activeIdx);
      const alpha = isActive ? 1.0 : Math.max(0.16, 0.82 - dist * 0.11);

      node.animScale += ((isActive ? 1 : 0) - (node.animScale || 0)) * scaleRate;

      // Small star dot at every node
      ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.92).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(nx, ny, isActive ? 3.8 : 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Smoothly interpolated word size & glow (14px -> 32px)
      const fontSize = Math.round(14 + node.animScale * 18);
      const yOffset = 22 + node.animScale * 26;
      const weight = node.animScale > 0.4 ? "700" : "500";
      ctx.font = `${weight} ${fontSize}px "Segoe UI", "Inter", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = `rgba(255, 255, 255, ${(isActive ? 0.98 : alpha * 0.78).toFixed(3)})`;
      if (node.animScale > 0.25) {
        ctx.shadowColor = this._rgba((0.65 * node.animScale).toFixed(2));
        ctx.shadowBlur = Math.round(16 * node.animScale);
      }
      ctx.fillText(node.text, nx, ny + yOffset);
      ctx.shadowBlur = 0;
    }

    // Gliding 4-point star-flare Target Reticle (matches e.jpeg, q.jpeg, r.jpeg, w.jpeg!)
    const rx = originX + this.reticleX;
    const ry = originY + this.reticleY;
    const pulse = 1 + 0.06 * Math.sin(nowSec * 5.0) + bass * 0.18;
    const r = 17 * pulse;

    ctx.save();
    ctx.shadowColor = "rgba(255, 255, 255, 0.95)";
    ctx.shadowBlur = 16;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.94)";
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(rx, ry, r, 0, Math.PI * 2);
    ctx.stroke();

    // Extended crosshair lines
    const ext = 8;
    ctx.beginPath();
    ctx.moveTo(rx - r - ext, ry);
    ctx.lineTo(rx + r + ext, ry);
    ctx.moveTo(rx, ry - r - ext);
    ctx.lineTo(rx, ry + r + ext);
    ctx.stroke();

    // 4-point diamond star flare inside reticle
    const flare = r * 0.78;
    const waist = 2.6;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(rx, ry - flare);
    ctx.quadraticCurveTo(rx + waist, ry - waist, rx + flare, ry);
    ctx.quadraticCurveTo(rx + waist, ry + waist, rx, ry + flare);
    ctx.quadraticCurveTo(rx - waist, ry + waist, rx - flare, ry);
    ctx.quadraticCurveTo(rx - waist, ry - waist, rx, ry - flare);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (showTranslation && this.lines && activeNode) {
      const activeLine = this.lines[activeNode.lineIdx];
      if (activeLine && activeLine.tr) {
        ctx.font = '400 15px "Segoe UI", "Inter", sans-serif';
        ctx.textAlign = "center";
        ctx.fillStyle = this._rgba(0.8);
        ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
        ctx.shadowBlur = 8;
        ctx.fillText(activeLine.tr, w * 0.5, h * 0.84);
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();
  }
}

window.NightConstellationRenderer = NightConstellationRenderer;
