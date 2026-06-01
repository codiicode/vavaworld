'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import * as d3 from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection } from 'geojson';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { Flag } from '@/components/flag';

type WorldTopo = Topology<{ land: GeometryCollection }>;

export type ClaimShare = {
  by: string;
  place: string;
  country: string;
  lat: number;
  lon: number;
  n: number;
  sol: string | null;
};

/**
 * The shareable "land grab" reveal: an orthographic globe spins from a random
 * start to the claimed coordinate, zooms in, and lights the spot up - then the
 * caption + CTA fade in. This is what a /c reveal link shows when opened.
 */
export function ClaimReveal({ claim }: { claim: ClaimShare }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const baseScale = Math.min(W, H) / 2 - 40;

    let land: Feature | FeatureCollection | null = null;
    let cancelled = false;
    fetch('/countries-110m.json')
      .then((r) => r.json() as Promise<WorldTopo>)
      .then((world) => {
        if (!cancelled) land = feature(world, world.objects.land) as Feature | FeatureCollection;
      })
      .catch(() => {});

    const projection = d3.geoOrthographic().scale(baseScale).translate([cx, cy]).clipAngle(90);
    const path = d3.geoPath(projection, ctx);

    // Animate rotation [lambda, phi] from a start offset to centre on the spot,
    // and scale from 1x to ~2.4x (a "zoom into the planet" feel).
    const targetRot: [number, number] = [-claim.lon, -claim.lat];
    const startRot: [number, number] = [targetRot[0] + 150, targetRot[1] - 35];
    const FLY = 2600; // ms
    let t0 = 0;
    const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

    let raf = 0;
    function frame(now: number) {
      if (!t0) t0 = now;
      const p = Math.min(1, (now - t0) / FLY);
      const e = easeInOut(p);
      const lam = startRot[0] + (targetRot[0] - startRot[0]) * e;
      const phi = startRot[1] + (targetRot[1] - startRot[1]) * e;
      const scale = baseScale * (1 + e * 1.4);
      projection.rotate([lam, phi, 0]).scale(scale);

      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      // Sphere
      ctx.beginPath();
      path({ type: 'Sphere' });
      const g = ctx.createRadialGradient(cx - scale * 0.3, cy - scale * 0.3, scale * 0.2, cx, cy, scale * 1.1);
      g.addColorStop(0, '#15406b');
      g.addColorStop(0.6, '#0e2c4d');
      g.addColorStop(1, '#08203a');
      ctx.fillStyle = g;
      ctx.fill();

      // Graticule
      ctx.beginPath();
      path(d3.geoGraticule10());
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = 'rgba(94,234,212,0.12)';
      ctx.stroke();

      if (land) {
        ctx.beginPath();
        path(land);
        ctx.fillStyle = 'rgba(120,190,230,0.55)';
        ctx.fill();
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = 'rgba(94,234,212,0.25)';
        ctx.stroke();
      }

      // The claimed spot - ring + glowing core, intensity ramps in at the end.
      const spot = projection([claim.lon, claim.lat]);
      if (spot && p > 0.45) {
        const reveal = Math.min(1, (p - 0.45) / 0.55);
        const [sx, sy] = spot;
        // Expanding pulse
        const pulse = (p % 0.5) / 0.5;
        ctx.beginPath();
        ctx.arc(sx, sy, 6 + pulse * 26 * reveal, 0, Math.PI * 2);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = `rgba(45,212,191,${0.8 * (1 - pulse) * reveal})`;
        ctx.stroke();
        // Core
        ctx.beginPath();
        ctx.arc(sx, sy, 9 * reveal, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(45,212,191,${reveal})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx, sy, 4 * reveal, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${reveal})`;
        ctx.fill();
      }

      if (p < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        // Keep a gentle pulse going after arrival.
        raf = requestAnimationFrame(frame);
        if (!cancelled) setDone(true);
      }
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [claim.lon, claim.lat]);

  const name = claim.by.startsWith('@') || claim.by.length > 24 ? claim.by : `@${claim.by}`;

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center gap-7 overflow-hidden px-5 py-10 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 0%, #11365c 0%, #0a1f38 45%, #060d1c 100%)',
        }}
      />

      <canvas
        ref={canvasRef}
        width={760}
        height={760}
        className="h-[min(72vmin,520px)] w-[min(72vmin,520px)] max-w-full"
      />

      <div
        className={`flex flex-col items-center gap-3 transition-all duration-700 ${
          done ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        <div className="flex items-center gap-3">
          {claim.country && <Flag code={claim.country} size={28} className="rounded shadow" />}
          <span className="text-3xl font-bold text-white md:text-4xl">{claim.place}</span>
        </div>
        <p className="text-base text-white/70 md:text-lg">
          <span className="font-semibold text-[#5eead4]">{name}</span> claimed{' '}
          <span className="font-semibold text-white">
            {claim.n.toLocaleString('en-US')} hex{claim.n === 1 ? '' : 'es'}
          </span>
          {claim.sol ? (
            <>
              {' '}
              for <span className="font-semibold text-white">◎ {claim.sol} SOL</span>
            </>
          ) : null}
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/map"
            className="rounded-full bg-[#14b8a6] px-6 py-3 text-sm font-semibold text-[#042f2e] shadow-lg transition-transform hover:scale-[1.03]"
          >
            Claim your ground →
          </Link>
          <Link
            href="/"
            className="rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
          >
            What is vavaworld?
          </Link>
        </div>
      </div>
    </div>
  );
}
