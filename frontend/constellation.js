/**
 * Night Constellation Engine — Cinema-Grade 60fps Renderer
 *  1) Deep-sky twinkling starfield + rare shooting stars
 *  2) Punchy, clearly visible bass-swelling perimeter glow + gliding edge light pulses
 *  3) Curved Black-Panther-style glowing claws/fangs framing the top clock
 *  4) Silky snake-like multi-layered Bezier radial wave + orbiting starlight particles around circular album art
 *  5) Constellation node-graph synced lyrics with star-flare target reticle
 */

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
    this.pointerX = 0;
    this.pointerY = 0;
    this.targetPointerX = 0;
    this.targetPointerY = 0;
    const followPointer = (event) => {
      this.targetPointerX = event.clientX / Math.max(1, window.innerWidth) * 2 - 1;
      this.targetPointerY = event.clientY / Math.max(1, window.innerHeight) * 2 - 1;
    };
    document.addEventListener("pointermove", followPointer, { capture: true, passive: true });
    document.addEventListener("mousemove", followPointer, { capture: true, passive: true });
    window.addEventListener("pointerleave", () => {
      this.targetPointerX = 0;
      this.targetPointerY = 0;
    }, { passive: true });

    this.smoothBass = 0;
    this.smoothEnergy = 0;
    this.smoothBands = new Array(32).fill(0);

    this.stars = this._createStarfield(180);
    this.shootingStars = [];
    this.nextShootAt = 4.0;

    this.orbitParticles = this._createOrbitParticles(24);

    this.resize();
    window.addEventListener("resize", () => this.resize());
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

  _createStarfield(count) {
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.5 + Math.random() * 1.4,
        baseAlpha: 0.14 + Math.random() * 0.45,
        speed: 0.7 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
        driftX: (Math.random() - 0.5) * 0.0025,
        driftY: (Math.random() - 0.5) * 0.0018,
        depth: 0.35 + Math.random() * 0.9,
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

  setPointerPosition(x, y) {
    this.targetPointerX = Math.max(-1, Math.min(1, x));
    this.targetPointerY = Math.max(-1, Math.min(1, y));
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
    this.pointerX += (this.targetPointerX - this.pointerX) * 0.09;
    this.pointerY += (this.targetPointerY - this.pointerY) * 0.09;

    const rawBass = audioState?.bass || 0;
    const rawEnergy = audioState?.energy || 0;
    const rawBands = audioState?.bands || [];

    const rhythmFloor = isPlaying ? 0.16 + 0.12 * Math.sin(nowSec * 4.2) : 0;
    const targetBass = Math.max(rawBass, rhythmFloor);

    // Fast attack, smooth decay for visible beat swells
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
      const tiltX = Math.sin(nowSec * 0.7) * 1.5 - this.pointerY * 11;
      const tiltY = Math.sin(nowSec * 0.42) * 1.5 + this.pointerX * 13;
      this.centerArtRingEl.style.transform = `perspective(700px) rotateX(${(8 + tiltX).toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      this.radCanvas.style.transform = `perspective(900px) rotateX(${(13 - this.pointerY * 9).toFixed(2)}deg) rotateY(${(this.pointerX * 11).toFixed(2)}deg) rotateZ(-7deg)`;
      this.centerArtRingEl.style.boxShadow = `0 0 ${glow}px rgba(255,252,245,${(0.22 + this.smoothBass * 0.45).toFixed(2)}), inset 0 0 18px rgba(0,0,0,0.65)`;
    }

    this.conCanvas.style.transform = `perspective(1500px) rotateX(${(-this.pointerY * 2.6).toFixed(2)}deg) rotateY(${(this.pointerX * 2.6).toFixed(2)}deg) scale(1.035)`;

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

    // 1. Twinkling deep-sky starfield
    for (const s of this.stars) {
      const sx = ((((s.x + nowSec * s.driftX) % 1) + 1) % 1) * w - this.pointerX * s.depth * 38;
      const sy = ((((s.y + nowSec * s.driftY) % 1) + 1) % 1) * h - this.pointerY * s.depth * 30;
      const twinkle = 0.55 + 0.45 * Math.sin(nowSec * s.speed + s.phase);
      const alpha = s.baseAlpha * twinkle * (0.75 + energy * 0.65);
      ctx.fillStyle = `rgba(255, 252, 245, ${alpha.toFixed(3)})`;
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
      sg.addColorStop(0, `rgba(255, 253, 248, ${alpha})`);
      sg.addColorStop(1, "rgba(255, 253, 248, 0)");
      ctx.strokeStyle = sg;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }

    // 2. Curved Black-Panther-style glowing claws/fangs framing the top clock
    this._renderCurvedClaws(ctx, w, h, nowSec, bass, isPlaying, glowIntensity);
    this._renderCornerFrames(ctx, w, h, nowSec, bass, isPlaying, glowIntensity);

    // 3. A fine perimeter beam that travels around the screen and blooms on each beat.
    const bassCurve = Math.pow(bass, 0.85);
    const swellDepth = isPlaying ? (8 + bassCurve * 58) * glowIntensity : 7 * glowIntensity;
    const swellAlpha = isPlaying ? Math.min(0.36, (0.07 + bassCurve * 0.28) * glowIntensity) : 0.045 * glowIntensity;

    const topG = ctx.createLinearGradient(0, 0, 0, swellDepth);
    topG.addColorStop(0, `rgba(255, 252, 244, ${swellAlpha})`);
    topG.addColorStop(0.35, `rgba(255, 250, 238, ${swellAlpha * 0.35})`);
    topG.addColorStop(1, "rgba(255, 252, 244, 0)");
    ctx.fillStyle = topG;
    ctx.fillRect(0, 0, w, swellDepth);

    const botG = ctx.createLinearGradient(0, h, 0, h - swellDepth);
    botG.addColorStop(0, `rgba(255, 252, 244, ${swellAlpha})`);
    botG.addColorStop(0.35, `rgba(255, 250, 238, ${swellAlpha * 0.35})`);
    botG.addColorStop(1, "rgba(255, 252, 244, 0)");
    ctx.fillStyle = botG;
    ctx.fillRect(0, h - swellDepth, w, swellDepth);

    const leftG = ctx.createLinearGradient(0, 0, swellDepth, 0);
    leftG.addColorStop(0, `rgba(255, 252, 244, ${swellAlpha})`);
    leftG.addColorStop(0.35, `rgba(255, 250, 238, ${swellAlpha * 0.35})`);
    leftG.addColorStop(1, "rgba(255, 252, 244, 0)");
    ctx.fillStyle = leftG;
    ctx.fillRect(0, 0, swellDepth, h);

    const rightG = ctx.createLinearGradient(w, 0, w - swellDepth, 0);
    rightG.addColorStop(0, `rgba(255, 252, 244, ${swellAlpha})`);
    rightG.addColorStop(0.35, `rgba(255, 250, 238, ${swellAlpha * 0.35})`);
    rightG.addColorStop(1, "rgba(255, 252, 244, 0)");
    ctx.fillStyle = rightG;
    ctx.fillRect(w - swellDepth, 0, swellDepth, h);

    // Inset rounded frame, like a light strip sitting just inside the display bezel.
    const rimAlpha = isPlaying
      ? Math.min(1.0, (0.58 + bassCurve * 0.42) * glowIntensity)
      : 0.3 * glowIntensity;
    const inset = Math.max(10, Math.min(w, h) * 0.012);
    const frameW = w - inset * 2;
    const frameH = h - inset * 2;
    const radius = Math.min(10, frameW * 0.02, frameH * 0.02);
    const traceFrame = () => {
      ctx.beginPath();
      ctx.moveTo(inset + radius, inset);
      ctx.lineTo(w - inset - radius, inset);
      ctx.quadraticCurveTo(w - inset, inset, w - inset, inset + radius);
      ctx.lineTo(w - inset, h - inset - radius);
      ctx.quadraticCurveTo(w - inset, h - inset, w - inset - radius, h - inset);
      ctx.lineTo(inset + radius, h - inset);
      ctx.quadraticCurveTo(inset, h - inset, inset, h - inset - radius);
      ctx.lineTo(inset, inset + radius);
      ctx.quadraticCurveTo(inset, inset, inset + radius, inset);
      ctx.closePath();
    };

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = `rgba(255, 229, 177, ${rimAlpha * 0.72})`;
    ctx.lineWidth = isPlaying ? 2.2 + bassCurve * 7 : 1.8;
    ctx.shadowColor = "rgba(255, 239, 204, 1)";
    ctx.shadowBlur = isPlaying ? 14 + bassCurve * 34 : 9;
    traceFrame();
    ctx.stroke();

    // White-hot filament at the center of the warm outer bloom.
    ctx.shadowBlur = isPlaying ? 7 + bassCurve * 16 : 4;
    ctx.lineWidth = isPlaying ? 1.15 + bassCurve * 1.6 : 1;
    ctx.strokeStyle = `rgba(255, 255, 255, ${rimAlpha})`;
    traceFrame();
    ctx.stroke();

    // Traveling highlights move around the frame; the bass makes each one bloom.
    const sweepCount = 2;
    for (let s = 0; s < sweepCount; s++) {
      const tHead = (nowSec * (0.11 + s * 0.035) + s / sweepCount) % 1;
      const segLen = 0.075;
      ctx.beginPath();
      const steps = 28;
      for (let k = 0; k <= steps; k++) {
        const pt = this._perimPoint(tHead + (k / steps) * segLen, frameW, frameH);
        if (k === 0) ctx.moveTo(pt.x + inset, pt.y + inset);
        else ctx.lineTo(pt.x + inset, pt.y + inset);
      }
      ctx.strokeStyle = `rgba(255, 255, 255, ${(isPlaying ? 0.62 + bassCurve * 0.38 : 0.22) * glowIntensity})`;
      ctx.lineWidth = isPlaying ? 2.5 + bassCurve * 5.5 : 1.6;
      ctx.shadowColor = "rgba(255, 244, 220, 1)";
      ctx.shadowBlur = isPlaying ? 18 + bassCurve * 34 : 9;
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore();
  }

  _renderCurvedClaws(ctx, w, h, nowSec, bass, isPlaying, glowIntensity) {
    const clawCount = 8;
    const cx = w * 0.5;
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
      grad.addColorStop(0, `rgba(255, 252, 242, ${alpha})`);
      grad.addColorStop(0.55, `rgba(235, 224, 198, ${alpha * 0.72})`);
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.save();
      ctx.fillStyle = grad;
      ctx.shadowColor = `rgba(255, 246, 220, ${alpha * 0.75})`;
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

  _renderCornerFrames(ctx, w, h, nowSec, bass, isPlaying, glowIntensity) {
    const inset = Math.max(22, Math.min(w, h) * 0.035);
    const arm = Math.min(118, Math.max(58, Math.min(w, h) * 0.12));
    const pulse = isPlaying ? 0.68 + bass * 0.32 : 0.42 + Math.sin(nowSec * 0.8) * 0.05;
    const corners = [
      { x: inset, y: inset, sx: 1, sy: 1 },
      { x: w - inset, y: inset, sx: -1, sy: 1 },
      { x: inset, y: h - inset, sx: 1, sy: -1 },
      { x: w - inset, y: h - inset, sx: -1, sy: -1 },
    ];
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";
    for (const c of corners) {
      const shimmer = 0.86 + Math.sin(nowSec * 1.6 + c.x * 0.01 + c.y * 0.01) * 0.14;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.sx, c.sy);
      const grad = ctx.createLinearGradient(0, 0, arm, arm * 0.28);
      grad.addColorStop(0, `rgba(255,255,255,${pulse * shimmer})`);
      grad.addColorStop(0.58, `rgba(173,205,255,${pulse * 0.48})`);
      grad.addColorStop(1, "rgba(173,205,255,0)");
      ctx.strokeStyle = grad;
      ctx.shadowColor = "rgba(154,195,255,0.9)";
      ctx.shadowBlur = 12 + bass * 20;
      ctx.lineWidth = 1.35 + bass * 0.8;
      ctx.beginPath();
      ctx.moveTo(0, arm);
      ctx.lineTo(0, 13);
      ctx.quadraticCurveTo(0, 0, 13, 0);
      ctx.lineTo(arm, 0);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(227,239,255,${pulse * 0.85})`;
      ctx.beginPath();
      ctx.arc(7, 7, 2.1 + bass * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${pulse * 0.52})`;
      ctx.fillRect(20, 8, 18, 1);
      ctx.fillRect(8, 20, 1, 18);
      ctx.restore();
    }
    ctx.restore();
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
      ctx.shadowColor = "rgba(255, 252, 242, 0.85)";
      ctx.shadowBlur = glowBlur;
      ctx.stroke();
      ctx.restore();
    };

    const outerRing = buildRingPoints(0.8, 1.05, 10);
    drawSmoothClosedSpline(
      outerRing,
      `rgba(255, 248, 232, ${isPlaying ? 0.34 + bass * 0.4 : 0.16})`,
      1.5,
      14,
      `rgba(255, 250, 240, ${isPlaying ? 0.04 + bass * 0.06 : 0.02})`
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
      `rgba(220, 232, 255, ${isPlaying ? 0.45 + bass * 0.35 : 0.2})`,
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
      ctx.fillStyle = `rgba(255, 252, 244, ${(isPlaying ? 0.68 : 0.3) * twinkle})`;
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

    const originX = w * 0.5 - this.camX;
    const originY = h * 0.56 - this.camY;

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

      ctx.strokeStyle = `rgba(255, 255, 255, ${0.42 * fade})`;
      ctx.lineWidth = i === activeIdx || i + 1 === activeIdx ? 2.1 : 1.3;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();

      if (i + 2 <= windowEnd && i % 3 === 0) {
        const c = this.nodes[i + 2];
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.14 * fade})`;
        ctx.lineWidth = 1.0;
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
        const r = 20 * pulse;

        ctx.save();
        ctx.shadowColor = "rgba(255, 255, 255, 0.95)";
        ctx.shadowBlur = 18;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.94)";
        ctx.lineWidth = 1.8;

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
        ctx.arc(nx, ny, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.font = '600 34px "Segoe UI", "Inter", sans-serif';
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
        ctx.shadowColor = "rgba(255, 255, 255, 0.45)";
        ctx.shadowBlur = 14;
        ctx.fillText(node.text, nx, ny + 54);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
        ctx.beginPath();
        ctx.arc(nx, ny, 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '400 17px "Segoe UI", "Inter", sans-serif';
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.72})`;
        ctx.fillText(node.text, nx, ny + 22);
      }
    }

    ctx.restore();
  }
}

window.NightConstellationRenderer = NightConstellationRenderer;
