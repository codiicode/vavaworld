'use client';

import { useEffect, useRef, useState } from 'react';
import { Globe3D, type GlobePopup } from '@/components/ui/3d-globe';
import { CITIES } from './landing-cities';
import { subscribeClaimPings, type ClaimPing } from '@/lib/claim-pings';

type Buy = ClaimPing & { id: string };

// How long a buy card lingers on the globe before it fades out.
const BUY_TTL = 60_000;
const MAX_BUYS = 12;

function CityLabel({ name }: { name: string }) {
  return (
    <div
      style={{
        transform: 'translateY(-13px)',
        whiteSpace: 'nowrap',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.01em',
        color: 'rgba(255,255,255,0.9)',
        textShadow: '0 1px 5px rgba(0,0,0,0.75)',
      }}
    >
      {name}
    </div>
  );
}

function BuyCard({ buy }: { buy: Buy }) {
  const handle = buy.handle ? `@${buy.handle}` : 'someone';
  return (
    <div
      style={{
        transform: 'translate(14px, -50%)',
        whiteSpace: 'nowrap',
        background: 'rgba(13,52,86,0.94)',
        border: '1px solid rgba(94,234,212,0.55)',
        borderRadius: 12,
        padding: '7px 11px',
        boxShadow: '0 8px 26px rgba(0,0,0,0.4)',
        color: '#fff',
        fontSize: 12,
        lineHeight: 1.25,
      }}
    >
      <div style={{ fontWeight: 700, color: '#5eead4' }}>{handle}</div>
      <div style={{ color: 'rgba(255,255,255,0.82)' }}>
        {buy.hexes ? `${buy.hexes} hex${buy.hexes === 1 ? '' : 'es'}` : 'claimed'}
        {buy.city ? ` · ${buy.city}` : ''}
        {buy.priceSol != null ? `  ◎ ${buy.priceSol} SOL` : ''}
      </div>
    </div>
  );
}

/**
 * The landing globe (Aceternity Globe3D) with our features layered on: every
 * city is marked, and a live claim drops a buy card at its exact lat/lng for a
 * minute. Buys come from the shared claim-ping stream (Realtime + local + mock).
 */
export function Globe3DLanding() {
  const [buys, setBuys] = useState<Buy[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const unsub = subscribeClaimPings((p) => {
      const id = `buy-${idRef.current++}`;
      setBuys((prev) => [...prev, { ...p, id }].slice(-MAX_BUYS));
      window.setTimeout(() => {
        setBuys((prev) => prev.filter((b) => b.id !== id));
      }, BUY_TTL);
    });
    return unsub;
  }, []);

  const cityPopups: GlobePopup[] = CITIES.map((c, i) => ({
    id: `city-${i}`,
    lat: c.lat,
    lng: c.lon,
    dotColor: c.major ? '#5eead4' : 'rgba(94,234,212,0.5)',
    dotSize: c.major ? 0.02 : 0.012,
    node: c.major ? <CityLabel name={c.name} /> : null,
  }));

  const buyPopups: GlobePopup[] = buys.map((b) => ({
    id: b.id,
    lat: b.lat,
    lng: b.lon,
    dotColor: '#ffffff',
    dotSize: 0.026,
    node: <BuyCard buy={b} />,
  }));

  return (
    <Globe3D
      className="mx-auto h-[min(125vmin,1180px)] w-full max-w-[1180px]"
      popups={[...cityPopups, ...buyPopups]}
      config={{
        radius: 2,
        cameraDistanceFactor: 2.7,
        autoRotateSpeed: 0.45,
        showAtmosphere: false,
        enableZoom: false,
        enablePan: false,
        backgroundColor: null,
      }}
    />
  );
}
