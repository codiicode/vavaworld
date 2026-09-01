import { ImageResponse } from 'next/og';
import { findUserByHandle } from '@/lib/mock-users';

export const runtime = 'edge';
export const alt = 'VAVAWORLD player profile';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Hex stops only - Satori's gradient parser rejects modern hsl() syntax.
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #ffffff, #2b9fd8)',
  'linear-gradient(135deg, #f4a026, #f0653b)',
  'linear-gradient(135deg, #a78bfa, #6366f1)',
  'linear-gradient(135deg, #34d399, #0ea5e9)',
  'linear-gradient(135deg, #fb7185, #c026d3)',
];
function avatarGradient(seed: string): string {
  const n = (seed.charCodeAt(0) + seed.charCodeAt(1) + seed.length) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[n];
}

/**
 * Auto-generated social share card for /u/[handle]. Next wires the og:image +
 * twitter:image tags automatically, so every shared profile link unfurls into
 * a branded stats card - the viral loop.
 */
export default async function Image({ params }: { params: { handle: string } }) {
  const decoded = decodeURIComponent(params.handle);
  const user = findUserByHandle(params.handle);
  const name = user?.username ? `@${user.username}` : decoded;
  const addr = user?.addr ?? decoded;
  const hexes = user?.hexes ?? 0;
  const countries = user?.countries ?? 0;
  const bonded = user?.bondedVava ?? 0;
  const presidentOf = user?.presidentOf ?? [];
  const initials = (user?.username ?? decoded).slice(0, 2).toUpperCase();

  const stat = (label: string, value: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 26, color: 'rgba(255,255,255,0.55)', letterSpacing: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: 58, fontWeight: 700, color: '#ffffff' }}>{value}</span>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          backgroundColor: '#060d1c',
          backgroundImage:
            'radial-gradient(120% 120% at 0% 0%, #1d5e95 0%, #0b1b34 55%, #060d1c 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top: wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: 6, color: '#ffffff' }}>
            VAVAWORLD
          </span>
          <span style={{ fontSize: 24, color: '#ffffff', letterSpacing: 2 }}>vavaworld.fun</span>
        </div>

        {/* Middle: identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 132,
              height: 132,
              borderRadius: 999,
              backgroundImage: avatarGradient(addr),
              color: '#fff',
              fontSize: 54,
              fontWeight: 700,
              border: '4px solid rgba(255,255,255,0.35)',
            }}
          >
            {initials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 72, fontWeight: 800, color: '#ffffff' }}>{name}</span>
            {presidentOf.length > 0 && (
              <span
                style={{
                  display: 'flex',
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#fbbf24',
                  letterSpacing: 1,
                }}
              >
                President of {presidentOf.map((c) => c.toUpperCase()).join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* Bottom: stats */}
        <div style={{ display: 'flex', gap: 96 }}>
          {stat('Hexes owned', hexes.toLocaleString('en-US'))}
          {stat('Countries', String(countries))}
          {stat(
            '$VAVA bonded',
            bonded >= 1_000_000 ? `${(bonded / 1_000_000).toFixed(1)}M` : bonded.toLocaleString('en-US'),
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
