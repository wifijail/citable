'use client';

import { useEffect, useRef } from 'react';
import { AI_CRAWLERS } from '@/lib/audit/crawlers';
import { cn } from '@/lib/cn';

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Satellite {
  name: string;
  purpose: 'retrieval' | 'indexing' | 'training';
  radius: number;
  inclination: number;
  node: number;
  phase: number;
  speed: number;
}

interface Ping {
  from: number;
  target: Vec3;
  startedAt: number;
}

type Rgb = string; // "r g b" straight from the CSS variables

const PING_MS = 1400;
const CAMERA = 3.4;

/** Evenly distributed points on a unit sphere (Fibonacci lattice). */
function fibonacciSphere(count: number): Vec3[] {
  const points: Vec3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    points.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
  }
  return points;
}

function rotate(point: Vec3, rotY: number, rotX: number): Vec3 {
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const x1 = point.x * cosY + point.z * sinY;
  const z1 = -point.x * sinY + point.z * cosY;
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  return { x: x1, y: point.y * cosX - z1 * sinX, z: point.y * sinX + z1 * cosX };
}

/** Position of a satellite on its tilted circular orbit at time `t` (seconds). */
function orbitPosition(sat: Satellite, t: number): Vec3 {
  const angle = sat.phase + t * sat.speed;
  const flat = { x: Math.cos(angle) * sat.radius, y: 0, z: Math.sin(angle) * sat.radius };
  const inclined = rotate({ x: flat.x, y: flat.y, z: flat.z }, 0, sat.inclination);
  return rotate(inclined, sat.node, 0);
}

function readColor(name: string, fallback: Rgb): Rgb {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * A rotating point-cloud globe with the 16 AI agents on orbital rings, pinging
 * the surface — a literal picture of what the scanner checks. Rendered on a 2D
 * canvas with hand-rolled 3D projection: no WebGL, no dependencies.
 */
export function CrawlerGlobe({ className, label }: { className?: string; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const compact = window.matchMedia('(max-width: 640px)').matches;
    const points = fibonacciSphere(compact ? 320 : 560);

    const rings = { retrieval: 1.38, indexing: 1.62, training: 1.86 } as const;
    const counters = { retrieval: 0, indexing: 0, training: 0 };
    const totals = {
      retrieval: AI_CRAWLERS.filter((c) => c.purpose === 'retrieval').length,
      indexing: AI_CRAWLERS.filter((c) => c.purpose === 'indexing').length,
      training: AI_CRAWLERS.filter((c) => c.purpose === 'training').length,
    };
    const satellites: Satellite[] = AI_CRAWLERS.map((crawler) => {
      const index = counters[crawler.purpose]++;
      const ringIndex = Object.keys(rings).indexOf(crawler.purpose);
      return {
        name: crawler.name,
        purpose: crawler.purpose,
        radius: rings[crawler.purpose],
        inclination: 0.35 + ringIndex * 0.32,
        node: ringIndex * 1.1,
        phase: (index / totals[crawler.purpose]) * Math.PI * 2,
        speed: 0.22 - ringIndex * 0.05,
      };
    });

    let colors = { accent: '104 66 255', mint: '5 150 120', fg: '17 16 28' };
    const refreshColors = () => {
      colors = {
        accent: readColor('--accent', colors.accent),
        mint: readColor('--mint', colors.mint),
        fg: readColor('--fg', colors.fg),
      };
    };
    refreshColors();
    const themeObserver = new MutationObserver(refreshColors);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reducedMotion) draw(performance.now());
    };

    // Interaction state: drag to spin, with inertia; hover tilts slightly.
    let rotY = 0.6;
    let rotX = -0.32;
    let velocity = 0.0035;
    let targetTilt = -0.32;
    let dragging = false;
    let lastX = 0;

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      canvas.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetTilt = -0.32 + ((event.clientY - rect.top) / rect.height - 0.5) * 0.5;
      if (!dragging) return;
      const delta = event.clientX - lastX;
      lastX = event.clientX;
      rotY += delta * 0.008;
      velocity = delta * 0.0009;
    };
    const onPointerUp = () => {
      dragging = false;
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    const pings: Ping[] = [];
    let lastPing = 0;

    function project(point: Vec3, radius: number) {
      const scale = CAMERA / (CAMERA - point.z);
      return { x: width / 2 + point.x * radius * scale, y: height / 2 + point.y * radius * scale, scale };
    }

    function draw(now: number) {
      if (!context || width === 0) return;
      const t = now / 1000;
      const radius = Math.min(width, height) * 0.27;
      context.clearRect(0, 0, width, height);

      // Soft glow behind the sphere.
      const glow = context.createRadialGradient(width / 2, height / 2, radius * 0.2, width / 2, height / 2, radius * 1.9);
      glow.addColorStop(0, `rgb(${colors.accent} / 0.22)`);
      glow.addColorStop(1, `rgb(${colors.accent} / 0)`);
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      // Orbit rings.
      for (const [purpose, ringRadius] of Object.entries(rings)) {
        const sample = satellites.find((s) => s.purpose === purpose);
        if (!sample) continue;
        context.beginPath();
        for (let step = 0; step <= 96; step++) {
          const angle = (step / 96) * Math.PI * 2;
          const onOrbit = rotate(
            rotate({ x: Math.cos(angle) * ringRadius, y: 0, z: Math.sin(angle) * ringRadius }, 0, sample.inclination),
            sample.node,
            0,
          );
          const p = project(rotate(onOrbit, rotY, rotX), radius);
          if (step === 0) context.moveTo(p.x, p.y);
          else context.lineTo(p.x, p.y);
        }
        context.strokeStyle = `rgb(${colors.fg} / 0.07)`;
        context.lineWidth = 1;
        context.stroke();
      }

      // Sphere points, back to front.
      const projected = points.map((point) => rotate(point, rotY, rotX));
      projected.sort((a, b) => a.z - b.z);
      for (const point of projected) {
        const p = project(point, radius);
        const depth = (point.z + 1) / 2;
        context.beginPath();
        context.arc(p.x, p.y, (0.6 + depth * 1.1) * p.scale, 0, Math.PI * 2);
        context.fillStyle =
          depth > 0.5 ? `rgb(${colors.accent} / ${0.25 + depth * 0.65})` : `rgb(${colors.fg} / ${0.05 + depth * 0.2})`;
        context.fill();
      }

      // Satellites and their labels.
      const satellitePositions = satellites.map((sat) => rotate(orbitPosition(sat, reducedMotion ? 0 : t), rotY, rotX));

      // Spawn a ping from a random front-facing satellite to the visible hemisphere.
      if (!reducedMotion && now - lastPing > 520) {
        lastPing = now;
        const candidates = satellitePositions
          .map((position, index) => ({ position, index }))
          .filter((entry) => entry.position.z > -0.2);
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        const surface = points[Math.floor(Math.random() * points.length)];
        if (pick && surface) pings.push({ from: pick.index, target: surface, startedAt: now });
      }

      for (let i = pings.length - 1; i >= 0; i--) {
        const ping = pings[i];
        if (!ping) continue;
        const progress = (now - ping.startedAt) / PING_MS;
        const origin = satellitePositions[ping.from];
        if (progress >= 1 || !origin) {
          pings.splice(i, 1);
          continue;
        }
        const target = rotate(ping.target, rotY, rotX);
        const a = project(origin, radius);
        const b = project(target, radius);
        const eased = 1 - Math.pow(1 - progress, 3);
        const x = a.x + (b.x - a.x) * eased;
        const y = a.y + (b.y - a.y) * eased;

        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(x, y);
        context.strokeStyle = `rgb(${colors.mint} / ${0.35 * (1 - progress)})`;
        context.lineWidth = 1;
        context.stroke();

        context.beginPath();
        context.arc(x, y, 2.2, 0, Math.PI * 2);
        context.fillStyle = `rgb(${colors.mint} / ${1 - progress * 0.6})`;
        context.fill();
      }

      satellites.forEach((sat, index) => {
        const position = satellitePositions[index];
        if (!position) return;
        const p = project(position, radius);
        const depth = (position.z + 1.9) / 3.8;
        const color = sat.purpose === 'retrieval' ? colors.mint : sat.purpose === 'indexing' ? colors.accent : colors.fg;

        context.beginPath();
        context.arc(p.x, p.y, (2.4 + depth * 2.2) * p.scale, 0, Math.PI * 2);
        context.fillStyle = `rgb(${color} / ${0.35 + depth * 0.65})`;
        context.fill();

        if (position.z > 0.15 && (!compact || index % 3 === 0)) {
          context.font = `500 ${compact ? 10 : 11}px ui-monospace, SFMono-Regular, Consolas, monospace`;
          context.fillStyle = `rgb(${colors.fg} / ${Math.min(0.85, position.z * 0.9)})`;
          // Flip the label to the left near the right edge so it is never clipped.
          const flip = p.x + 8 + context.measureText(sat.name).width > width - 4;
          context.textAlign = flip ? 'right' : 'left';
          context.fillText(sat.name, flip ? p.x - 8 : p.x + 8, p.y + 4);
        }
      });
    }

    let frame = 0;
    let running = false;
    const loop = (now: number) => {
      if (!dragging) {
        rotY += velocity;
        velocity += (0.0035 - velocity) * 0.02; // ease back to idle spin
      }
      rotX += (targetTilt - rotX) * 0.04;
      draw(now);
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || reducedMotion) return;
      running = true;
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    // Only animate while visible and the tab is in the foreground.
    const visibility = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !document.hidden) start();
      else stop();
    });
    visibility.observe(canvas);
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);

    if (reducedMotion) draw(performance.now());

    return () => {
      stop();
      resizeObserver.disconnect();
      visibility.disconnect();
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      className={cn('h-full w-full cursor-grab touch-pan-y active:cursor-grabbing', className)}
    />
  );
}
