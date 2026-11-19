/**
 * Night Constellation Engine — Cinema-Grade 60fps Renderer
 *  1) Deep-sky twinkling starfield with mouse parallax + rare shooting stars
 *  2) Adaptive album-art color palette + 3 built-in theme presets
 *  3) Punchy, clearly visible bass-swelling perimeter glow + gliding edge light pulses
 *  4) Curved Black-Panther-style glowing claws/fangs framing the top clock
 *  5) Silky snake-like multi-layered Bezier radial wave + orbiting starlight particles around circular album art
 *  6) Constellation node-graph synced lyrics with star-flare target reticle
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
    this.trackKey = "";
    this.camX = 0;
    this.camY = 0;
    this.targetCamX = 0;
    this.targetCamY = 0;

    this.smoothBass = 0;
    this.smoothEnergy = 0;
    this.smoothBands = new Array(32).fill(0);

    // Adaptive RGB accent color (smoothly interpolated)
    this.adaptiveRGB = [255, 250, 236];
    this.currentRGB = [255, 250, 236];

    // Mouse parallax state
    this.mouseNormX = 0;
    this.mouseNormY = 0;
    this.parallaxX = 0;
    this.parallaxY = 0;

    this.stars = this._createStarfield(95);
    this.shootingStars = [];
    this.nextShootAt = 4.0;

    this.orbitParticles = this._createOrbitParticles(24);

    this.resize();
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("mousemove", (e) => {
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

  _rgba(alpha, rgb = this.currentRGB) {
    return `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}, ${alpha})`;
  }

  _createStarfield(count) {
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.5 + Math.random() * 1.4,
        depth: 0.4 + Math.random() * 0.9,
        baseAlpha: 0.14 + Math.random() * 0.45,
        speed: 0.7 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
        driftX: (Math.random() - 0.5) * 0.0025,
        driftY: (Math.random() - 0.5) * 0.0018,
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
        const angle = (rand() - 0.5) * 1.35;
        const dist = wordIdx === 0 && lineIdx > 0 ? 200 + rand() * 75 : 130 + rand() * 80;
        const dirSign = lineIdx % 2 === 0 ? 1 : -1;

        cursorX += Math.cos(angle) * dist * (wordIdx === 0 ? 0.65 : dirSign * 0.9);
        cursorY += Math.sin(angle) * dist * 0.68 + (wordIdx === 0 ? 52 : 0);

        if (Math.abs(cursorY) > 155) {
          cursorY *= 0.62;
        }

        for (let tries = 0; tries < 6; tries++) {
          let tooClose = false;
          for (let k = Math.max(0, this.nodes.length - 8); k < this.nodes.length; k++) {
            const prev = this.nodes[k];
            if (Math.hypot(cursorX - prev.x, cursorY - prev.y) < 88) {
              tooClose = true;
              break;
            }
          }
          if (!tooClose) break;
          cursorX += (rand() > 0.5 ? 1 : -1) * 58;
          cursorY += (rand() - 0.5) * 64;
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
        });
      });
    });

    if (this.nodes.length > 0) {
      this.camX = this.nodes[0].x;
      this.camY = this.nodes[0].y;
      this.targetCamX = this.camX;
      this.targetCamY = this.camY;
    }
  }

  render(nowSec, positionMs, isPlaying, hasLyrics, audioState, config) {
    const rawBass = audioState?.bass || 0;
    const rawEnergy = audioState?.energy || 0;
    const rawBands = audioState?.bands || [];

    const rhythmFloor = isPlaying ? 0.16 + 0.12 * Math.sin(nowSec * 4.2) : 0;
    const targetBass = Math.max(rawBass, rhythmFloor);

    if (targetBass > this.smoothBass) {
      this.smoothBass += (targetBass - this.smoothBass) * 0.48;
    } else {
      this.smoothBass += (targetBass - this.smoothBass) * 0.16;
    }

    this.smoothEnergy += (Math.max(rawEnergy, rhythmFloor * 0.8) - this.smoothEnergy) * 0.28;
    for (let i = 0; i < 32; i++) {
      const target = Math.max(rawBands[i] || 0, isPlaying ? 0.1 + 0.08 * Math.sin(nowSec * 3.4 + i * 0.5) : 0);
      this.smoothBands[i] += (target - this.smoothBands[i]) * 0.3;
    }

    // Smoothly interpolate theme color
    const themeName = config?.theme || "adaptive";
    const targetRGB =
      themeName === "adaptive"
        ? this.adaptiveRGB
        : THEME_PRESETS[themeName] || THEME_PRESETS.champagne;
    for (let c = 0; c < 3; c++) {
      this.currentRGB[c] += (targetRGB[c] - this.currentRGB[c]) * 0.06;
    }

    // Smooth mouse parallax
    this.parallaxX += (this.mouseNormX * 26 - this.parallaxX) * 0.06;
    this.parallaxY += (this.mouseNormY * 18 - this.parallaxY) * 0.06;

    const glowIntensity = config?.edge_glow_intensity ?? 1.0;

    this._renderBackground(
      nowSec,
      this.smoothBass,
      this.smoothEnergy,
      isPlaying,
      glowIntensity
    );
    this._renderFluidRadial(nowSec, this.smoothBands, isPlaying, this.smoothBass);

    if (this.centerArtRingEl) {
      const scale = isPlaying ? 1 + this.smoothBass * 0.12 : 1;
      const glow = isPlaying ? Math.round(22 + this.smoothBass * 48) : 16;
      this.centerArtRingEl.style.transform = `scale(${scale.toFixed(3)})`;
      this.centerArtRingEl.style.boxShadow = `0 0 ${glow}px ${this._rgba((0.24 + this.smoothBass * 0.45).toFixed(2))}, inset 0 0 18px rgba(0,0,0,0.65)`;
    }

    if (hasLyrics && this.nodes.length > 0) {
      this._renderConstellation(nowSec, positionMs, this.smoothBass);
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

  _renderBackground(nowSec, bass, energy, isPlaying, glowIntensity) {
    const ctx = this.bgCtx;
    const w = this.width;
    const h = this.height;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    bgGrad.addColorStop(0, "#0a0b10");
    bgGrad.addColorStop(0.6, "#050508");
    bgGrad.addColorStop(1, "#020204");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 1. Twinkling deep-sky starfield with mouse parallax
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

    // Occasional shooting star
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
      sh.life += 1 / 60;
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

    // 2. Curved Black-Panther-style glowing claws/fangs framing the top clock
    this._renderCurvedClaws(ctx, w, h, nowSec, bass, isPlaying, glowIntensity);

    // 3. Clearly visible, punchy bass-swelling perimeter glow
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

    // Flush 0px neon rim that swells visibly in thickness & bloom on beat
    const rimAlpha = isPlaying
      ? Math.min(1.0, (0.45 + bassCurve * 0.55) * glowIntensity)
      : 0.25 * glowIntensity;

    ctx.save();
    ctx.strokeStyle = this._rgba(rimAlpha * 0.72);
    ctx.lineWidth = isPlaying ? 3 + bassCurve * 16 : 2;
    ctx.shadowColor = this._rgba(1);
    ctx.shadowBlur = isPlaying ? 18 + bassCurve * 55 : 10;
    ctx.strokeRect(0, 0, w, h);

    // Pure bright core
    ctx.shadowBlur = isPlaying ? 8 + bassCurve * 24 : 5;
    ctx.lineWidth = isPlaying ? 1.6 + bassCurve * 4.5 : 1.1;
    ctx.strokeStyle = `rgba(255, 255, 255, ${rimAlpha})`;
    ctx.strokeRect(0, 0, w, h);

    // Smooth glowing light pulses gliding strictly along the 4 edges
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
      ctx.shadowColor = this._rgba(alpha * 0.75);
      ctx.shadowBlur = 14 + bass * 16;
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

  _renderFluidRadial(nowSec, bands, isPlaying, bass) {
    const ctx = this.radCtx;
    const size = 340;
    const cx = size / 2;
    const cy = size / 2;
    const baseR = 82 + (isPlaying ? bass * 12 : 0);

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

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

  _renderConstellation(nowSec, positionMs, bass) {
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

    this.camX += (this.targetCamX - this.camX) * 0.085;
    this.camY += (this.targetCamY - this.camY) * 0.085;

    const originX = w * 0.5 - this.camX - this.parallaxX * 0.5;
    const originY = h * 0.56 - this.camY - this.parallaxY * 0.5;

    const windowStart = Math.max(0, activeIdx - 8);
    const windowEnd = Math.min(this.nodes.length - 1, activeIdx + 6);

    for (let i = windowStart; i < windowEnd; i++) {
      const a = this.nodes[i];
      const b = this.nodes[i + 1];
      const distFromActive = Math.max(Math.abs(i - activeIdx), Math.abs(i + 1 - activeIdx));
      const fade = Math.max(0.08, 1 - distFromActive / 8.5);

      const ax = originX + a.x;
      const ay = originY + a.y;
      const bx = originX + b.x;
      const by = originY + b.y;

      ctx.strokeStyle = this._rgba(0.45 * fade);
      ctx.lineWidth = i === activeIdx || i + 1 === activeIdx ? 1.5 : 1.0;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();

      if (i + 2 <= windowEnd && i % 3 === 0) {
        const c = this.nodes[i + 2];
        ctx.strokeStyle = this._rgba(0.16 * fade);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(originX + c.x, originY + c.y);
        ctx.stroke();
      }
    }

    for (let i = windowStart; i <= windowEnd; i++) {
      const node = this.nodes[i];
      const nx = originX + node.x;
      const ny = originY + node.y;
      const isActive = i === activeIdx;
      const dist = Math.abs(i - activeIdx);
      const alpha = isActive ? 1.0 : Math.max(0.14, 0.78 - dist * 0.11);

      if (isActive) {
        const pulse = 1 + 0.08 * Math.sin(nowSec * 5.0) + bass * 0.25;
        const r = 16 * pulse;

        ctx.save();
        ctx.shadowColor = this._rgba(0.95);
        ctx.shadowBlur = 18;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.94)";
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.stroke();

        const tick = 8;
        ctx.beginPath();
        ctx.moveTo(nx - r - tick, ny);
        ctx.lineTo(nx - r + 4, ny);
        ctx.moveTo(nx + r - 4, ny);
        ctx.lineTo(nx + r + tick, ny);
        ctx.moveTo(nx, ny - r - tick);
        ctx.lineTo(nx, ny - r + 4);
        ctx.moveTo(nx, ny + r - 4);
        ctx.lineTo(nx, ny + r + tick);
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(nx, ny, 4.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.font = '600 28px "Segoe UI", "Inter", sans-serif';
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
        ctx.shadowColor = this._rgba(0.5);
        ctx.shadowBlur = 14;
        ctx.fillText(node.text, nx, ny + 46);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
        ctx.beginPath();
        ctx.arc(nx, ny, 2.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '400 14px "Segoe UI", "Inter", sans-serif';
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.72})`;
        ctx.fillText(node.text, nx, ny + 22);
      }
    }

    ctx.restore();
  }
}

window.NightConstellationRenderer = NightConstellationRenderer;
