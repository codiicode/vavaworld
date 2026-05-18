'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection } from 'geojson';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { CITIES, type City } from './landing-cities';

/**
 * Orthographic globe rendered to canvas at 1400x1400 (downscaled by CSS).
 * Auto-rotates ~5°/sec continuously; drag nudges it on top of the spin.
 * Draws great-circle paths between random visible city pairs (the `arcQueue`).
 */
type WorldTopo = Topology<{ land: GeometryCollection; countries: GeometryCollection }>;

export function Globe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const radius = Math.min(W, H) / 2 - 60;
    const DEEP = '#1d5e95';

    let land: Feature | FeatureCollection | null = null;
    let countries: Feature | FeatureCollection | null = null;

    let cancelled = false;
    fetch('/countries-110m.json')
      .then((r) => r.json() as Promise<WorldTopo>)
      .then((world) => {
        if (cancelled) return;
        land = feature(world, world.objects.land) as Feature | FeatureCollection;
        countries = feature(world, world.objects.countries) as Feature | FeatureCollection;
      })
      .catch(() => { /* offline ok */ });

    const projection = d3.geoOrthographic().scale(radius).translate([cx, cy]).clipAngle(90);
    const path = d3.geoPath(projection, ctx);

    let lambda = 0;
    let dragging = false;
    let dragLast: { x: number; y: number } | null = null;
    const TILT = -14;

    type Arc = { a: City; b: City; t: number; dur: number };
    const arcQueue: Arc[] = [];
    for (let i = 0; i < 4; i++) {
      const a = pickCity();
      let b = a;
      while (b === a) b = pickCity();
      arcQueue.push({ a, b, t: Math.random() * 1.5, dur: 1.9 + Math.random() * 0.5 });
    }

    function pickCity() { return CITIES[Math.floor(Math.random() * CITIES.length)]; }

    function isVisible(lon: number, lat: number) {
      const rot = projection.rotate();
      const lambda0 = -rot[0] * Math.PI / 180;
      const phi0 = -rot[1] * Math.PI / 180;
      const lam = lon * Math.PI / 180;
      const phi = lat * Math.PI / 180;
      return Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lam - lambda0) > 0;
    }

    function drawArc(a: City, b: City, prog: number) {
      if (!ctx) return;
      // Both endpoints must be on the near hemisphere, otherwise the line
      // has no business being drawn at all.
      if (!isVisible(a.lon, a.lat) || !isVisible(b.lon, b.lat)) return;
      // Trace the great-circle path that hugs the surface from dot to dot.
      // Sampling per-point and skipping anything on the far side keeps the
      // line on the sphere — no screen-space bezier ballooning into the sky.
      const interp = d3.geoInterpolate([a.lon, a.lat], [b.lon, b.lat]);
      const N = 80;
      const end = Math.max(1, Math.floor(N * prog));
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(29,94,149,0.78)';
      ctx.beginPath();
      let penDown = false;
      for (let i = 0; i <= end; i++) {
        const [lon, lat] = interp(i / N);
        if (!isVisible(lon, lat)) { penDown = false; continue; }
        const p = projection([lon, lat]);
        if (!p) { penDown = false; continue; }
        if (!penDown) { ctx.moveTo(p[0], p[1]); penDown = true; }
        else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
      if (prog < 1) {
        const [lon, lat] = interp(prog);
        if (isVisible(lon, lat)) {
          const ph = projection([lon, lat]);
          if (ph) {
            ctx.beginPath();
            ctx.arc(ph[0], ph[1], 4, 0, Math.PI * 2);
            ctx.fillStyle = DEEP;
            ctx.fill();
          }
        }
      }
    }

    function drawScene(dt: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      projection.rotate([lambda, TILT, 0]);

      ctx.beginPath();
      path({ type: 'Sphere' });
      const g = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.35, radius * 0.2, cx, cy, radius * 1.05);
      g.addColorStop(0, '#e7f2fb');
      g.addColorStop(0.55, '#a9d2ee');
      g.addColorStop(1, '#5a9dc8');
      ctx.fillStyle = g;
      ctx.fill();

      ctx.beginPath();
      path(d3.geoGraticule10());
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.stroke();

      if (land) {
        ctx.beginPath();
        path(land);
        ctx.fillStyle = 'rgba(255,255,255,0.94)';
        ctx.fill();
      }
      if (countries) {
        ctx.beginPath();
        path(countries);
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = 'rgba(29,94,149,0.32)';
        ctx.stroke();
      }

      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(29,94,149,0.55)';
      ctx.stroke();

      // Supporting cities — small dots, arc endpoints.
      CITIES.forEach((c) => {
        if (c.major || !isVisible(c.lon, c.lat)) return;
        const p = projection([c.lon, c.lat]);
        if (!p) return;
        ctx.beginPath();
        ctx.arc(p[0], p[1], 2.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(29,94,149,0.55)';
        ctx.fill();
      });

      // Major world cities — ringed marker + label, drawn on top.
      ctx.font = '600 25px "Inter", system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      CITIES.forEach((c) => {
        if (!c.major || !isVisible(c.lon, c.lat)) return;
        const p = projection([c.lon, c.lat]);
        if (!p) return;
        const [x, y] = p;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = 'rgba(29,94,149,0.5)';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 4.4, 0, Math.PI * 2);
        ctx.fillStyle = DEEP;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 1.7, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        // Flip the label to the inner side near the right limb so it
        // doesn't run off the visible hemisphere.
        const left = x > cx;
        ctx.textAlign = left ? 'right' : 'left';
        const lx = x + (left ? -14 : 14);
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.strokeText(c.name, lx, y);
        ctx.fillStyle = DEEP;
        ctx.fillText(c.name, lx, y);
      });
      ctx.textAlign = 'left';

      for (let i = arcQueue.length - 1; i >= 0; i--) {
        const arc = arcQueue[i];
        arc.t += dt / arc.dur;
        ctx.save();
        if (arc.t > 1.3) ctx.globalAlpha = Math.max(0, 1 - (arc.t - 1.3) / 0.7);
        drawArc(arc.a, arc.b, Math.min(1, arc.t));
        ctx.restore();
        if (arc.t > 2.0) arcQueue.splice(i, 1);
      }

      // Occasionally spawn a fresh arc so the queue doesn't drain
      if (Math.random() < 0.012) {
        const a = pickCity();
        let b = a;
        while (b === a) b = pickCity();
        arcQueue.push({ a, b, t: 0, dur: 1.9 + Math.random() * 0.5 });
      }
    }

    let last = performance.now();
    let raf = 0;
    function loop(t: number) {
      const dt = (t - last) / 1000;
      last = t;
      // Always auto-rotate — hover/idle no longer pauses the globe. Drag still
      // nudges it on top of the continuous spin.
      lambda = (lambda + dt * 5) % 360;
      drawScene(dt);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    const onDown = (e: MouseEvent) => {
      dragging = true;
      dragLast = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => { dragging = false; };
    const onMove = (e: MouseEvent) => {
      if (!dragging || !dragLast) return;
      lambda = (lambda + (e.clientX - dragLast.x) * 0.4) % 360;
      dragLast = { x: e.clientX, y: e.clientY };
    };
    wrap.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      wrap.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <div ref={wrapRef} className="l-globe-wrap">
      <canvas ref={canvasRef} width={1400} height={1400} />
    </div>
  );
}
