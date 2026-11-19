import math
import random


class GalaxyParticle:
    def __init__(self, width: float, height: float) -> None:
        self.base_x = random.uniform(0, width)
        self.base_y = random.uniform(0, height)
        self.x = self.base_x
        self.y = self.base_y
        self.z = random.uniform(0.25, 1.0)
        self.vx = 0.0
        self.vy = 0.0
        self.orbit_angle = random.uniform(0, math.tau)
        self.orbit_speed = random.uniform(0.004, 0.015) * self.z

    def step(
        self,
        width: float,
        height: float,
        mx: float,
        my: float,
        mvx: float,
        mvy: float,
        pull_strength: float,
        bass: float,
        dt: float,
    ) -> None:
        self.orbit_angle += self.orbit_speed * (1.0 + bass * 0.8) * dt * 60.0
        target_x = self.base_x + math.cos(self.orbit_angle) * 14.0 * self.z
        target_y = self.base_y + math.sin(self.orbit_angle) * 14.0 * self.z

        ax = (target_x - self.x) * 0.035
        ay = (target_y - self.y) * 0.035

        dx = mx - self.x
        dy = my - self.y
        dist_sq = dx * dx + dy * dy + 120.0
        dist = math.sqrt(dist_sq)
        radius = 260.0 * self.z

        if dist < radius:
            factor = (1.0 - dist / radius) * pull_strength * self.z
            nx, ny = dx / dist, dy / dist
            tx, ty = -ny, nx
            ax += nx * factor * 0.85 + tx * factor * 0.65
            ay += ny * factor * 0.85 + ty * factor * 0.65

            pointer_speed = math.hypot(mvx, mvy)
            if pointer_speed > 8.0:
                ax += mvx * 0.04 * factor
                ay += mvy * 0.04 * factor

        self.vx = (self.vx + ax * dt * 60.0) * 0.90
        self.vy = (self.vy + ay * dt * 60.0) * 0.90
        self.x = (self.x + self.vx * dt * 60.0) % width
        self.y = (self.y + self.vy * dt * 60.0) % height


class MagneticGalaxyField:
    def __init__(self, width: int, height: int, count: int = 160) -> None:
        self.width = width
        self.height = height
        self.particles = [GalaxyParticle(width, height) for _ in range(count)]

    def sync_count(self, target_count: int) -> None:
        cur = len(self.particles)
        if cur < target_count:
            self.particles.extend(GalaxyParticle(self.width, self.height) for _ in range(target_count - cur))
        elif cur > target_count:
            del self.particles[target_count:]

    def update(self, ctx, dt: float) -> list[tuple[float, float, float, float]]:
        with ctx.lock:
            count = ctx.settings.particle_count
            pull = ctx.settings.magnetic_pull
            mx = ctx.state.mouse_x * self.width
            my = ctx.state.mouse_y * self.height
            mvx = ctx.state.mouse_vx * self.width
            mvy = ctx.state.mouse_vy * self.height
            bass = ctx.state.bass_energy

        self.sync_count(count)
        rendered = []
        for p in self.particles:
            p.step(self.width, self.height, mx, my, mvx, mvy, pull, bass, dt)
            size = (1.6 + p.z * 3.4) * (1.0 + bass * 0.25)
            alpha = min(1.0, 0.25 + p.z * 0.75)
            rendered.append((p.x, p.y, size, alpha))
        return rendered
