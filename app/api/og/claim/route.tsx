import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/**
 * Dynamic share card for a single claim - unfurls when a /c?... reveal link is
 * posted to X/Discord/etc. Read straight off the query string so it stays a
 * pure function of the URL (no DB hit), mirroring the /c page's OG tags.
 *
 * Satori caveats: hex-stop gradients only (no hsl()), flags via flagcdn <img>.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const by = searchParams.get('by') || 'someone';
  const place = searchParams.get('place') || 'the map';
  const country = (searchParams.get('country') || '').toLowerCase();
  const n = Number(searchParams.get('n') || '1');
  const sol = searchParams.get('sol');
  const usdAmount = searchParams.get('usd') ?? sol;

  const headline = `${by.startsWith('@') || by.length > 24 ? by : '@' + by} claimed`;
  const hexLine = `${n.toLocaleString('en-US')} hex${n === 1 ? '' : 'es'}`;

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
            'radial-gradient(120% 120% at 100% 0%, #14b8a6 0%, #0b1b34 50%, #060d1c 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: 6, color: '#ffffff' }}>
            VAVAWORLD
          </span>
          <span style={{ fontSize: 24, color: '#ffffff', letterSpacing: 2 }}>vavaworld.fun</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 40, color: 'rgba(255,255,255,0.7)' }}>{headline}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {country && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://flagcdn.com/h80/${country}.png`}
                width={96}
                height={64}
                alt=""
                style={{ borderRadius: 8, border: '2px solid rgba(255,255,255,0.3)' }}
              />
            )}
            <span style={{ fontSize: 96, fontWeight: 800, color: '#ffffff' }}>{place}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 80, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.55)', letterSpacing: 1 }}>
              Claimed
            </span>
            <span style={{ fontSize: 56, fontWeight: 700, color: '#ffffff' }}>{hexLine}</span>
          </div>
          {sol && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.55)', letterSpacing: 1 }}>
                Paid
              </span>
              <span style={{ fontSize: 56, fontWeight: 700, color: '#ffffff' }}>${usdAmount}</span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 'auto' }}>
            <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.55)', letterSpacing: 1 }}>
              Hold your ground
            </span>
            <span style={{ fontSize: 34, fontWeight: 700, color: '#ffffff' }}>
              Claim yours →
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
