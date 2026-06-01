'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as d3 from 'd3-geo';
import { feature } from 'topojson-client';
import { latLngToCell } from 'h3-js';
import type { Feature, FeatureCollection } from 'geojson';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { CITIES, type City } from './landing-cities';
import { subscribeClaimPings, type ClaimPing } from '@/lib/claim-pings';
import { HEX_RES } from '@/lib/h3-utils';

/**
 * Orthographic globe rendered to canvas at 1400x1400 (downscaled by CSS).
 * Auto-rotates ~5°/sec continuously; drag nudges it on top of the spin.
 * Draws great-circle paths between random visible city pairs (the `arcQueue`).
 */
type WorldTopo = Topology<{ land: GeometryCollection; countries: GeometryCollection }>;

export function Globe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
    // Vertical rotation (latitude tilt). Drag changes it freely; clamped so the
    // poles can be brought into view but the globe never flips upside down.
    let tilt = -14;

    type Arc = { a: City; b: City; t: number; dur: number };
    const arcQueue: Arc[] = [];
    for (let i = 0; i < 4; i++) {
      const a = pickCity();
      let b = a;
      while (b === a) b = pickCity();
      arcQueue.push({ a, b, t: Math.random() * 1.5, dur: 1.9 + Math.random() * 0.5 });
    }

    function pickCity() { return CITIES[Math.floor(Math.random() * CITIES.length)]; }

    // Live claim flashes - a hex was just bought somewhere, light up that exact
    // spot. Fed by the shared ping stream (Supabase Realtime + local + mock).
    // Each flash carries the claim meta so hovering it reveals who/what/price.
    type Flash = {
      lon: number;
      lat: number;
      t: number;
      meta: ClaimPing;
      sx: number;
      sy: number;
      vis: boolean;
    };
    const flashes: Flash[] = [];
    // A claim stays pinned on the globe for a full minute. PING_DUR is just the
    // short intro pulse (expanding ring); after that the marker + card hold
    // steady until the last FADE_OUT seconds, then fade away.
    const FLASH_TTL = 60;
    const PING_DUR = 2.0;
    const FADE_OUT = 2.0;
    const unsubPings = subscribeClaimPings((p) => {
      if (flashes.length < 40) flashes.push({ lon: p.lon, lat: p.lat, t: 0, meta: p, sx: 0, sy: 0, vis: false });
    });

    // Pointer in canvas-internal (1400-space) coordinates, plus which flash the
    // pointer is currently parked on. Hover freezes that flash AND pauses the
    // globe spin so the card stays readable.
    let pointer: { x: number; y: number } | null = null;
    let hovered: Flash | null = null;

    function roundRect(x: number, y: number, w: number, h: number, r: number) {
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function hexIcon(hx: number, hy: number, r: number, color: string) {
      if (!ctx) return;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const ang = (Math.PI / 3) * k - Math.PI / 2;
        const px = hx + r * Math.cos(ang);
        const py = hy + r * Math.sin(ang);
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    // Draw the claim card anchored above the flash point. Compact = handle only;
    // expanded (on hover) adds the hex count, city and price.
    function drawCard(fl: Flash, expanded: boolean, alpha: number) {
      if (!ctx) return;
      const m = fl.meta;
      const title = m.handle ? `@${m.handle}` : 'someone';
      const hx = m.hexes ?? 1;
      const where = m.city ? ` · ${m.city}` : '';
      const sub = `${hx} hex${hx > 1 ? 'es' : ''}${where}`;
      const price = typeof m.priceSol === 'number' ? `◎ ${m.priceSol.toFixed(2)} SOL` : null;

      const PAD = 16;
      const ICON = 13;
      const titleFont = '700 24px "Inter", system-ui, sans-serif';
      const subFont = '500 19px "Inter", system-ui, sans-serif';
      const priceFont = '700 21px "Inter", system-ui, sans-serif';

      ctx.font = titleFont;
      let w = ICON * 2 + 10 + ctx.measureText(title).width;
      let h = 44;
      if (expanded) {
        ctx.font = subFont;
        w = Math.max(w, ctx.measureText(sub).width);
        if (price) {
          ctx.font = priceFont;
          w = Math.max(w, ctx.measureText(price).width);
        }
        h = price ? 112 : 84;
      }
      const boxW = w + PAD * 2;
      const boxH = h;
      const bx = fl.sx - boxW / 2;
      const by = fl.sy - 30 - boxH;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Connector from the point up to the card.
      ctx.beginPath();
      ctx.moveTo(fl.sx, fl.sy - 8);
      ctx.lineTo(fl.sx, by + boxH);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(45,212,191,0.7)';
      ctx.stroke();

      ctx.shadowColor = 'rgba(8,30,52,0.35)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 5;
      roundRect(bx, by, boxW, boxH, 14);
      ctx.fillStyle = 'rgba(13,52,86,0.94)';
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(45,212,191,0.55)';
      ctx.stroke();

      const tx = bx + PAD;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      // Title row with hex icon.
      hexIcon(tx + ICON, by + PAD + 11, ICON, '#5eead4');
      ctx.font = titleFont;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(title, tx + ICON * 2 + 10, by + PAD);

      if (expanded) {
        ctx.font = subFont;
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        ctx.fillText(sub, tx, by + PAD + 34);
        if (price) {
          ctx.font = priceFont;
          ctx.fillStyle = '#5eead4';
          ctx.fillText(price, tx, by + PAD + 64);
        }
      }
      ctx.restore();
    }

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
      // line on the sphere - no screen-space bezier ballooning into the sky.
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
      projection.rotate([lambda, tilt, 0]);

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

      // Supporting cities - small dots, arc endpoints.
      CITIES.forEach((c) => {
        if (c.major || !isVisible(c.lon, c.lat)) return;
        const p = projection([c.lon, c.lat]);
        if (!p) return;
        ctx.beginPath();
        ctx.arc(p[0], p[1], 2.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(29,94,149,0.55)';
        ctx.fill();
      });

      // Major world cities - ringed marker + label, drawn on top.
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

      // ── Live claim flashes + hover cards ─────────────────────────────
      // 1. Age each flash (frozen while hovered) and project it to screen.
      for (const fl of flashes) {
        if (fl !== hovered) fl.t += dt;
        fl.vis = isVisible(fl.lon, fl.lat);
        if (fl.vis) {
          const fp = projection([fl.lon, fl.lat]);
          if (fp) { fl.sx = fp[0]; fl.sy = fp[1]; }
          else fl.vis = false;
        }
      }
      // 2. Resolve hover with hysteresis: small radius to grab, larger to keep
      //    (so the pointer can travel up onto the card without losing it).
      const ENTER_R = 80;
      const STAY_R = 170;
      let cand: Flash | null = null;
      let candD = Infinity;
      if (pointer) {
        for (const fl of flashes) {
          if (!fl.vis) continue;
          const d = Math.hypot(pointer.x - fl.sx, pointer.y - fl.sy);
          const r = fl === hovered ? STAY_R : ENTER_R;
          if (d < r && d < candD) { cand = fl; candD = d; }
        }
      }
      hovered = cand;
      if (canvas) canvas.style.cursor = hovered ? 'pointer' : dragging ? 'grabbing' : 'grab';
      // 3. Retire expired flashes (never the frozen/hovered one).
      for (let i = flashes.length - 1; i >= 0; i--) {
        if (flashes[i] !== hovered && flashes[i].t / FLASH_TTL >= 1) flashes.splice(i, 1);
      }
      // 4. Ring + core for every alive, visible flash. A one-shot intro ring
      //    expands over PING_DUR; the marker dot then stays put for the whole
      //    minute and only the closing FADE_OUT dims it.
      for (const fl of flashes) {
        if (!fl.vis) continue;
        const isHov = fl === hovered;
        const ping = Math.min(1, fl.t / PING_DUR); // 0→1 intro
        const lifeFade = isHov ? 1 : Math.max(0, Math.min(1, (FLASH_TTL - fl.t) / FADE_OUT));
        // Expanding intro ring (only during the first PING_DUR seconds).
        if (ping < 1 && !isHov) {
          ctx.beginPath();
          ctx.arc(fl.sx, fl.sy, 5 + ping * 30, 0, Math.PI * 2);
          ctx.lineWidth = 2.4;
          ctx.strokeStyle = `rgba(20,184,166,${Math.max(0, 0.9 * (1 - ping))})`;
          ctx.stroke();
        }
        // Steady marker ring - thin halo that persists, brighter when hovered.
        ctx.beginPath();
        ctx.arc(fl.sx, fl.sy, isHov ? 13 : 10, 0, Math.PI * 2);
        ctx.lineWidth = isHov ? 2.4 : 1.6;
        ctx.strokeStyle = isHov
          ? 'rgba(45,212,191,0.95)'
          : `rgba(45,212,191,${0.55 * lifeFade})`;
        ctx.stroke();
        const coreA = isHov ? 1 : lifeFade;
        ctx.beginPath();
        ctx.arc(fl.sx, fl.sy, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(45,212,191,${coreA})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(fl.sx, fl.sy, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${coreA})`;
        ctx.fill();
      }
      // 5. Cards: a compact pill for each live flash (held the whole minute,
      //    fading only at the very end), the expanded detail card for the
      //    hovered one (drawn last so it sits on top).
      for (const fl of flashes) {
        if (!fl.vis || fl === hovered) continue;
        const inA = Math.min(1, fl.t / 0.18);
        const outA = Math.max(0, Math.min(1, (FLASH_TTL - fl.t) / FADE_OUT));
        const a = inA * outA;
        if (a > 0.02) drawCard(fl, false, a);
      }
      if (hovered && hovered.vis) drawCard(hovered, true, 1);
    }

    let last = performance.now();
    let raf = 0;
    function loop(t: number) {
      const dt = (t - last) / 1000;
      last = t;
      // Auto-rotate continuously, except while a claim card is being hovered -
      // then the globe holds still so the card stays under the pointer.
      if (!hovered) lambda = (lambda + dt * 5) % 360;
      drawScene(dt);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    // Click-vs-drag: track the press origin + total travel. A release with
    // little travel is a "click" and opens the map at that spot (the globe is
    // a portal); anything beyond the threshold is a rotate gesture.
    let downAt: { x: number; y: number } | null = null;
    let travel = 0;
    const CLICK_SLOP = 6;

    const navigateToSpot = () => {
      // Prefer a hovered claim marker (exact hex); otherwise invert the pointer
      // position to a lon/lat on the sphere and snap to the res-12 cell there.
      if (hovered) {
        const h3 = latLngToCell(hovered.lat, hovered.lon, HEX_RES);
        router.push(`/map#${h3}`);
        return;
      }
      if (pointer) {
        const inv = projection.invert?.([pointer.x, pointer.y]);
        if (inv && Number.isFinite(inv[0]) && Number.isFinite(inv[1])) {
          const h3 = latLngToCell(inv[1], inv[0], HEX_RES);
          router.push(`/map#${h3}`);
          return;
        }
      }
      router.push('/map');
    };

    const onDown = (e: MouseEvent) => {
      dragging = true;
      dragLast = { x: e.clientX, y: e.clientY };
      downAt = { x: e.clientX, y: e.clientY };
      travel = 0;
    };
    const onUp = () => {
      dragging = false;
      if (downAt && travel <= CLICK_SLOP) navigateToSpot();
      downAt = null;
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging || !dragLast) return;
      // Horizontal drag spins longitude, vertical drag tilts latitude - so the
      // globe can be turned any direction (up/down/diagonal), not just sideways.
      const dx = e.clientX - dragLast.x;
      const dy = e.clientY - dragLast.y;
      travel += Math.abs(dx) + Math.abs(dy);
      lambda = (lambda + dx * 0.4) % 360;
      tilt = Math.max(-89, Math.min(89, tilt + dy * 0.4));
      dragLast = { x: e.clientX, y: e.clientY };
    };
    // Track the pointer in canvas-internal coords for flash hover-testing.
    const onPointer = (e: MouseEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      pointer = {
        x: (e.clientX - rect.left) * (W / rect.width),
        y: (e.clientY - rect.top) * (H / rect.height),
      };
    };
    const onLeave = () => { pointer = null; };

    wrap.addEventListener('mousedown', onDown);
    wrap.addEventListener('mousemove', onPointer);
    wrap.addEventListener('mouseleave', onLeave);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      unsubPings();
      wrap.removeEventListener('mousedown', onDown);
      wrap.removeEventListener('mousemove', onPointer);
      wrap.removeEventListener('mouseleave', onLeave);
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
